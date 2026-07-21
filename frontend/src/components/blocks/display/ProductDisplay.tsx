import React, { useEffect, useState } from 'react'
import { BlockNode, parseConfig } from '../types'

export interface ProductBlockConfig {
  productId?: string
  buttonLabel?: string
}

export const DEFAULT_PRODUCT_CONFIG: ProductBlockConfig = { productId: '', buttonLabel: 'Pre-Order Now' }

interface CustomField {
  key: string
  label: string
  type: 'text' | 'textarea'
  required?: boolean
  placeholder?: string
}

interface PublicProduct {
  id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  quantity_tiers: { minQty: number; unitPriceCents: number }[] | null
  custom_fields: CustomField[] | null
  policy_text: string | null
  image_urls: string[]
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

const unitPrice = (p: PublicProduct, qty: number) => {
  let price = p.price_cents
  for (const t of [...(p.quantity_tiers || [])].sort((a, b) => a.minQty - b.minQty)) {
    if (qty >= t.minQty) price = t.unitPriceCents
  }
  return price
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
  fontSize: 15, boxSizing: 'border-box', fontFamily: 'inherit', background: 'white', color: '#1e293b',
}

// Buy box for a product: image, tiered pricing, quantity, custom fields
// (e.g. personalization), email, and Stripe hosted checkout.
const ProductDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_PRODUCT_CONFIG)
  const [product, setProduct] = useState<PublicProduct | null>(null)
  const [loadError, setLoadError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [email, setEmail] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!config.productId) return
    let cancelled = false
    fetch(`/api/public/products/${config.productId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Product not found'))))
      .then(p => { if (!cancelled) setProduct(p) })
      .catch(e => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [config.productId])

  if (!config.productId) {
    return (
      <div style={{ padding: 24, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', textAlign: 'center', fontSize: 14 }}>
        Product block — choose a product in the settings panel
      </div>
    )
  }
  if (loadError) return <div style={{ padding: 16, color: '#991b1b', fontSize: 14 }}>Product unavailable.</div>
  if (!product) return <div style={{ padding: 16, color: '#94a3b8', fontSize: 14 }}>Loading…</div>

  const unit = unitPrice(product, quantity)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity, email, customData: custom }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Checkout failed')
      window.location.href = payload.url
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed')
      setState('error')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {product.image_urls.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_urls[0]} alt={product.name} style={{ flex: '1 1 260px', maxWidth: 380, width: '100%', borderRadius: 10 }} />
      )}
      <form onSubmit={handleCheckout} style={{ flex: '1 1 320px', minWidth: 280 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 26 }}>{product.name}</h2>
        {product.description && <p style={{ margin: '0 0 16px 0', opacity: 0.8, lineHeight: 1.6 }}>{product.description}</p>}

        <p style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>
          {money(unit, product.currency)}
          <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6 }}> each</span>
        </p>
        {(product.quantity_tiers || []).length > 0 && (
          <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 16px 0' }}>
            Volume pricing: {(product.quantity_tiers || []).map(t => `${t.minQty}+ at ${money(t.unitPriceCents, product.currency)}`).join(' · ')}
          </p>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 14 }}>Quantity</label>
          <input
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            style={{ ...inputStyle, width: 110 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 14 }}>Email *</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" />
        </div>

        {(product.custom_fields || []).map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 14 }}>
              {f.label}{f.required && ' *'}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                required={f.required}
                placeholder={f.placeholder}
                value={custom[f.key] || ''}
                onChange={e => setCustom(c => ({ ...c, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            ) : (
              <input
                type="text"
                required={f.required}
                placeholder={f.placeholder}
                value={custom[f.key] || ''}
                onChange={e => setCustom(c => ({ ...c, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            )}
          </div>
        ))}

        <p style={{ fontSize: 16, fontWeight: 600, margin: '8px 0 16px 0' }}>
          Total: {money(unit * quantity, product.currency)}
        </p>

        {errorMsg && <p style={{ color: '#dc2626', fontSize: 14 }}>{errorMsg}</p>}

        <button
          type="submit"
          disabled={state === 'submitting'}
          style={{
            background: 'var(--color-primary, #0ea5a4)', color: 'white', border: 'none', borderRadius: 6,
            padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%',
            opacity: state === 'submitting' ? 0.7 : 1,
          }}
        >
          {state === 'submitting' ? 'Redirecting to secure checkout…' : config.buttonLabel || 'Buy Now'}
        </button>

        {product.policy_text && (
          <p style={{ fontSize: 13, opacity: 0.65, marginTop: 12, lineHeight: 1.5 }}>{product.policy_text}</p>
        )}
        <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>Payment processed securely by Stripe.</p>
      </form>
    </div>
  )
}

export default ProductDisplay
