import type { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import SiteLayout from '../../src/components/site/SiteLayout'
import { fetchSitePage, isPlatformHost, SitePageResponse } from '../../src/lib/siteApi'

interface Props {
  data: SitePageResponse
}

const CheckoutCancelled: NextPage<Props> = ({ data }) => (
  <SiteLayout site={data.site} pages={data.pages} seo={{ title: `Checkout cancelled — ${data.site.name}` }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 30, margin: '0 0 12px 0' }}>Checkout cancelled</h1>
      <p style={{ fontSize: 17, opacity: 0.75, lineHeight: 1.6 }}>
        No payment was taken. You can return to the site and try again whenever you&apos;re ready.
      </p>
      <Link
        href="/"
        style={{ display: 'inline-block', marginTop: 24, background: 'var(--color-primary)', color: 'white', padding: '12px 28px', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}
      >
        Back to home
      </Link>
    </div>
  </SiteLayout>
)

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  const host = req.headers.host || ''
  if (isPlatformHost(host)) return { notFound: true }
  const data = await fetchSitePage(host, '')
  if (!data) return { notFound: true }
  return { props: { data } }
}

export default CheckoutCancelled
