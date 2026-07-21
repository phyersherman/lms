import type { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import SiteLayout from '../../src/components/site/SiteLayout'
import PageRenderer from '../../src/components/blocks/PageRenderer'
import { fetchSitePage, fetchPost, isPlatformHost, SitePageResponse } from '../../src/lib/siteApi'

interface Props {
  data: SitePageResponse
  post: {
    slug: string
    title: string
    excerpt: string | null
    content: any
    published_at: string | null
    cover_image_url: string | null
    categories: { name: string; slug: string }[]
  }
}

const BlogPost: NextPage<Props> = ({ data, post }) => (
  <SiteLayout site={data.site} pages={data.pages} seo={{ title: `${post.title} — ${data.site.name}`, description: post.excerpt }}>
    <article style={{ padding: '48px 0' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
        <Link href="/blog" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← All posts
        </Link>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.2, margin: '16px 0 8px 0' }}>{post.title}</h1>
        <p style={{ opacity: 0.6, fontSize: 14, margin: '0 0 24px 0' }}>
          {post.published_at && new Date(post.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          {post.categories.length > 0 && ` · ${post.categories.map(c => c.name).join(', ')}`}
        </p>
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 24 }} />
        )}
      </div>
      <PageRenderer content={post.content} context={{ surface: 'site' }} />
    </article>
  </SiteLayout>
)

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, params }) => {
  const host = req.headers.host || ''
  if (isPlatformHost(host)) return { notFound: true }

  const slug = String(params?.postSlug || '')
  const [data, post] = await Promise.all([fetchSitePage(host, ''), fetchPost(host, slug)])
  if (!data || !post || !data.site.features?.blog) return { notFound: true }

  return { props: { data, post: post as Props['post'] } }
}

export default BlogPost
