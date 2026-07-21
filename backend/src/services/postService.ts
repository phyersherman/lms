import prisma from '../db/client'
import { emptyPageContent, validatePageContent } from '../utils/pageContent'

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

// ---- Admin ----

const listByTenant = async (tenantId: string) => {
  return prisma.post.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ created_at: 'desc' }],
    include: { categories: true },
  })
}

const getById = async (id: string) => {
  return prisma.post.findUnique({ where: { id }, include: { categories: true } })
}

const create = async (
  tenantId: string,
  data: { title: string; slug?: string; excerpt?: string; categoryIds?: string[] }
) => {
  return prisma.post.create({
    data: {
      tenant_id: tenantId,
      title: data.title,
      slug: slugify(data.slug || data.title),
      excerpt: data.excerpt || null,
      content: emptyPageContent() as any,
      categories: data.categoryIds?.length ? { connect: data.categoryIds.map(id => ({ id })) } : undefined,
    },
    include: { categories: true },
  })
}

const update = async (
  id: string,
  data: {
    title?: string
    slug?: string
    excerpt?: string | null
    content?: any
    featured?: boolean
    cover_image_url?: string | null
    categoryIds?: string[]
  }
) => {
  const clean: any = {}
  if (data.title !== undefined) clean.title = data.title
  if (data.slug !== undefined) clean.slug = slugify(data.slug)
  if (data.excerpt !== undefined) clean.excerpt = data.excerpt
  if (data.content !== undefined) clean.content = validatePageContent(data.content)
  if (data.featured !== undefined) clean.featured = !!data.featured
  if (data.cover_image_url !== undefined) clean.cover_image_url = data.cover_image_url
  if (data.categoryIds !== undefined) clean.categories = { set: data.categoryIds.map(cid => ({ id: cid })) }
  return prisma.post.update({ where: { id }, data: clean, include: { categories: true } })
}

const publish = async (id: string) => {
  return prisma.post.update({
    where: { id },
    data: { status: 'published', published_at: new Date() },
    include: { categories: true },
  })
}

const unpublish = async (id: string) => {
  return prisma.post.update({ where: { id }, data: { status: 'draft' }, include: { categories: true } })
}

const remove = async (id: string) => {
  await prisma.post.delete({ where: { id } })
  return true
}

// Categories
const listCategories = async (tenantId: string) => {
  return prisma.category.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { posts: true } } },
  })
}

const createCategory = async (tenantId: string, name: string) => {
  return prisma.category.create({ data: { tenant_id: tenantId, name, slug: slugify(name) } })
}

const deleteCategory = async (tenantId: string, categoryId: string) => {
  const cat = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!cat || cat.tenant_id !== tenantId) return false
  await prisma.category.delete({ where: { id: categoryId } })
  return true
}

// ---- Public ----

const listPublished = async (tenantId: string, opts: { categorySlug?: string; limit?: number } = {}) => {
  return prisma.post.findMany({
    where: {
      tenant_id: tenantId,
      status: 'published',
      ...(opts.categorySlug ? { categories: { some: { slug: opts.categorySlug } } } : {}),
    },
    orderBy: [{ featured: 'desc' }, { published_at: 'desc' }],
    take: opts.limit || 50,
    select: {
      slug: true, title: true, excerpt: true, featured: true,
      published_at: true, cover_image_url: true,
      categories: { select: { name: true, slug: true } },
    },
  })
}

const getPublishedBySlug = async (tenantId: string, slug: string) => {
  const post = await prisma.post.findUnique({
    where: { tenant_id_slug: { tenant_id: tenantId, slug } },
    include: { categories: { select: { name: true, slug: true } } },
  })
  if (!post || post.status !== 'published') return null
  return post
}

export default {
  listByTenant,
  getById,
  create,
  update,
  publish,
  unpublish,
  remove,
  listCategories,
  createCategory,
  deleteCategory,
  listPublished,
  getPublishedBySlug,
}
