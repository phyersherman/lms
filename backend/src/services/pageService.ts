import prisma from '../db/client'
import { emptyPageContent, validatePageContent, validateSlug } from '../utils/pageContent'

const listByTenant = async (tenantId: string) => {
  return prisma.page.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ slug: 'asc' }],
    select: {
      id: true, slug: true, title: true, status: true,
      published_at: true, updated_at: true, created_at: true,
    },
  })
}

const getById = async (id: string) => {
  return prisma.page.findUnique({ where: { id } })
}

const create = async (
  tenantId: string,
  data: { title: string; slug: string; seo_title?: string; seo_description?: string; content?: any }
) => {
  const slug = validateSlug(data.slug ?? '')
  const content = data.content ? validatePageContent(data.content) : emptyPageContent()
  return prisma.page.create({
    data: {
      tenant_id: tenantId,
      slug,
      title: data.title,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      draft_content: content as any,
    },
  })
}

const update = async (
  id: string,
  data: {
    title?: string
    slug?: string
    seo_title?: string | null
    seo_description?: string | null
    og_image_url?: string | null
    draft_content?: any
  }
) => {
  const clean: any = {}
  if (data.title !== undefined) clean.title = data.title
  if (data.slug !== undefined) clean.slug = validateSlug(data.slug)
  if (data.seo_title !== undefined) clean.seo_title = data.seo_title
  if (data.seo_description !== undefined) clean.seo_description = data.seo_description
  if (data.og_image_url !== undefined) clean.og_image_url = data.og_image_url
  if (data.draft_content !== undefined) clean.draft_content = validatePageContent(data.draft_content)
  return prisma.page.update({ where: { id }, data: clean })
}

const publish = async (id: string) => {
  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) return null
  return prisma.page.update({
    where: { id },
    data: {
      published_content: page.draft_content as any,
      status: 'published',
      published_at: new Date(),
    },
  })
}

const unpublish = async (id: string) => {
  return prisma.page.update({
    where: { id },
    data: { status: 'draft', published_content: undefined, published_at: null },
  })
}

const remove = async (id: string) => {
  await prisma.page.delete({ where: { id } })
  return true
}

const getPublished = async (tenantId: string, slug: string) => {
  const page = await prisma.page.findUnique({
    where: { tenant_id_slug: { tenant_id: tenantId, slug } },
  })
  if (!page || page.status !== 'published' || !page.published_content) return null
  return page
}

// Published pages for navigation menus / sitemaps.
const listPublished = async (tenantId: string) => {
  return prisma.page.findMany({
    where: { tenant_id: tenantId, status: 'published' },
    orderBy: [{ slug: 'asc' }],
    select: { slug: true, title: true, updated_at: true },
  })
}

export default { listByTenant, getById, create, update, publish, unpublish, remove, getPublished, listPublished }
