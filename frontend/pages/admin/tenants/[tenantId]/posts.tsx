import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../../src/components/AdminLayout'
import { useAuth } from '../../../../src/auth/AuthProvider'
import api from '../../../../src/lib/api'

interface Category {
  id: string
  name: string
  slug: string
  _count?: { posts: number }
}

interface PostRow {
  id: string
  slug: string
  title: string
  excerpt: string | null
  status: string
  featured: boolean
  published_at: string | null
  categories: Category[]
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 24 }
const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500 }

const TenantPostsPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId } = router.query

  const [posts, setPosts] = useState<PostRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const [p, c] = await Promise.all([
        api.getPosts(tenantId as string),
        api.getCategories(tenantId as string),
      ])
      setPosts(Array.isArray(p) ? p : [])
      setCategories(Array.isArray(c) ? c : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const post = await api.createPost(tenantId as string, { title: newTitle })
      router.push(`/admin/post-editor/${post.id}?tenantId=${tenantId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create post')
    }
  }

  const togglePublish = async (post: PostRow) => {
    if (post.status === 'published') await api.unpublishPost(post.id)
    else await api.publishPost(post.id)
    await load()
  }

  const toggleFeatured = async (post: PostRow) => {
    await api.updatePost(post.id, { featured: !post.featured })
    await load()
  }

  const handleDelete = async (post: PostRow) => {
    if (!confirm(`Delete post "${post.title}"?`)) return
    await api.deletePost(post.id)
    await load()
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      await api.createCategory(tenantId as string, newCategory.trim())
      setNewCategory('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (!user) return <AdminLayout title="Blog"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="Blog"><div>Unauthorized</div></AdminLayout>

  return (
    <AdminLayout title="Blog">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/tenants/${tenantId}/site`} style={{ color: '#667eea', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Website
          </Link>
          <h1 style={{ margin: '12px 0 0 0', fontSize: 26 }}>📰 Blog</h1>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 4 }}>{error}</div>}

        <div style={card}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 19 }}>Posts</h2>
          {posts.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>No posts yet. Write your first post below.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Title</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Categories</th>
                  <th style={{ padding: 8 }}>Featured</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{p.title}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px',
                        color: p.status === 'published' ? '#166534' : '#92400e',
                        background: p.status === 'published' ? '#dcfce7' : '#fef3c7',
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 8, color: '#64748b' }}>{p.categories.map(c => c.name).join(', ') || '—'}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => toggleFeatured(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Toggle featured">
                        {p.featured ? '⭐' : '☆'}
                      </button>
                    </td>
                    <td style={{ padding: 8, display: 'flex', gap: 10 }}>
                      <Link href={`/admin/post-editor/${p.id}?tenantId=${tenantId}`} style={{ color: '#0070f3', textDecoration: 'none' }}>Edit</Link>
                      <button onClick={() => togglePublish(p)} style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', padding: 0, fontSize: 14 }}>
                        {p.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => handleDelete(p)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: 14 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="New post title" style={{ ...input, flex: 1 }} />
            <button type="submit" style={btn}>+ New Post</button>
          </form>
        </div>

        <div style={card}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 19 }}>Categories</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {categories.map(c => (
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 999, padding: '4px 12px', fontSize: 13 }}>
                {c.name} <span style={{ color: '#94a3b8' }}>({c._count?.posts ?? 0})</span>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete category "${c.name}"?`)) return
                    await api.deleteCategory(tenantId as string, c.id)
                    await load()
                  }}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
                >
                  ✕
                </button>
              </span>
            ))}
            {categories.length === 0 && <span style={{ color: '#64748b', fontSize: 14 }}>No categories yet.</span>}
          </div>
          <form onSubmit={addCategory} style={{ display: 'flex', gap: 8 }}>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New category name" style={{ ...input, width: 260 }} />
            <button type="submit" style={btn}>Add</button>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default TenantPostsPage
