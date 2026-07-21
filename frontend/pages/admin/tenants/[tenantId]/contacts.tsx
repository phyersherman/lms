import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface Contact {
  id: string
  email: string
  name: string | null
  tags: string[]
  source_page_slug: string | null
  created_at: string
}

const TenantContactsPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query

  const [contacts, setContacts] = useState<Contact[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const data = await api.getContacts(tenantId as string)
      setContacts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const allTags = useMemo(() => Array.from(new Set(contacts.flatMap(c => c.tags))).sort(), [contacts])
  const filtered = tagFilter ? contacts.filter(c => c.tags.includes(tagFilter)) : contacts

  const exportCsv = () => {
    const header = 'email,name,tags,source_page,created_at'
    const lines = filtered.map(c =>
      [c.email, c.name || '', c.tags.join(';'), c.source_page_slug || '', c.created_at]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts${tagFilter ? `-${tagFilter}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Remove ${contact.email} from the contact list?`)) return
    await api.deleteContact(tenantId as string, contact.id)
    await load()
  }

  if (!user) return <AdminLayout title="Contacts"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Contacts"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Contacts">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}/site`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Website
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>👥 Contacts ({filtered.length})</h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}>
                <option value="">All tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={exportCsv} style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                ⬇ Export CSV
              </button>
            </div>
          </div>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 4 }}>{error}</div>}

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
          {filtered.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>
              No contacts yet. Every form submission with an email address lands here, tagged by form and source page.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Tags</th>
                  <th style={{ padding: 8 }}>Source Page</th>
                  <th style={{ padding: 8 }}>Added</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{c.email}</td>
                    <td style={{ padding: 8 }}>{c.name || '—'}</td>
                    <td style={{ padding: 8 }}>
                      {c.tags.map(t => (
                        <span key={t} style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px', marginRight: 4, marginBottom: 2 }}>
                          {t}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>/{c.source_page_slug || ''}</td>
                    <td style={{ padding: 8, color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => handleDelete(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default TenantContactsPage
