import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface PageRow {
  id: string
  slug: string
  title: string
  status: string
  published_at: string | null
  updated_at: string
}

interface NavItem {
  id?: string
  label: string
  kind: 'page' | 'url' | 'lms'
  target: string
  newTab?: boolean
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 24 }
const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500 }
const label: React.CSSProperties = { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#334155' }

const TenantSitePage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query

  const [pages, setPages] = useState<PageRow[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [error, setError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [footerText, setFooterText] = useState('')
  const [packageJson, setPackageJson] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: Record<string, string[]>; updated: Record<string, string[]>; warnings: string[] } | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const [pagesData, settingsData] = await Promise.all([
        api.getSitePages(tenantId as string),
        api.getSiteSettings(tenantId as string),
      ])
      setPages(Array.isArray(pagesData) ? pagesData : [])
      setSettings(settingsData || { features: { lms: true, blog: false, commerce: false }, homepage_mode: 'lms' })
      setNavItems(settingsData?.header?.navItems || [])
      setFooterText(settingsData?.footer?.text || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site data')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const features = settings?.features || { lms: true, blog: false, commerce: false }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const page = await api.createSitePage(tenantId as string, {
        title: newTitle,
        slug: newSlug.trim().toLowerCase(),
      })
      router.push(`/admin/site-editor/${page.id}?tenantId=${tenantId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page')
    }
  }

  const handleTogglePublish = async (page: PageRow) => {
    try {
      if (page.status === 'published') await api.unpublishSitePage(page.id)
      else await api.publishSitePage(page.id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDelete = async (page: PageRow) => {
    if (!confirm(`Delete page "${page.title}"? This cannot be undone.`)) return
    try {
      await api.deleteSitePage(page.id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const saveSettings = async (patch: any) => {
    setSavingSettings(true)
    try {
      const updated = await api.updateSiteSettings(tenantId as string, patch)
      setSettings(updated)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleImportPackage = async () => {
    setImportResult(null)
    let pkg: any
    try {
      pkg = JSON.parse(packageJson)
    } catch {
      alert('Not valid JSON — paste the full site package document.')
      return
    }
    if (!confirm('Import this package? Pages, forms, posts and products with matching slugs/keys will be OVERWRITTEN with the package contents.')) return
    setImporting(true)
    try {
      const summary = await api.importSitePackage(tenantId as string, pkg)
      setImportResult(summary)
      setPackageJson('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleExportPackage = async () => {
    try {
      const pkg = await api.exportSitePackage(tenantId as string)
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `site-package-${tenantId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const saveDesign = () =>
    saveSettings({
      header: { ...(settings?.header || {}), navItems },
      footer: { ...(settings?.footer || {}), text: footerText },
    })

  if (!user) return <AdminLayout title="Website"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Website"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Website">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Tenant
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>🌐 Website</h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href={`/admin/tenants/${tenantId}/posts`} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 600 }}>📰 Blog</Link>
              <Link href={`/admin/tenants/${tenantId}/products`} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 600 }}>🛒 Store</Link>
              <Link href={`/admin/tenants/${tenantId}/forms`} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 600 }}>📋 Forms</Link>
              <Link href={`/admin/tenants/${tenantId}/contacts`} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 600 }}>👥 Contacts</Link>
              <Link href={`/admin/tenants/${tenantId}/assets`} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 600 }}>🗂 Files</Link>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 4, fontSize: 14 }}>{error}</div>
        )}

        {/* Pages */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 19 }}>Pages</h2>
          {loading ? (
            <p>Loading…</p>
          ) : pages.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>No pages yet. Create your homepage below — leave the slug empty for the homepage.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Title</th>
                  <th style={{ padding: 8 }}>Path</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Updated</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{p.title}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>/{p.slug}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px',
                        color: p.status === 'published' ? '#166534' : '#92400e',
                        background: p.status === 'published' ? '#dcfce7' : '#fef3c7',
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 8, color: '#64748b' }}>{new Date(p.updated_at).toLocaleDateString()}</td>
                    <td style={{ padding: 8, display: 'flex', gap: 10 }}>
                      <Link href={`/admin/site-editor/${p.id}?tenantId=${tenantId}`} style={{ color: '#0070f3', textDecoration: 'none' }}>
                        Edit
                      </Link>
                      <button onClick={() => handleTogglePublish(p)} style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', padding: 0, fontSize: 14 }}>
                        {p.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => handleDelete(p)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: 14 }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="Page title" style={{ ...input, flex: 2, minWidth: 160 }} />
            <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="slug (empty = homepage)" style={{ ...input, flex: 1, minWidth: 140 }} />
            <button type="submit" style={btn}>+ New Page</button>
          </form>
        </div>

        {/* Site type & features */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 19 }}>Site Features</h2>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={label}>Homepage</label>
              <select
                value={settings?.homepage_mode || 'lms'}
                onChange={e => saveSettings({ homepage_mode: e.target.value })}
                style={{ ...input, width: 260 }}
              >
                <option value="site">Website homepage (built with editor)</option>
                <option value="lms">LMS portal (redirect to login)</option>
              </select>
            </div>
            {(['lms', 'blog', 'commerce'] as const).map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={features[f] !== false && (f === 'lms' ? true : !!features[f])}
                  onChange={e => saveSettings({ features: { ...features, [f]: e.target.checked } })}
                />
                {f === 'lms' ? 'LMS (courses & learning)' : f === 'blog' ? 'Blog' : 'Commerce'}
              </label>
            ))}
            {savingSettings && <span style={{ fontSize: 13, color: '#64748b' }}>Saving…</span>}
          </div>
        </div>

        {/* Navigation & footer */}
        <div style={card}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 19 }}>Navigation & Footer</h2>
          <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 13 }}>
            Menu items shown in the site header. Leave empty to auto-list published pages.
          </p>
          {navItems.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 1fr auto auto', gap: 8, marginBottom: 8 }}>
              <input value={item.label} placeholder="Label" style={input}
                onChange={e => setNavItems(navItems.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <select value={item.kind} style={input}
                onChange={e => setNavItems(navItems.map((x, j) => (j === i ? { ...x, kind: e.target.value as NavItem['kind'] } : x)))}>
                <option value="page">Site page</option>
                <option value="url">External URL</option>
                <option value="lms">LMS link</option>
              </select>
              <input value={item.target} placeholder={item.kind === 'page' ? 'slug (empty = home)' : item.kind === 'lms' ? '/login' : 'https://…'} style={input}
                onChange={e => setNavItems(navItems.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" disabled={i === 0} onClick={() => {
                  const next = [...navItems]; const [m] = next.splice(i, 1); next.splice(i - 1, 0, m); setNavItems(next)
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>▲</button>
                <button type="button" disabled={i === navItems.length - 1} onClick={() => {
                  const next = [...navItems]; const [m] = next.splice(i, 1); next.splice(i + 1, 0, m); setNavItems(next)
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>▼</button>
              </div>
              <button type="button" onClick={() => setNavItems(navItems.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setNavItems([...navItems, { label: '', kind: 'page', target: '' }])}
            style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', marginBottom: 16 }}>
            + Add menu item
          </button>

          <div style={{ marginBottom: 16 }}>
            <label style={label}>Footer text</label>
            <input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="© 2026 Your Company" style={input} />
          </div>

          <button type="button" onClick={saveDesign} disabled={savingSettings} style={btn}>
            {savingSettings ? 'Saving…' : 'Save Navigation & Footer'}
          </button>
        </div>

        {/* Site package import/export */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 19 }}>📦 Site Package</h2>
            <button type="button" onClick={handleExportPackage} style={{ ...btn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
              ⬇ Export This Site
            </button>
          </div>
          <p style={{ margin: '8px 0 12px 0', color: '#666', fontSize: 13 }}>
            Build or update this entire site from a single JSON document — settings, theme, navigation, pages, forms,
            blog posts and products. Re-importing updates items with matching slugs/keys and leaves everything else
            untouched. Format reference: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>docs/SITE_PACKAGE_REFERENCE.md</code>
          </p>
          <textarea
            value={packageJson}
            onChange={e => setPackageJson(e.target.value)}
            rows={8}
            placeholder='Paste a site package JSON here, or choose a file below…'
            style={{ ...input, fontFamily: 'monospace', fontSize: 12, marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept="application/json,.json"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                file.text().then(setPackageJson)
              }}
              style={{ fontSize: 13 }}
            />
            <button type="button" onClick={handleImportPackage} disabled={importing || !packageJson.trim()} style={{ ...btn, opacity: importing || !packageJson.trim() ? 0.6 : 1 }}>
              {importing ? 'Importing…' : '⬆ Import Package'}
            </button>
          </div>
          {importResult && (
            <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
              {Object.entries(importResult.created).map(([kind, names]) => (
                <div key={`c-${kind}`}>✅ Created {kind}: {names.join(', ')}</div>
              ))}
              {Object.entries(importResult.updated).map(([kind, names]) => (
                <div key={`u-${kind}`}>♻️ Updated {kind}: {names.join(', ')}</div>
              ))}
              {importResult.warnings.map((w, i) => (
                <div key={`w-${i}`} style={{ color: '#b45309' }}>⚠️ {w}</div>
              ))}
              {Object.keys(importResult.created).length === 0 && Object.keys(importResult.updated).length === 0 && (
                <div>Nothing imported.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default TenantSitePage
