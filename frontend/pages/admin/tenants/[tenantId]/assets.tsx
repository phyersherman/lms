import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface Asset {
  id: string
  filename: string
  mime: string
  size: number
  url: string
  created_at: string
}

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`

const TenantAssetsPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query
  const fileInput = useRef<HTMLInputElement>(null)

  const [assets, setAssets] = useState<Asset[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const data = await api.getAssets(tenantId as string)
      setAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        await api.uploadAsset(tenantId as string, file)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const copyUrl = (asset: Asset) => {
    const url = `${window.location.origin}${asset.url}`
    navigator.clipboard.writeText(url)
    alert(`Copied: ${url}\n\nNote: on the live site this file is served from the site's own domain at ${asset.url}`)
  }

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.filename}"? Pages using it will show a broken link.`)) return
    await api.deleteAsset(tenantId as string, asset.id)
    await load()
  }

  if (!user) return <AdminLayout title="Assets"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Assets"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Assets">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}/site`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Website
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>🗂 Files & Images</h1>
            <div>
              <input ref={fileInput} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500, opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? 'Uploading…' : '⬆ Upload Files'}
              </button>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: 13, margin: '8px 0 0 0' }}>
            Images for pages, and PDFs for lead-magnet downloads. Max 25 MB per file.
          </p>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 4 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {assets.map(a => (
            <div key={a.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: 120, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {a.mime.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 40 }}>{a.mime === 'application/pdf' ? '📄' : '📁'}</span>
                )}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.filename}>
                  {a.filename}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{formatSize(a.size)}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => copyUrl(a)} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: 12, padding: 0 }}>Copy URL</button>
                  <button onClick={() => handleDelete(a)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {assets.length === 0 && (
            <p style={{ color: '#64748b', fontSize: 14 }}>No files uploaded yet.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default TenantAssetsPage
