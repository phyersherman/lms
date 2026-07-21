"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postService_1 = __importDefault(require("../services/postService"));
const siteSettingsService_1 = __importDefault(require("../services/siteSettingsService"));
const tenantService_1 = __importDefault(require("../services/tenantService"));
// ---- Admin ----
const listPosts = async (req, res) => {
    res.json(await postService_1.default.listByTenant(req.params.tenantId));
};
const getPost = async (req, res) => {
    const post = await postService_1.default.getById(req.params.postId);
    if (!post)
        return res.status(404).json({ error: 'not found' });
    res.json(post);
};
const createPost = async (req, res) => {
    const { title, slug, excerpt, categoryIds } = req.body;
    if (!title)
        return res.status(400).json({ error: 'title required' });
    try {
        res.status(201).json(await postService_1.default.create(req.params.tenantId, { title, slug, excerpt, categoryIds }));
    }
    catch (err) {
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'a post with this slug already exists' });
        res.status(400).json({ error: err.message });
    }
};
const updatePost = async (req, res) => {
    const { title, slug, excerpt, content, featured, cover_image_url, categoryIds } = req.body;
    try {
        res.json(await postService_1.default.update(req.params.postId, { title, slug, excerpt, content, featured, cover_image_url, categoryIds }));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'not found' });
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'a post with this slug already exists' });
        res.status(400).json({ error: err.message });
    }
};
const publishPost = async (req, res) => {
    try {
        res.json(await postService_1.default.publish(req.params.postId));
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
const unpublishPost = async (req, res) => {
    try {
        res.json(await postService_1.default.unpublish(req.params.postId));
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
const deletePost = async (req, res) => {
    try {
        await postService_1.default.remove(req.params.postId);
        res.json({ success: true });
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
const listCategories = async (req, res) => {
    res.json(await postService_1.default.listCategories(req.params.tenantId));
};
const createCategory = async (req, res) => {
    const { name } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name required' });
    try {
        res.status(201).json(await postService_1.default.createCategory(req.params.tenantId, name));
    }
    catch (err) {
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'category already exists' });
        res.status(400).json({ error: err.message });
    }
};
const deleteCategory = async (req, res) => {
    const ok = await postService_1.default.deleteCategory(req.params.tenantId, req.params.categoryId);
    if (!ok)
        return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
};
// ---- Public (tenant by host param or resolver; requires blog feature) ----
const resolveTenantForBlog = async (req) => {
    let tenantId = req.tenantId || null;
    const hostParam = typeof req.query.host === 'string' ? req.query.host.split(':')[0] : undefined;
    if (hostParam) {
        const tenant = await tenantService_1.default.getByHost(hostParam);
        tenantId = tenant?.id || null;
    }
    if (!tenantId)
        return null;
    const features = await siteSettingsService_1.default.getFeatures(tenantId);
    return features.blog ? tenantId : null;
};
const listPublicPosts = async (req, res) => {
    const tenantId = await resolveTenantForBlog(req);
    if (!tenantId)
        return res.status(404).json({ error: 'blog not available' });
    const categorySlug = typeof req.query.category === 'string' ? req.query.category : undefined;
    const limit = req.query.limit ? Math.min(Number(req.query.limit) || 50, 100) : undefined;
    const [posts, categories] = await Promise.all([
        postService_1.default.listPublished(tenantId, { categorySlug, limit }),
        postService_1.default.listCategories(tenantId),
    ]);
    res.json({ posts, categories: categories.map(c => ({ name: c.name, slug: c.slug })) });
};
const getPublicPost = async (req, res) => {
    const tenantId = await resolveTenantForBlog(req);
    if (!tenantId)
        return res.status(404).json({ error: 'blog not available' });
    const post = await postService_1.default.getPublishedBySlug(tenantId, req.params.slug);
    if (!post)
        return res.status(404).json({ error: 'not found' });
    res.json({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        featured: post.featured,
        published_at: post.published_at,
        cover_image_url: post.cover_image_url,
        categories: post.categories,
    });
};
exports.default = {
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
};
