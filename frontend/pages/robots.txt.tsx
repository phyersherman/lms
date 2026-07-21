import type { GetServerSideProps } from 'next'
import { isPlatformHost } from '../src/lib/siteApi'

const Robots = () => null

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = req.headers.host || ''
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'

  // Customer sites: allow crawling but keep app/admin surfaces out.
  // Platform/admin domain: disallow everything.
  const body = isPlatformHost(host)
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /dashboard\nDisallow: /checkout\nSitemap: ${proto}://${host}/sitemap.xml\n`

  res.setHeader('Content-Type', 'text/plain')
  res.write(body)
  res.end()
  return { props: {} }
}

export default Robots
