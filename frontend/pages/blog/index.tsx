import type { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import SiteLayout from '../../src/components/site/SiteLayout'
import { fetchSitePage, fetchPosts, isPlatformHost, SitePageResponse, PublicPostSummary } from '../../src/lib/siteApi'

interface Props {
  data: SitePageResponse
  posts: PublicPostSummary[]
  categories: { name: string; slug: string }[]
  activeCategory: string | null
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''

const PostCard: React.FC<{ post: PublicPostSummary; big?: boolean }> = ({ post, big }) => (
  <Link
    href={`/blog/${post.slug}`}
    style={{
      display: 'block',
      textDecoration: 'none',
      color: 'inherit',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--site-bg)',
    }}
  >
    {post.cover_image_url && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.cover_image_url} alt="" style={{ width: '100%', height: big ? 280 : 160, objectFit: 'cover' }} />
    )}
    <div style={{ padding: big ? 24 : 18 }}>
      {post.featured && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Featured
        </span>
      )}
      <h2 style={{ margin: '6px 0 8px 0', fontSize: big ? 26 : 19, lineHeight: 1.3 }}>{post.title}</h2>
      {post.excerpt && <p style={{ margin: 0, opacity: 0.75, fontSize: 15, lineHeight: 1.5 }}>{post.excerpt}</p>}
      <p style={{ margin: '10px 0 0 0', fontSize: 13, opacity: 0.6 }}>
        {formatDate(post.published_at)}
        {post.categories.length > 0 && ` · ${post.categories.map(c => c.name).join(', ')}`}
      </p>
    </div>
  </Link>
)

const BlogIndex: NextPage<Props> = ({ data, posts, categories, activeCategory }) => {
  const featured = !activeCategory ? posts.find(p => p.featured) : undefined
  const rest = featured ? posts.filter(p => p.slug !== featured.slug) : posts

  return (
    <SiteLayout site={data.site} pages={data.pages} seo={{ title: `Blog — ${data.site.name}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 36, margin: '0 0 8px 0' }}>Blog</h1>

        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0 32px 0' }}>
            <Link
              href="/blog"
              style={{
                padding: '6px 14px', borderRadius: 999, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                background: !activeCategory ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)',
                color: !activeCategory ? 'white' : 'inherit',
              }}
            >
              All
            </Link>
            {categories.map(c => (
              <Link
                key={c.slug}
                href={`/blog?category=${c.slug}`}
                style={{
                  padding: '6px 14px', borderRadius: 999, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                  background: activeCategory === c.slug ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)',
                  color: activeCategory === c.slug ? 'white' : 'inherit',
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No posts published yet. Check back soon.</p>
        ) : (
          <>
            {featured && (
              <div style={{ marginBottom: 32 }}>
                <PostCard post={featured} big />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {rest.map(p => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, query }) => {
  const host = req.headers.host || ''
  if (isPlatformHost(host)) return { notFound: true }

  const category = typeof query.category === 'string' ? query.category : null
  const [data, blog] = await Promise.all([fetchSitePage(host, ''), fetchPosts(host, category || undefined)])
  if (!data || !blog || !data.site.features?.blog) return { notFound: true }

  return { props: { data, posts: blog.posts, categories: blog.categories, activeCategory: category } }
}

export default BlogIndex
