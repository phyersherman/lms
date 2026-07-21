import type { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import SiteLayout from '../../src/components/site/SiteLayout'
import { fetchSitePage, isPlatformHost, SitePageResponse } from '../../src/lib/siteApi'

interface Props {
  data: SitePageResponse
}

const CheckoutSuccess: NextPage<Props> = ({ data }) => (
  <SiteLayout site={data.site} pages={data.pages} seo={{ title: `Order confirmed — ${data.site.name}` }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: 32, margin: '0 0 12px 0' }}>Thank you for your order!</h1>
      <p style={{ fontSize: 17, opacity: 0.75, lineHeight: 1.6 }}>
        Your payment was received. A confirmation email is on its way to your inbox.
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

export default CheckoutSuccess
