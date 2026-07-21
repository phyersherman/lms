import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../src/components/AdminLayout'
import { useAuth } from '../../../src/auth/AuthProvider'
import api from '../../../src/lib/api'

const NewTenant: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return <AdminLayout title="Create Tenant"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Create Tenant"><div>Unauthorized</div></AdminLayout>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const host = domain.trim().toLowerCase()
      const newTenant = await api.createTenant({
        name,
        domains: host ? [{ host, isPrimary: true }] : undefined,
      })
      router.push(`/admin/tenants/${newTenant.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Create Tenant">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/admin/tenants" style={{ color: '#667eea', textDecoration: 'none', fontSize: 14, marginBottom: '16px', display: 'inline-block' }}>
            ← Back to Tenants
          </Link>
        </div>

        {/* Create Tenant Card */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, maxWidth: '600px' }}>
          <h1 style={{ margin: '0 0 24px 0', fontSize: 28, color: '#333' }}>Create New Tenant</h1>

          {error && (
            <div style={{ color: '#dc2626', marginBottom: '16px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#333' }}>Tenant Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g., Acme Corp, Test Company"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#666' }}>The display name for this tenant/portal</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#333' }}>Primary Domain (optional)</label>
              <input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g., www.example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#666' }}>The domain this site will be served on. You can add more domains later.</p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                style={{
                  padding: '10px 20px',
                  background: !name.trim() ? '#d1d5db' : '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !name.trim() || loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                {loading ? 'Creating...' : 'Create Tenant'}
              </button>
              <Link href="/admin/tenants" style={{ display: 'inline-block' }}>
                <button
                  type="button"
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#333',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default NewTenant
