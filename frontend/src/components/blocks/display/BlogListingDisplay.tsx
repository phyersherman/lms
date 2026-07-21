import React, { useEffect, useState } from 'react'
import { BlockNode, parseConfig } from '../types'

export interface BlogListingConfig {
  limit?: number
  heading?: string
}

export const DEFAULT_BLOG_LISTING_CONFIG: BlogListingConfig = { limit: 3, heading: 'Latest Posts' }

interface PostSummary {
  slug: string
  title: string
  excerpt: string | null
  published_at: string | null
  cover_image_url: string | null
}

// Shows recent blog posts on any page (fetches from the site's own domain).
const BlogListingDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_BLOG_LISTING_CONFIG)
  const [posts, setPosts] = useState<PostSummary[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/public/posts?limit=${config.limit || 3}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (!cancelled) setPosts(d.posts || []) })
      .catch(() => { if (!cancelled) setPosts([]) })
    return () => { cancelled = true }
  }, [config.limit])

  return (
    <div>
      {config.heading && <h2 style={{ margin: '0 0 20px 0' }}>{config.heading}</h2>}
      {posts === null ? (
        <p style={{ opacity: 0.6, fontSize: 14 }}>Loading posts…</p>
      ) : posts.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: 14 }}>No posts yet. (Blog posts appear here once published.)</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {posts.map(p => (
            <a key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden', display: 'block' }}>
              {p.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              )}
              <div style={{ padding: 16 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 17, lineHeight: 1.3 }}>{p.title}</h3>
                {p.excerpt && <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>{p.excerpt}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlogListingDisplay
