import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../../src/auth/AuthProvider'
import api from '../../../src/lib/api'
import PageEditor from '../../../src/components/PageEditor/PageEditor'
import { PageContent } from '../../../src/components/blocks/types'

interface PageData {
  id: string
  tenant_id: string
  slug: string
  title: string
  seo_title: string | null
  seo_description: string | null
  status: string
  draft_content: PageContent
  published_at: string | null
}

// Full-viewport visual page editor.
const SiteEditorPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { pageId, tenantId } = router.query

  const [page, setPage] = useState<PageData | null>(null)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaSlug, setMetaSlug] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')

  useEffect(() => {
    if (!pageId || typeof pageId !== 'string') return
    api.getSitePage(pageId)
      .then(p => {
        setPage(p)
        setMetaTitle(p.title)
        setMetaSlug(p.slug)
        setSeoTitle(p.seo_title || '')
        setSeoDescription(p.seo_description || '')
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load page'))
  }, [pageId])

  if (!user) return <div style={{ padding: 40 }}>Loading…</div>
  if (user.role !== 'admin') return <div style={{ padding: 40 }}>Unauthorized</div>
  if (error) return <div style={{ padding: 40, color: '#dc2626' }}>{error}</div>
  if (!page) return <div style={{ padding: 40 }}>Loading page…</div>

  const backHref = tenantId ? `/admin/tenants/${tenantId}/site` : `/admin/tenants/${page.tenant_id}/site`

  const saveMeta = async () => {
    try {
      const updated = await api.updateSitePage(page.id, {
        title: metaTitle,
        slug: metaSlug.trim().toLowerCase(),
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
      })
      setPage(p => (p ? { ...p, title: updated.title, slug: updated.slug, seo_title: updated.seo_title, seo_description: updated.seo_description } : p))
      setShowSettings(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save page settings')
    }
  }

  return (
    <>
      <Head>
        <title>{`Edit: ${page.title}`}</title>
      </Head>
      <PageEditor
        initialContent={page.draft_content}
        publishedAt={page.published_at}
        onSaveDraft={async content => {
          await api.updateSitePage(page.id, { draft_content: content })
        }}
        onPublish={async () => {
          const published = await api.publishSitePage(page.id)
          setPage(p => (p ? { ...p, status: published.status, published_at: published.published_at } : p))
        }}
        headerLeft={
          <>
            <Link href={backHref} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>
              ← Pages
            </Link>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {page.title}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>/{page.slug}</span>
          </>
        }
        headerRight={
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={{ background: '#1e293b', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
          >
            ⚙ Page Settings
          </button>
        }
      />

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 480, maxWidth: '92vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Page Settings</h3>
            {[
              { label: 'Title', value: metaTitle, set: setMetaTitle },
              { label: 'Slug (empty = homepage)', value: metaSlug, set: setMetaSlug },
              { label: 'SEO title', value: seoTitle, set: setSeoTitle },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.label}</label>
                <input
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>SEO description</label>
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowSettings(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={saveMeta} style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SiteEditorPage
