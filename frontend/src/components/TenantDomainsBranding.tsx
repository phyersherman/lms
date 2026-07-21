import React, { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import ImagePicker from './ImagePicker'

interface Domain {
  id: string
  host: string
  isPrimary: boolean
}

interface Props {
  tenantId: string
  initialTheme?: { primaryColor?: string | null; secondaryColor?: string | null; logoUrl?: string | null }
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 32 }
const label: React.CSSProperties = { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }
const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500 }

const TenantDomainsBranding: React.FC<Props> = ({ tenantId, initialTheme }) => {
  const [domains, setDomains] = useState<Domain[]>([])
  const [newHost, setNewHost] = useState('')
  const [domainError, setDomainError] = useState('')
  const [primaryColor, setPrimaryColor] = useState(initialTheme?.primaryColor || '#0ea5a4')
  const [secondaryColor, setSecondaryColor] = useState(initialTheme?.secondaryColor || '#334155')
  const [logoUrl, setLogoUrl] = useState(initialTheme?.logoUrl || '')
  const [savingTheme, setSavingTheme] = useState(false)

  const loadDomains = useCallback(async () => {
    try {
      const list = await api.getTenantDomains(tenantId)
      setDomains(Array.isArray(list) ? list : [])
    } catch {
      setDomains([])
    }
  }, [tenantId])

  useEffect(() => { loadDomains() }, [loadDomains])

  useEffect(() => {
    if (initialTheme?.primaryColor) setPrimaryColor(initialTheme.primaryColor)
    if (initialTheme?.secondaryColor) setSecondaryColor(initialTheme.secondaryColor)
    if (initialTheme?.logoUrl) setLogoUrl(initialTheme.logoUrl)
  }, [initialTheme?.primaryColor, initialTheme?.secondaryColor, initialTheme?.logoUrl])

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setDomainError('')
    const host = newHost.trim().toLowerCase()
    if (!host) return
    try {
      await api.addTenantDomain(tenantId, host, domains.length === 0)
      setNewHost('')
      await loadDomains()
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Failed to add domain')
    }
  }

  const handleRemoveDomain = async (domain: Domain) => {
    if (!confirm(`Remove domain "${domain.host}"? The site will no longer be reachable at this address.`)) return
    try {
      await api.removeTenantDomain(tenantId, domain.id)
      await loadDomains()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove domain')
    }
  }

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingTheme(true)
    try {
      await api.updateTenant(tenantId, { theme: { primaryColor, secondaryColor, logoUrl } })
      alert('Branding saved')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSavingTheme(false)
    }
  }

  return (
    <>
      <div style={card}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: '#333' }}>🌐 Domains</h2>
        <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 14 }}>
          Domains that route to this site. Point the domain&apos;s DNS at this server; SSL certificates are issued automatically.
        </p>
        {domains.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 14 }}>No domains configured yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
            {domains.map(d => (
              <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{d.host}</span>
                {d.isPrimary && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', background: '#ccfbf1', borderRadius: 4, padding: '2px 6px' }}>PRIMARY</span>
                )}
                <button
                  onClick={() => handleRemoveDomain(d)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: 8 }}>
          <input
            value={newHost}
            onChange={e => setNewHost(e.target.value)}
            placeholder="www.example.com"
            style={{ ...input, flex: 1 }}
          />
          <button type="submit" style={primaryBtn}>Add Domain</button>
        </form>
        {domainError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{domainError}</p>}
      </div>

      <div style={card}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: '#333' }}>🎨 Branding</h2>
        <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 14 }}>
          Default brand colors and logo used across this site and its LMS pages.
        </p>
        <form onSubmit={handleSaveTheme}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <label style={label}>Primary Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 44, height: 34, padding: 2, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ ...input, width: 110 }} />
              </div>
            </div>
            <div>
              <label style={label}>Secondary Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: 44, height: 34, padding: 2, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ ...input, width: 110 }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <ImagePicker label="Logo" value={logoUrl} onChange={setLogoUrl} tenantId={tenantId} />
            </div>
          </div>
          <button type="submit" disabled={savingTheme} style={{ ...primaryBtn, opacity: savingTheme ? 0.6 : 1 }}>
            {savingTheme ? 'Saving…' : 'Save Branding'}
          </button>
        </form>
      </div>
    </>
  )
}

export default TenantDomainsBranding
