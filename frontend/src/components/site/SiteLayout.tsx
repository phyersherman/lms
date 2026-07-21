import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { PublicSite } from '../../lib/siteApi'

interface Props {
  site: PublicSite
  pages?: { slug: string; title: string }[]
  seo?: { title?: string | null; description?: string | null; ogImage?: string | null }
  children: React.ReactNode
}

function navHref(item: { kind: string; target: string }): string {
  if (item.kind === 'page') return item.target === '' ? '/' : `/${item.target.replace(/^\/+/, '')}`
  if (item.kind === 'lms') return item.target || '/login'
  return item.target || '#'
}

// Public website chrome: theme CSS variables (server-rendered, no flash),
// header with nav, and footer. Used by the catch-all page, blog, and checkout.
const SiteLayout: React.FC<Props> = ({ site, pages = [], seo, children }) => {
  const theme = site.theme || {}
  const header = site.header || {}
  const footer = site.footer || {}

  const navItems =
    header.navItems && header.navItems.length > 0
      ? header.navItems
      : [
          // Default nav: published top-level pages, then LMS login when enabled
          ...pages.filter(p => p.slug !== '' && !p.slug.includes('/')).slice(0, 6).map(p => ({ label: p.title, kind: 'page' as const, target: p.slug })),
          ...(site.features?.lms ? [{ label: 'Sign In', kind: 'lms' as const, target: '/login' }] : []),
        ]

  const logoUrl = header.logoUrl || theme.logoUrl

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--site-bg)', color: 'var(--site-text)' }}>
      <Head>
        <title>{seo?.title || site.name}</title>
        {seo?.description && <meta name="description" content={seo.description} />}
        {seo?.ogImage && <meta property="og:image" content={seo.ogImage} />}
        <meta property="og:title" content={seo?.title || site.name} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          // Server-rendered theme variables so the first paint is already branded
          dangerouslySetInnerHTML={{
            __html: `:root{--color-primary:${theme.primaryColor || '#0ea5a4'};--color-secondary:${theme.secondaryColor || '#334155'};--site-bg:${theme.backgroundColor || '#ffffff'};--site-text:${theme.textColor || '#1e293b'};}`,
          }}
        />
      </Head>

      <header style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'var(--site-bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={site.name} style={{ height: 36, width: 'auto' }} />
            ) : (
              <span style={{ fontWeight: 800, fontSize: 20 }}>{site.name}</span>
            )}
          </Link>
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {navItems.map((item, i) =>
              item.kind === 'url' ? (
                <a
                  key={i}
                  href={navHref(item)}
                  target={(item as any).newTab ? '_blank' : undefined}
                  rel={(item as any).newTab ? 'noopener noreferrer' : undefined}
                  style={{ color: 'inherit', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}
                >
                  {item.label}
                </a>
              ) : (
                <Link key={i} href={navHref(item)} style={{ color: 'inherit', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 48 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 14, color: 'var(--site-text)', opacity: 0.8 }}>
          <span>{footer.text || `© ${new Date().getFullYear()} ${site.name}`}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(footer.links || []).map((l, i) => (
              <a key={i} href={l.url} style={{ color: 'inherit' }}>
                {l.label}
              </a>
            ))}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default SiteLayout
