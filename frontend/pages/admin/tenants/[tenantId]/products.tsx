import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface Tier { minQty: number; unitPriceCents: number }
interface CustomField { key: string; label: string; type: 'text' | 'textarea'; required?: boolean; placeholder?: string }

interface Product {
  id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  quantity_tiers: Tier[] | null
  custom_fields: CustomField[] | null
  policy_text: string | null
  image_urls: string[]
  active: boolean
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 24 }
const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500 }
const label: React.CSSProperties = { display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13, color: '#334155' }

const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`

const TenantProductsPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query

  const [products, setProducts] = useState<Product[]>([])
  const [config, setConfig] = useState<any>(null)
  const [editing, setEditing] = useState<Partial<Product> | null>(null)
  const [saving, setSaving] = useState(false)
  const [stripeSecret, setStripeSecret] = useState('')
  const [stripeWebhook, setStripeWebhook] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    const [p, c] = await Promise.all([
      api.getProducts(tenantId as string).catch(() => []),
      api.getCommerceConfig(tenantId as string).catch(() => null),
    ])
    setProducts(Array.isArray(p) ? p : [])
    setConfig(c)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const saveStripe = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const updated = await api.updateCommerceConfig(tenantId as string, {
        ...(stripeSecret ? { stripe_secret_key: stripeSecret } : {}),
        ...(stripeWebhook ? { stripe_webhook_secret: stripeWebhook } : {}),
      })
      setConfig(updated)
      setStripeSecret('')
      setStripeWebhook('')
      alert('Stripe settings saved')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSaveProduct = async () => {
    if (!editing?.name) return
    setSaving(true)
    try {
      const payload = {
        name: editing.name,
        description: editing.description || null,
        price_cents: editing.price_cents || 0,
        quantity_tiers: editing.quantity_tiers || [],
        custom_fields: editing.custom_fields || [],
        policy_text: editing.policy_text || null,
        image_urls: editing.image_urls || [],
        active: editing.active !== false,
      }
      if (editing.id) await api.updateProduct(editing.id, payload)
      else await api.createProduct(tenantId as string, payload)
      setEditing(null)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return
    await api.deleteProduct(p.id)
    await load()
  }

  if (!user) return <AdminLayout title="Store"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Store"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Store">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}/site`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Website
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>🛒 Store</h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href={`/admin/tenants/${tenantId}/orders`} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                📦 Orders
              </Link>
              <button style={btn} onClick={() => setEditing({ name: '', price_cents: 0, quantity_tiers: [], custom_fields: [], image_urls: [], active: true })}>
                + New Product
              </button>
            </div>
          </div>
        </div>

        {/* Stripe config */}
        <div style={card}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 19 }}>Stripe Connection</h2>
          <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 13 }}>
            Secret key {config?.has_secret_key ? '✅ configured' : '⚠️ not set'} · Webhook secret {config?.has_webhook_secret ? '✅ configured' : '⚠️ not set'}.
            Webhook endpoint for this site: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>/api/webhooks/stripe/{tenantId}</code>
            {' '}(subscribe to <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>checkout.session.completed</code>).
          </p>
          <form onSubmit={saveStripe} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={label}>Secret key (sk_...)</label>
              <input type="password" value={stripeSecret} onChange={e => setStripeSecret(e.target.value)} placeholder={config?.has_secret_key ? '•••••• (leave blank to keep)' : 'sk_test_...'} style={input} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={label}>Webhook signing secret (whsec_...)</label>
              <input type="password" value={stripeWebhook} onChange={e => setStripeWebhook(e.target.value)} placeholder={config?.has_webhook_secret ? '•••••• (leave blank to keep)' : 'whsec_...'} style={input} />
            </div>
            <button type="submit" disabled={savingConfig || (!stripeSecret && !stripeWebhook)} style={btn}>
              {savingConfig ? 'Saving…' : 'Save Stripe Settings'}
            </button>
          </form>
        </div>

        {/* Products */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 19 }}>Products</h2>
          {products.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>No products yet. Create one and add it to a page with the Product block.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Price</th>
                  <th style={{ padding: 8 }}>Tiers</th>
                  <th style={{ padding: 8 }}>Active</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>{money(p.price_cents, p.currency)}</td>
                    <td style={{ padding: 8, color: '#64748b', fontSize: 13 }}>
                      {(p.quantity_tiers || []).map(t => `${t.minQty}+ @ ${money(t.unitPriceCents, p.currency)}`).join(', ') || '—'}
                    </td>
                    <td style={{ padding: 8 }}>{p.active ? '✅' : '—'}</td>
                    <td style={{ padding: 8, display: 'flex', gap: 10 }}>
                      <button onClick={() => setEditing({ ...p })} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', padding: 0, fontSize: 14 }}>Edit</button>
                      <button onClick={() => handleDelete(p)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: 14 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Product editor modal */}
        {editing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>{editing.id ? 'Edit Product' : 'New Product'}</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={label}>Name *</label>
                  <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} />
                </div>
                <div>
                  <label style={label}>Base price (USD)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={((editing.price_cents || 0) / 100).toString()}
                    onChange={e => setEditing({ ...editing, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    style={input}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Description</label>
                <textarea rows={3} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} style={input} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Image URL(s), one per line</label>
                <textarea
                  rows={2}
                  value={(editing.image_urls || []).join('\n')}
                  onChange={e => setEditing({ ...editing, image_urls: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  style={input}
                />
              </div>

              <label style={label}>Volume pricing tiers</label>
              {(editing.quantity_tiers || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>From qty</span>
                  <input type="number" min={1} value={t.minQty} style={{ ...input, width: 90 }}
                    onChange={e => setEditing({ ...editing, quantity_tiers: (editing.quantity_tiers || []).map((x, j) => j === i ? { ...x, minQty: Number(e.target.value) || 1 } : x) })} />
                  <span style={{ fontSize: 13 }}>price each (USD)</span>
                  <input type="number" step="0.01" min={0} value={(t.unitPriceCents / 100).toString()} style={{ ...input, width: 110 }}
                    onChange={e => setEditing({ ...editing, quantity_tiers: (editing.quantity_tiers || []).map((x, j) => j === i ? { ...x, unitPriceCents: Math.round(parseFloat(e.target.value || '0') * 100) } : x) })} />
                  <button type="button" onClick={() => setEditing({ ...editing, quantity_tiers: (editing.quantity_tiers || []).filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setEditing({ ...editing, quantity_tiers: [...(editing.quantity_tiers || []), { minQty: 2, unitPriceCents: editing.price_cents || 0 }] })}
                style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                + Add tier
              </button>

              <label style={label}>Custom checkout fields (e.g. personalization request)</label>
              {(editing.custom_fields || []).map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px auto auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <input value={f.label} placeholder="Label" style={input}
                    onChange={e => setEditing({ ...editing, custom_fields: (editing.custom_fields || []).map((x, j) => j === i ? { ...x, label: e.target.value, key: x.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') } : x) })} />
                  <input value={f.placeholder || ''} placeholder="Placeholder" style={input}
                    onChange={e => setEditing({ ...editing, custom_fields: (editing.custom_fields || []).map((x, j) => j === i ? { ...x, placeholder: e.target.value } : x) })} />
                  <select value={f.type} style={input}
                    onChange={e => setEditing({ ...editing, custom_fields: (editing.custom_fields || []).map((x, j) => j === i ? { ...x, type: e.target.value as any } : x) })}>
                    <option value="text">text</option>
                    <option value="textarea">textarea</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <input type="checkbox" checked={!!f.required}
                      onChange={e => setEditing({ ...editing, custom_fields: (editing.custom_fields || []).map((x, j) => j === i ? { ...x, required: e.target.checked } : x) })} />
                    req
                  </label>
                  <button type="button" onClick={() => setEditing({ ...editing, custom_fields: (editing.custom_fields || []).filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setEditing({ ...editing, custom_fields: [...(editing.custom_fields || []), { key: '', label: '', type: 'text' }] })}
                style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                + Add field
              </button>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Policy text (shown at checkout, e.g. refund policy)</label>
                <textarea rows={2} value={editing.policy_text || ''} onChange={e => setEditing({ ...editing, policy_text: e.target.value })} style={input}
                  placeholder="Payment processed securely at time of order. Full refund available until shipment." />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 20 }}>
                <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                Active (available for purchase)
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(null)} style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>Cancel</button>
                <button onClick={handleSaveProduct} disabled={saving || !editing.name} style={{ ...btn, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save Product'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default TenantProductsPage
