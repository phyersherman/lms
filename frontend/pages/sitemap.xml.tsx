import type { GetServerSideProps } from 'next'
import { fetchSitePage, fetchPosts, isPlatformHost } from '../src/lib/siteApi'

// Per-host XML sitemap: published pages + blog posts for the requesting domain.
const Sitemap = () => null

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = req.headers.host || ''
  if (isPlatformHost(host)) return { notFound: true }

  const data = await fetchSitePage(host, '')
  if (!data) return { notFound: true }

  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const base = `${proto}://${host}`

  const urls: string[] = data.pages.map(p => `${base}/${p.slug}`.replace(/\/$/, '') || base)

  if (data.site.features?.blog) {
    const blog = await fetchPosts(host)
    if (blog && blog.posts.length) {
      urls.push(`${base}/blog`)
      urls.push(...blog.posts.map(p => `${base}/blog/${p.slug}`))
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(new Set(urls)).map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml')
  res.write(xml)
  res.end()
  return { props: {} }
}

export default Sitemap
