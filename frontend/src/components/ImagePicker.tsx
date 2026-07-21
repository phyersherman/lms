import React, { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

interface Asset {
  id: string
  filename: string
  mime: string
  url: string
}

interface Props {
  value?: string
  onChange: (url: string) => void
  tenantId?: string // enables upload + library; without it only the URL input renders
  label?: string
}

const btnStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  whiteSpace: 'nowrap',
}

// Image input used across the editor and admin: upload a file, pick one from
// the site's uploaded files, or paste a URL. Uploaded files are stored per
// tenant and served same-origin at /api/uploads/… on every site domain.
const ImagePicker: React.FC<Props> = ({ value, onChange, tenantId, label }) => {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!libraryOpen || !tenantId) return
    api.getAssets(tenantId)
      .then((list: any) => setAssets((Array.isArray(list) ? list : []).filter((a: Asset) => a.mime.startsWith('image/'))))
      .catch(() => setAssets([]))
  }, [libraryOpen, tenantId])

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !tenantId) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    setUploading(true)
    setError('')
    try {
      const asset = await api.uploadAsset(tenantId, file)
      onChange(asset.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>}

      {value && (
        <div style={{ position: 'relative', marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" style={{ width: '100%', maxHeight: 110, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', display: 'block' }} />
          <button
            type="button"
            title="Remove image"
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(15,23,42,0.75)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '2px 7px' }}
          >
            ✕ Remove
          </button>
        </div>
      )}

      {tenantId && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
          <button type="button" style={btnStyle} disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? 'Uploading…' : '⬆ Upload'}
          </button>
          <button type="button" style={btnStyle} onClick={() => setLibraryOpen(true)}>
            🗂 Library
          </button>
        </div>
      )}

      <input
        type="text"
        value={value || ''}
        placeholder="or paste an image URL"
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
      />
      {error && <p style={{ color: '#dc2626', fontSize: 11, margin: '4px 0 0 0' }}>{error}</p>}

      {libraryOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setLibraryOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 10, padding: 20, width: 640, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Choose an image</h3>
              <button type="button" onClick={() => setLibraryOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {assets.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>No images uploaded yet — use the Upload button, or add files under Website → Files.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                {assets.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.filename}
                    onClick={() => {
                      onChange(a.url)
                      setLibraryOpen(false)
                    }}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 0, cursor: 'pointer', background: '#f8fafc', overflow: 'hidden' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.filename} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                    <span style={{ display: 'block', fontSize: 10, color: '#64748b', padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.filename}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImagePicker
