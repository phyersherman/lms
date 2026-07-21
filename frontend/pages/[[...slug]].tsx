import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../src/auth/AuthProvider'
import SiteLayout from '../src/components/site/SiteLayout'
import PageRenderer from '../src/components/blocks/PageRenderer'
import { fetchSitePage, isPlatformHost, SitePageResponse } from '../src/lib/siteApi'

interface Props {
  mode: 'platform' | 'site'
  data?: SitePageResponse
}

// Old index.tsx behavior for the platform/admin domain: route users by role.
const PlatformGateway: NextPage = () => {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user === null) router.replace('/login')
    else if (user && user.role === 'admin') router.replace('/admin/tenants')
    else if (user) router.replace('/dashboard')
  }, [user, router])

  return (
    <>
      <Head>
        <title>Portal</title>
      </Head>
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Loading…</h1>
      </main>
    </>
  )
}

const CatchAllPage: NextPage<Props> = ({ mode, data }) => {
  if (mode === 'platform' || !data) return <PlatformGateway />

  const { site, pages, page } = data

  if (!page) {
    // Site exists but this page isn't published: soft landing on homepage,
    // proper 404 handled in getServerSideProps for non-root slugs.
    return (
      <SiteLayout site={site} pages={pages}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 36, marginBottom: 12 }}>{site.name}</h1>
          <p style={{ fontSize: 18, opacity: 0.7 }}>This site is coming soon.</p>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout
      site={site}
      pages={pages}
      seo={{ title: page.seo_title || page.title, description: page.seo_description, ogImage: page.og_image_url }}
    >
      <PageRenderer content={page.content} context={{ surface: 'site' }} />
    </SiteLayout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, params }) => {
  const host = req.headers.host || ''
  const slugParts = (params?.slug as string[] | undefined) || []
  const slug = slugParts.join('/')

  if (isPlatformHost(host)) {
    if (slug !== '') return { notFound: true }
    return { props: { mode: 'platform' } }
  }

  const data = await fetchSitePage(host, slug)

  // Unknown domain: fall back to platform gateway on the root, 404 elsewhere
  if (!data) {
    if (slug !== '') return { notFound: true }
    return { props: { mode: 'platform' } }
  }

  // LMS-only site: the root goes straight to the login page
  if (slug === '' && data.site.homepage_mode === 'lms' && !data.page) {
    return { redirect: { destination: '/login', permanent: false } }
  }

  if (slug !== '' && !data.page) return { notFound: true }

  return { props: { mode: 'site', data } }
}

export default CatchAllPage
