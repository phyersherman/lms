// Server-side (getServerSideProps) helpers for resolving a site + page by host.
// Runs on the Next.js server, so it talks to the backend directly over the
// internal network rather than through the public /api proxy.

export interface PublicSite {
  tenantId: string
  name: string
  theme: {
    primaryColor?: string
    secondaryColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string
  }
  header: { logoUrl?: string; navItems?: { id?: string; label: string; kind: 'page' | 'url' | 'lms'; target: string; newTab?: boolean }[] } | null
  footer: { text?: string; links?: { label: string; url: string }[] } | null
  features: { lms: boolean; blog: boolean; commerce: boolean }
  homepage_mode: 'site' | 'lms' | string
}

export interface PublicPage {
  id: string
  slug: string
  title: string
  seo_title?: string | null
  seo_description?: string | null
  og_image_url?: string | null
  content: any
}

export interface SitePageResponse {
  site: PublicSite
  pages: { slug: string; title: string }[]
  page: PublicPage | null
}

const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.BACKEND_URL || 'http://localhost:4000'

export async function fetchSitePage(host: string, slug: string): Promise<SitePageResponse | null> {
  try {
    const url = `${INTERNAL_API}/api/public/site-page?host=${encodeURIComponent(host)}&slug=${encodeURIComponent(slug)}`
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as SitePageResponse
  } catch {
    return null
  }
}

export interface PublicPostSummary {
  slug: string
  title: string
  excerpt: string | null
  featured: boolean
  published_at: string | null
  cover_image_url: string | null
  categories: { name: string; slug: string }[]
}

export async function fetchPosts(host: string, category?: string): Promise<{ posts: PublicPostSummary[]; categories: { name: string; slug: string }[] } | null> {
  try {
    const url = `${INTERNAL_API}/api/public/posts?host=${encodeURIComponent(host)}${category ? `&category=${encodeURIComponent(category)}` : ''}`
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchPost(host: string, slug: string): Promise<(PublicPostSummary & { content: any }) | null> {
  try {
    const res = await fetch(`${INTERNAL_API}/api/public/posts/${encodeURIComponent(slug)}?host=${encodeURIComponent(host)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function isPlatformHost(host: string): boolean {
  const platform = (process.env.PLATFORM_DOMAIN || 'localhost').split(':')[0]
  const bare = host.split(':')[0]
  return bare === platform || bare === `www.${platform}` || bare === '127.0.0.1'
}
