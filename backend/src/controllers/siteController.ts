import { Request, Response } from 'express'
import siteSettingsService from '../services/siteSettingsService'
import pageService from '../services/pageService'
import tenantService from '../services/tenantService'

// ---- Admin: site settings ----

const getSettings = async (req: Request, res: Response) => {
  const tenantId = req.params.tenantId as string
  const settings = await siteSettingsService.getByTenantId(tenantId)
  res.json(settings || null)
}

const updateSettings = async (req: Request, res: Response) => {
  const tenantId = req.params.tenantId as string
  const { theme, header, footer, features, homepage_mode } = req.body
  try {
    const settings = await siteSettingsService.upsert(tenantId, { theme, header, footer, features, homepage_mode })
    res.json(settings)
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'invalid settings' })
  }
}

// ---- Admin: pages ----

const listPages = async (req: Request, res: Response) => {
  const pages = await pageService.listByTenant(req.params.tenantId as string)
  res.json(pages)
}

const getPage = async (req: Request, res: Response) => {
  const page = await pageService.getById(req.params.pageId as string)
  if (!page) return res.status(404).json({ error: 'not found' })
  res.json(page)
}

const createPage = async (req: Request, res: Response) => {
  const { title, slug, seo_title, seo_description, content } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  try {
    const page = await pageService.create(req.params.tenantId as string, { title, slug: slug ?? '', seo_title, seo_description, content })
    res.status(201).json(page)
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'a page with this slug already exists' })
    res.status(400).json({ error: err.message || 'could not create page' })
  }
}

const updatePage = async (req: Request, res: Response) => {
  const { title, slug, seo_title, seo_description, og_image_url, draft_content } = req.body
  try {
    const page = await pageService.update(req.params.pageId as string, { title, slug, seo_title, seo_description, og_image_url, draft_content })
    res.json(page)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'a page with this slug already exists' })
    res.status(400).json({ error: err.message || 'could not update page' })
  }
}

const publishPage = async (req: Request, res: Response) => {
  const page = await pageService.publish(req.params.pageId as string)
  if (!page) return res.status(404).json({ error: 'not found' })
  res.json(page)
}

const unpublishPage = async (req: Request, res: Response) => {
  try {
    const page = await pageService.unpublish(req.params.pageId as string)
    res.json(page)
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

const deletePage = async (req: Request, res: Response) => {
  try {
    await pageService.remove(req.params.pageId as string)
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

// ---- Public: site + page resolution by host ----

// GET /public/site-page?slug=about[&host=example.com]
// Host normally comes from the request (tenantResolver); the explicit `host`
// query param is used by the Next.js server rendering pages over the internal
// Docker network, where the original Host header isn't preserved.
const getPublicSitePage = async (req: Request, res: Response) => {
  let tenantId = req.tenantId
  const hostParam = typeof req.query.host === 'string' ? req.query.host.split(':')[0] : undefined
  if (hostParam) {
    const tenant = await tenantService.getByHost(hostParam)
    tenantId = tenant?.id
  }
  if (!tenantId) return res.status(404).json({ error: 'no site configured for this domain' })

  const site = await siteSettingsService.getPublicSite(tenantId)
  if (!site) return res.status(404).json({ error: 'no site configured for this domain' })

  const slug = typeof req.query.slug === 'string' ? req.query.slug.replace(/^\/+|\/+$/g, '') : ''
  const [page, pages] = await Promise.all([
    pageService.getPublished(tenantId, slug),
    pageService.listPublished(tenantId),
  ])

  res.json({
    site,
    pages,
    page: page
      ? {
          id: page.id,
          slug: page.slug,
          title: page.title,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          og_image_url: page.og_image_url,
          content: page.published_content,
        }
      : null,
  })
}

export default {
  getSettings,
  updateSettings,
  listPages,
  getPage,
  createPage,
  updatePage,
  publishPage,
  unpublishPage,
  deletePage,
  getPublicSitePage,
}
