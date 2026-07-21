import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../../src/auth/AuthProvider'
import api from '../../../src/lib/api'
import PageEditor from '../../../src/components/PageEditor/PageEditor'
import { PageContent } from '../../../src/components/blocks/types'

interface PostData {
  id: string
  tenant_id: string
  slug: string
  title: string
  excerpt: string | null
  content: PageContent
  featured: boolean
  status: string
  published_at: string | null
  cover_image_url: string | null
  categories: { id: string; name: string }[]
}

// Full-viewport blog post editor (same canvas as the page editor).
const PostEditorPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { postId, tenantId } = router.query

  const [post, setPost] = useState<PostData | null>(null)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaSlug, setMetaSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  useEffect(() => {
    if (!postId || typeof postId !== 'string') return
    api.getPost(postId)
      .then(p => {
        setPost(p)
        setMetaTitle(p.title)
        setMetaSlug(p.slug)
        setExcerpt(p.excerpt || '')
        setCoverUrl(p.cover_image_url || '')
        setSelectedCategoryIds((p.categories || []).map((c: any) => c.id))
        return api.getCategories(p.tenant_id)
      })
      .then(cats => setAllCategories(Array.isArray(cats) ? cats : []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load post'))
  }, [postId])

  if (!user) return <div style={{ padding: 40 }}>Loading…</div>
  if (user.role !== 'admin') return <div style={{ padding: 40 }}>Unauthorized</div>
  if (error) return <div style={{ padding: 40, color: '#dc2626' }}>{error}</div>
  if (!post) return <div style={{ padding: 40 }}>Loading post…</div>

  const backHref = `/admin/tenants/${tenantId || post.tenant_id}/posts`

  const saveMeta = async () => {
    try {
      const updated = await api.updatePost(post.id, {
        title: metaTitle,
        slug: metaSlug,
        excerpt: excerpt || null,
        cover_image_url: coverUrl || null,
        categoryIds: selectedCategoryIds,
      })
      setPost(p => (p ? { ...p, title: updated.title, slug: updated.slug, excerpt: updated.excerpt, cover_image_url: updated.cover_image_url, categories: updated.categories } : p))
      setShowSettings(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save post settings')
    }
  }

  return (
    <>
      <Head>
        <title>{`Edit post: ${post.title}`}</title>
      </Head>
      <PageEditor
        initialContent={post.content}
        publishedAt={post.published_at}
        tenantId={post.tenant_id}
        onSaveDraft={async content => {
          await api.updatePost(post.id, { content })
        }}
        onPublish={async () => {
          const published = await api.publishPost(post.id)
          setPost(p => (p ? { ...p, status: published.status, published_at: published.published_at } : p))
        }}
        headerLeft={
          <>
            <Link href={backHref} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>
              ← Posts
            </Link>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.title}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>/blog/{post.slug}</span>
          </>
        }
        headerRight={
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={{ background: '#1e293b', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
          >
            ⚙ Post Settings
          </button>
        }
      />

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 480, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Post Settings</h3>
            {[
              { label: 'Title', value: metaTitle, set: setMetaTitle },
              { label: 'Slug', value: metaSlug, set: setMetaSlug },
              { label: 'Cover image URL', value: coverUrl, set: setCoverUrl },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Excerpt</label>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Categories</label>
              {allCategories.length === 0 && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No categories defined yet.</p>}
              {allCategories.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(c.id)}
                    onChange={e =>
                      setSelectedCategoryIds(ids => (e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id)))
                    }
                  />
                  {c.name}
                </label>
              ))}
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

export default PostEditorPage
