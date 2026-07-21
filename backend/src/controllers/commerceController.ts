import { Request, Response } from 'express'
import commerceService from '../services/commerceService'
import siteSettingsService from '../services/siteSettingsService'
import tenantService from '../services/tenantService'

// ---- Admin ----

const getConfig = async (req: Request, res: Response) => {
  res.json(await commerceService.getConfigSafe(req.params.tenantId as string))
}

const updateConfig = async (req: Request, res: Response) => {
  const { stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, currency } = req.body
  try {
    res.json(await commerceService.upsertConfig(req.params.tenantId as string, { stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, currency }))
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

const listProducts = async (req: Request, res: Response) => {
  res.json(await commerceService.listProducts(req.params.tenantId as string))
}

const createProduct = async (req: Request, res: Response) => {
  if (!req.body.name) return res.status(400).json({ error: 'name required' })
  try {
    res.status(201).json(await commerceService.createProduct(req.params.tenantId as string, req.body))
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

const updateProduct = async (req: Request, res: Response) => {
  try {
    res.json(await commerceService.updateProduct(req.params.productId as string, req.body))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' })
    res.status(400).json({ error: err.message })
  }
}

const deleteProduct = async (req: Request, res: Response) => {
  try {
    await commerceService.deleteProduct(req.params.productId as string)
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

const listOrders = async (req: Request, res: Response) => {
  res.json(await commerceService.listOrders(req.params.tenantId as string))
}

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await commerceService.updateOrderStatus(req.params.tenantId as string, req.params.orderId as string, req.body.status)
    if (!order) return res.status(404).json({ error: 'not found' })
    res.json(order)
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message })
  }
}

// ---- Public ----

const commerceEnabled = async (tenantId: string) => {
  const features = await siteSettingsService.getFeatures(tenantId)
  return features.commerce
}

const getPublicProduct = async (req: Request, res: Response) => {
  const product = await commerceService.getProduct(req.params.productId as string)
  if (!product || !product.active) return res.status(404).json({ error: 'not found' })
  if (!(await commerceEnabled(product.tenant_id))) return res.status(404).json({ error: 'not found' })
  res.json({
    id: product.id,
    name: product.name,
    description: product.description,
    price_cents: product.price_cents,
    currency: product.currency,
    quantity_tiers: product.quantity_tiers,
    custom_fields: product.custom_fields,
    policy_text: product.policy_text,
    image_urls: product.image_urls,
  })
}

const checkout = async (req: Request, res: Response) => {
  const { productId, quantity, email, customData } = req.body
  if (!productId) return res.status(400).json({ error: 'productId required' })
  try {
    const product = await commerceService.getProduct(productId)
    if (!product || !(await commerceEnabled(product.tenant_id))) return res.status(404).json({ error: 'not found' })
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https'
    const origin = req.headers.host ? `${proto}://${req.headers.host}` : ''
    const result = await commerceService.createCheckout(productId, { quantity, email, customData, origin })
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'checkout failed' })
  }
}

// Raw-body Stripe webhook (mounted before express.json in index.ts)
const webhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string
  if (!signature) return res.status(400).json({ error: 'missing signature' })
  try {
    const result = await commerceService.handleWebhook(req.params.tenantId as string, req.body as Buffer, signature)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}

export default {
  getConfig,
  updateConfig,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  updateOrderStatus,
  getPublicProduct,
  checkout,
  webhook,
}
