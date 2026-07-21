import { Request, Response } from 'express'
import postService from '../services/postService'
import siteSettingsService from '../services/siteSettingsService'
import tenantService from '../services/tenantService'

// ---- Admin ----

const listPosts = async (req: Request, res: Response) => {
  res.json(await postService.listByTenant(req.params.tenantId as string))
}

const getPost = async (req: Request, res: Response) => {
  const post = await postService.getById(req.params.postId as string)
  if (!post) return res.status(404).json({ error: 'not found' })
  res.json(post)
}

const createPost = async (req: Request, res: Response) => {
  const { title, slug, excerpt, categoryIds } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  try {
    res.status(201).json(await postService.create(req.params.tenantId as string, { title, slug, excerpt, categoryIds }))
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'a post with this slug already exists' })
    res.status(400).json({ error: err.message })
  }
}

const updatePost = async (req: Request, res: Response) => {
  const { title, slug, excerpt, content, featured, cover_image_url, categoryIds } = req.body
  try {
    res.json(await postService.update(req.params.postId as string, { title, slug, excerpt, content, featured, cover_image_url, categoryIds }))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'a post with this slug already exists' })
    res.status(400).json({ error: err.message })
  }
}

const publishPost = async (req: Request, res: Response) => {
  try {
    res.json(await postService.publish(req.params.postId as string))
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

const unpublishPost = async (req: Request, res: Response) => {
  try {
    res.json(await postService.unpublish(req.params.postId as string))
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

const deletePost = async (req: Request, res: Response) => {
  try {
    await postService.remove(req.params.postId as string)
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

const listCategories = async (req: Request, res: Response) => {
  res.json(await postService.listCategories(req.params.tenantId as string))
}

const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    res.status(201).json(await postService.createCategory(req.params.tenantId as string, name))
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'category already exists' })
    res.status(400).json({ error: err.message })
  }
}

const deleteCategory = async (req: Request, res: Response) => {
  const ok = await postService.deleteCategory(req.params.tenantId as string, req.params.categoryId as string)
  if (!ok) return res.status(404).json({ error: 'not found' })
  res.json({ success: true })
}

// ---- Public (tenant by host param or resolver; requires blog feature) ----

const resolveTenantForBlog = async (req: Request): Promise<string | null> => {
  let tenantId = req.tenantId || null
  const hostParam = typeof req.query.host === 'string' ? req.query.host.split(':')[0] : undefined
  if (hostParam) {
    const tenant = await tenantService.getByHost(hostParam)
    tenantId = tenant?.id || null
  }
  if (!tenantId) return null
  const features = await siteSettingsService.getFeatures(tenantId)
  return features.blog ? tenantId : null
}

const listPublicPosts = async (req: Request, res: Response) => {
  const tenantId = await resolveTenantForBlog(req)
  if (!tenantId) return res.status(404).json({ error: 'blog not available' })
  const categorySlug = typeof req.query.category === 'string' ? req.query.category : undefined
  const limit = req.query.limit ? Math.min(Number(req.query.limit) || 50, 100) : undefined
  const [posts, categories] = await Promise.all([
    postService.listPublished(tenantId, { categorySlug, limit }),
    postService.listCategories(tenantId),
  ])
  res.json({ posts, categories: categories.map(c => ({ name: c.name, slug: c.slug })) })
}

const getPublicPost = async (req: Request, res: Response) => {
  const tenantId = await resolveTenantForBlog(req)
  if (!tenantId) return res.status(404).json({ error: 'blog not available' })
  const post = await postService.getPublishedBySlug(tenantId, req.params.slug as string)
  if (!post) return res.status(404).json({ error: 'not found' })
  res.json({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    featured: post.featured,
    published_at: post.published_at,
    cover_image_url: post.cover_image_url,
    categories: post.categories,
  })
}

export default {
  listPosts,
  getPost,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  deletePost,
  listCategories,
  createCategory,
  deleteCategory,
  listPublicPosts,
  getPublicPost,
}
