import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface Order {
  id: string
  email: string
  quantity: number
  amount_cents: number
  currency: string
  status: string
  custom_data: Record<string, any> | null
  created_at: string
  product: { name: string }
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: '#92400e', bg: '#fef3c7' },
  paid: { color: '#166534', bg: '#dcfce7' },
  shipped: { color: '#1e40af', bg: '#dbeafe' },
  refunded: { color: '#991b1b', bg: '#fee2e2' },
  cancelled: { color: '#475569', bg: '#f1f5f9' },
}

const TenantOrdersPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query

  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const data = await api.getOrders(tenantId as string)
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const setStatus = async (order: Order, status: string) => {
    if (status === 'refunded' && !confirm('Record this order as refunded? (Execute the actual refund in the Stripe dashboard.)')) return
    await api.updateOrderStatus(tenantId as string, order.id, status)
    await load()
  }

  if (!user) return <AdminLayout title="Orders"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Orders"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Orders">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}/products`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Store
          </Link>
          <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>📦 Orders</h1>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 4 }}>{error}</div>}

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
          {orders.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>No orders yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8 }}>Product</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Total</th>
                  <th style={{ padding: 8 }}>Details</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                      <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{o.product?.name}</td>
                      <td style={{ padding: 8 }}>{o.email || '—'}</td>
                      <td style={{ padding: 8 }}>{o.quantity}</td>
                      <td style={{ padding: 8 }}>{(o.amount_cents / 100).toFixed(2)} {o.currency.toUpperCase()}</td>
                      <td style={{ padding: 8, fontSize: 12, color: '#64748b', maxWidth: 220 }}>
                        {o.custom_data && Object.entries(o.custom_data).map(([k, v]) => (
                          <div key={k}><b>{k}</b>: {String(v)}</div>
                        ))}
                      </td>
                      <td style={{ padding: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px', color: sc.color, background: sc.bg, marginRight: 8 }}>
                          {o.status.toUpperCase()}
                        </span>
                        <select value={o.status} onChange={e => setStatus(o, e.target.value)} style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12 }}>
                          {['pending', 'paid', 'shipped', 'refunded', 'cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default TenantOrdersPage
