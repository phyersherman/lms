import Stripe from 'stripe'
import prisma from '../db/client'
import { encrypt, decrypt } from '../utils/crypto'
import emailService from './emailService'

export interface QuantityTier {
  minQty: number
  unitPriceCents: number
}

// ---- Config ----

const getConfig = async (tenantId: string) => {
  return prisma.commerceConfig.findUnique({ where: { tenant_id: tenantId } })
}

const getConfigSafe = async (tenantId: string) => {
  const config = await getConfig(tenantId)
  if (!config) return null
  return {
    id: config.id,
    tenant_id: config.tenant_id,
    currency: config.currency,
    stripe_publishable_key: config.stripe_publishable_key,
    has_secret_key: !!config.stripe_secret_key,
    has_webhook_secret: !!config.stripe_webhook_secret,
  }
}

const upsertConfig = async (
  tenantId: string,
  data: { stripe_secret_key?: string; stripe_publishable_key?: string; stripe_webhook_secret?: string; currency?: string }
) => {
  const clean: any = {}
  if (data.stripe_secret_key) clean.stripe_secret_key = encrypt(data.stripe_secret_key)
  if (data.stripe_publishable_key !== undefined) clean.stripe_publishable_key = data.stripe_publishable_key
  if (data.stripe_webhook_secret) clean.stripe_webhook_secret = encrypt(data.stripe_webhook_secret)
  if (data.currency) clean.currency = data.currency.toLowerCase()
  await prisma.commerceConfig.upsert({
    where: { tenant_id: tenantId },
    update: clean,
    create: { tenant_id: tenantId, ...clean },
  })
  return getConfigSafe(tenantId)
}

const getStripeClient = async (tenantId: string): Promise<Stripe> => {
  const config = await getConfig(tenantId)
  if (!config?.stripe_secret_key) {
    throw Object.assign(new Error('Stripe is not configured for this site'), { statusCode: 400 })
  }
  return new Stripe(decrypt(config.stripe_secret_key))
}

// ---- Products ----

const listProducts = async (tenantId: string, activeOnly = false) => {
  return prisma.product.findMany({
    where: { tenant_id: tenantId, ...(activeOnly ? { active: true } : {}) },
    orderBy: { created_at: 'desc' },
  })
}

const getProduct = async (id: string) => prisma.product.findUnique({ where: { id } })

const createProduct = async (tenantId: string, data: any) => {
  return prisma.product.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      description: data.description || null,
      price_cents: Number(data.price_cents) || 0,
      currency: (data.currency || 'usd').toLowerCase(),
      quantity_tiers: data.quantity_tiers ?? undefined,
      custom_fields: data.custom_fields ?? undefined,
      policy_text: data.policy_text || null,
      image_urls: data.image_urls || [],
      active: data.active !== false,
    },
  })
}

const updateProduct = async (id: string, data: any) => {
  const clean: any = {}
  for (const key of ['name', 'description', 'policy_text'] as const) {
    if (data[key] !== undefined) clean[key] = data[key]
  }
  if (data.price_cents !== undefined) clean.price_cents = Number(data.price_cents) || 0
  if (data.currency !== undefined) clean.currency = String(data.currency).toLowerCase()
  if (data.quantity_tiers !== undefined) clean.quantity_tiers = data.quantity_tiers
  if (data.custom_fields !== undefined) clean.custom_fields = data.custom_fields
  if (data.image_urls !== undefined) clean.image_urls = data.image_urls
  if (data.active !== undefined) clean.active = !!data.active
  return prisma.product.update({ where: { id }, data: clean })
}

const deleteProduct = async (id: string) => {
  await prisma.product.delete({ where: { id } })
  return true
}

// Volume pricing: pick the highest tier whose minQty <= quantity.
export const unitPriceForQuantity = (product: { price_cents: number; quantity_tiers: any }, quantity: number): number => {
  const tiers = (product.quantity_tiers as QuantityTier[] | null) || []
  let price = product.price_cents
  for (const tier of [...tiers].sort((a, b) => a.minQty - b.minQty)) {
    if (quantity >= tier.minQty && typeof tier.unitPriceCents === 'number') price = tier.unitPriceCents
  }
  return price
}

// ---- Checkout ----

const createCheckout = async (
  productId: string,
  input: { quantity: number; email?: string; customData?: Record<string, any>; origin: string }
) => {
  const product = await getProduct(productId)
  if (!product || !product.active) throw Object.assign(new Error('product not available'), { statusCode: 404 })

  const quantity = Math.max(1, Math.min(Math.floor(input.quantity) || 1, 500))
  const unit = unitPriceForQuantity(product, quantity)
  const amount = unit * quantity

  // Validate Stripe config before creating the order row
  const stripe = await getStripeClient(product.tenant_id)

  const order = await prisma.order.create({
    data: {
      tenant_id: product.tenant_id,
      product_id: product.id,
      email: input.email || '',
      quantity,
      custom_data: input.customData ?? undefined,
      amount_cents: amount,
      currency: product.currency,
      status: 'pending',
    },
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: input.email || undefined,
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: product.image_urls.slice(0, 4).filter(u => u.startsWith('http')),
          },
          unit_amount: unit,
        },
        quantity,
      },
    ],
    metadata: { orderId: order.id, tenantId: product.tenant_id },
    success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/checkout/cancelled`,
    ...(product.policy_text
      ? { custom_text: { submit: { message: product.policy_text.slice(0, 1200) } } }
      : {}),
  })

  await prisma.order.update({ where: { id: order.id }, data: { stripe_session_id: session.id } })
  return { url: session.url, orderId: order.id }
}

// ---- Webhook ----

const handleWebhook = async (tenantId: string, rawBody: Buffer, signature: string) => {
  const config = await getConfig(tenantId)
  if (!config?.stripe_webhook_secret) {
    throw Object.assign(new Error('webhook not configured'), { statusCode: 400 })
  }
  const stripe = await getStripeClient(tenantId)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, decrypt(config.stripe_webhook_secret))
  } catch {
    throw Object.assign(new Error('invalid signature'), { statusCode: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId
    if (orderId) {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          email: session.customer_details?.email || session.customer_email || undefined,
          amount_cents: session.amount_total ?? undefined,
        },
        include: { product: true },
      })
      void sendOrderConfirmation(order).catch(err =>
        console.error('[commerce] confirmation email failed:', err?.message || err)
      )
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.metadata?.orderId) {
      await prisma.order.updateMany({
        where: { id: session.metadata.orderId, status: 'pending' },
        data: { status: 'cancelled' },
      })
    }
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    // Refunds executed in the Stripe dashboard are reflected here when possible
    if (charge.payment_intent && typeof charge.payment_intent === 'string') {
      // best effort: match via session lookup is not stored; admins can also set status manually
    }
  }

  return { received: true }
}

const sendOrderConfirmation = async (order: { id: string; tenant_id: string; email: string; quantity: number; amount_cents: number; currency: string; product: { name: string } }) => {
  if (!order.email) return
  await emailService.sendEmail({
    to: order.email,
    subject: `Order confirmed — ${order.product.name}`,
    templateName: 'order-confirmation',
    variables: {
      productName: order.product.name,
      quantity: String(order.quantity),
      amount: `${(order.amount_cents / 100).toFixed(2)} ${order.currency.toUpperCase()}`,
      orderId: order.id,
    },
    tenantId: order.tenant_id,
  })
}

// ---- Orders (admin) ----

const listOrders = async (tenantId: string) => {
  return prisma.order.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: { product: { select: { name: true } } },
  })
}

const updateOrderStatus = async (tenantId: string, orderId: string, status: string) => {
  if (!['pending', 'paid', 'shipped', 'refunded', 'cancelled'].includes(status)) {
    throw Object.assign(new Error('invalid status'), { statusCode: 400 })
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.tenant_id !== tenantId) return null
  return prisma.order.update({ where: { id: orderId }, data: { status } })
}

export default {
  getConfigSafe,
  upsertConfig,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createCheckout,
  handleWebhook,
  listOrders,
  updateOrderStatus,
}
