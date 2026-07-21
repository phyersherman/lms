import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface FormField {
  key: string
  label: string
  type: string
  required?: boolean
  options?: string[]
}

interface FormRow {
  id: string
  name: string
  kind: string
  fields: FormField[]
  notify_email: string | null
  lead_magnet_asset_id: string | null
  success_message: string | null
  tags: string[]
  _count?: { submissions: number }
}

const FIELD_TYPES = ['text', 'email', 'textarea', 'select', 'checkbox', 'tel']
const FORM_KINDS = [
  { value: 'capture', label: 'Email capture' },
  { value: 'contact', label: 'Contact form' },
  { value: 'download', label: 'Download / lead magnet' },
  { value: 'custom', label: 'Custom' },
]

const card: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 24 }
const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500 }
const label: React.CSSProperties = { display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13, color: '#334155' }

const emptyDraft = (): Partial<FormRow> => ({
  name: '',
  kind: 'capture',
  fields: [
    { key: 'first_name', label: 'First Name', type: 'text', required: true },
    { key: 'email', label: 'Email Address', type: 'email', required: true },
  ],
  notify_email: '',
  lead_magnet_asset_id: '',
  success_message: '',
  tags: [],
})

const TenantFormsPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query

  const [forms, setForms] = useState<FormRow[]>([])
  const [assets, setAssets] = useState<{ id: string; filename: string }[]>([])
  const [editing, setEditing] = useState<Partial<FormRow> | null>(null)
  const [submissions, setSubmissions] = useState<{ form: FormRow; rows: any[] } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const [formsData, assetsData] = await Promise.all([
        api.getForms(tenantId as string),
        api.getAssets(tenantId as string),
      ])
      setForms(Array.isArray(formsData) ? formsData : [])
      setAssets(Array.isArray(assetsData) ? assetsData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms')
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!editing || !editing.name) return
    setSaving(true)
    try {
      const payload = {
        name: editing.name,
        kind: editing.kind,
        fields: editing.fields || [],
        notify_email: editing.notify_email || null,
        lead_magnet_asset_id: editing.lead_magnet_asset_id || null,
        success_message: editing.success_message || null,
        tags: editing.tags || [],
      }
      if (editing.id) await api.updateForm(editing.id, payload)
      else await api.createForm(tenantId as string, payload)
      setEditing(null)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (form: FormRow) => {
    if (!confirm(`Delete form "${form.name}" and its submissions?`)) return
    await api.deleteForm(form.id)
    await load()
  }

  const viewSubmissions = async (form: FormRow) => {
    const rows = await api.getFormSubmissions(form.id)
    setSubmissions({ form, rows: Array.isArray(rows) ? rows : [] })
  }

  const updateField = (i: number, patch: Partial<FormField>) => {
    setEditing(e => e ? { ...e, fields: (e.fields || []).map((f, j) => (j === i ? { ...f, ...patch } : f)) } : e)
  }

  if (!user) return <AdminLayout title="Forms"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Forms"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Forms">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}/site`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Website
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>📋 Forms</h1>
            <button style={btn} onClick={() => setEditing(emptyDraft())}>+ New Form</button>
          </div>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 4 }}>{error}</div>}

        <div style={card}>
          {forms.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>
              No forms yet. Create an email-capture, contact or download form, then add it to any page with the Form block.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Type</th>
                  <th style={{ padding: 8 }}>Fields</th>
                  <th style={{ padding: 8 }}>Submissions</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{f.name}</td>
                    <td style={{ padding: 8 }}>{FORM_KINDS.find(k => k.value === f.kind)?.label || f.kind}</td>
                    <td style={{ padding: 8, color: '#64748b' }}>{(f.fields || []).map(x => x.label).join(', ')}</td>
                    <td style={{ padding: 8 }}>{f._count?.submissions ?? 0}</td>
                    <td style={{ padding: 8, display: 'flex', gap: 10 }}>
                      <button onClick={() => setEditing({ ...f })} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', padding: 0, fontSize: 14 }}>Edit</button>
                      <button onClick={() => viewSubmissions(f)} style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', padding: 0, fontSize: 14 }}>Submissions</button>
                      <button onClick={() => handleDelete(f)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: 14 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Form editor modal */}
        {editing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>{editing.id ? 'Edit Form' : 'New Form'}</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={label}>Form name *</label>
                  <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} placeholder="e.g. Newsletter Signup" />
                </div>
                <div>
                  <label style={label}>Type</label>
                  <select value={editing.kind || 'capture'} onChange={e => setEditing({ ...editing, kind: e.target.value })} style={input}>
                    {FORM_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Notification email</label>
                  <input value={editing.notify_email || ''} onChange={e => setEditing({ ...editing, notify_email: e.target.value })} style={input} placeholder="submissions go to this address" />
                </div>
                <div>
                  <label style={label}>Lead magnet (emailed as download link)</label>
                  <select value={editing.lead_magnet_asset_id || ''} onChange={e => setEditing({ ...editing, lead_magnet_asset_id: e.target.value })} style={input}>
                    <option value="">— None —</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.filename}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Success message</label>
                <input value={editing.success_message || ''} onChange={e => setEditing({ ...editing, success_message: e.target.value })} style={input} placeholder="Thanks! Check your inbox." />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Contact tags (comma-separated; page source is tagged automatically)</label>
                <input
                  value={(editing.tags || []).join(', ')}
                  onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  style={input}
                  placeholder="newsletter, white-paper"
                />
              </div>

              <label style={label}>Fields</label>
              {(editing.fields || []).map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px auto auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input value={f.label} placeholder="Label" style={input}
                    onChange={e => updateField(i, { label: e.target.value, key: f.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') })} />
                  <input value={f.key} placeholder="key" style={{ ...input, fontFamily: 'monospace', fontSize: 12 }}
                    onChange={e => updateField(i, { key: e.target.value })} />
                  <select value={f.type} style={input} onChange={e => updateField(i, { type: e.target.value })}>
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <input type="checkbox" checked={!!f.required} onChange={e => updateField(i, { required: e.target.checked })} />
                    req
                  </label>
                  <button type="button" onClick={() => setEditing({ ...editing, fields: (editing.fields || []).filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                  {f.type === 'select' && (
                    <input
                      value={(f.options || []).join(', ')}
                      placeholder="Options, comma-separated"
                      style={{ ...input, gridColumn: '1 / -1' }}
                      onChange={e => updateField(i, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditing({ ...editing, fields: [...(editing.fields || []), { key: '', label: '', type: 'text' }] })}
                style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', marginBottom: 20 }}
              >
                + Add field
              </button>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(null)} style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !editing.name} style={{ ...btn, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save Form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submissions modal */}
        {submissions && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 760, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Submissions — {submissions.form.name}</h3>
                <button onClick={() => setSubmissions(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
              </div>
              {submissions.rows.length === 0 ? (
                <p style={{ color: '#64748b' }}>No submissions yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: 6 }}>Date</th>
                      <th style={{ padding: 6 }}>Page</th>
                      <th style={{ padding: 6 }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.rows.map((s: any) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                        <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleString()}</td>
                        <td style={{ padding: 6 }}>/{s.page_slug || ''}</td>
                        <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 12 }}>
                          {Object.entries(s.data || {}).map(([k, v]) => (
                            <div key={k}><b>{k}</b>: {String(v)}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default TenantFormsPage
