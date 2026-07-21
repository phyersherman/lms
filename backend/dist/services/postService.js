"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../db/client"));
const pageContent_1 = require("../utils/pageContent");
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
// ---- Admin ----
const listByTenant = async (tenantId) => {
    return client_1.default.post.findMany({
        where: { tenant_id: tenantId },
        orderBy: [{ created_at: 'desc' }],
        include: { categories: true },
    });
};
const getById = async (id) => {
    return client_1.default.post.findUnique({ where: { id }, include: { categories: true } });
};
const create = async (tenantId, data) => {
    return client_1.default.post.create({
        data: {
            tenant_id: tenantId,
            title: data.title,
            slug: slugify(data.slug || data.title),
            excerpt: data.excerpt || null,
            content: (0, pageContent_1.emptyPageContent)(),
            categories: data.categoryIds?.length ? { connect: data.categoryIds.map(id => ({ id })) } : undefined,
        },
        include: { categories: true },
    });
};
const update = async (id, data) => {
    const clean = {};
    if (data.title !== undefined)
        clean.title = data.title;
    if (data.slug !== undefined)
        clean.slug = slugify(data.slug);
    if (data.excerpt !== undefined)
        clean.excerpt = data.excerpt;
    if (data.content !== undefined)
        clean.content = (0, pageContent_1.validatePageContent)(data.content);
    if (data.featured !== undefined)
        clean.featured = !!data.featured;
    if (data.cover_image_url !== undefined)
        clean.cover_image_url = data.cover_image_url;
    if (data.categoryIds !== undefined)
        clean.categories = { set: data.categoryIds.map(cid => ({ id: cid })) };
    return client_1.default.post.update({ where: { id }, data: clean, include: { categories: true } });
};
const publish = async (id) => {
    return client_1.default.post.update({
        where: { id },
        data: { status: 'published', published_at: new Date() },
        include: { categories: true },
    });
};
const unpublish = async (id) => {
    return client_1.default.post.update({ where: { id }, data: { status: 'draft' }, include: { categories: true } });
};
const remove = async (id) => {
    await client_1.default.post.delete({ where: { id } });
    return true;
};
// Categories
const listCategories = async (tenantId) => {
    return client_1.default.category.findMany({
        where: { tenant_id: tenantId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { posts: true } } },
    });
};
const createCategory = async (tenantId, name) => {
    return client_1.default.category.create({ data: { tenant_id: tenantId, name, slug: slugify(name) } });
};
const deleteCategory = async (tenantId, categoryId) => {
    const cat = await client_1.default.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.tenant_id !== tenantId)
        return false;
    await client_1.default.category.delete({ where: { id: categoryId } });
    return true;
};
// ---- Public ----
const listPublished = async (tenantId, opts = {}) => {
    return client_1.default.post.findMany({
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
    });
};
const getPublishedBySlug = async (tenantId, slug) => {
    const post = await client_1.default.post.findUnique({
        where: { tenant_id_slug: { tenant_id: tenantId, slug } },
        include: { categories: { select: { name: true, slug: true } } },
    });
    if (!post || post.status !== 'published')
        return null;
    return post;
};
exports.default = {
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
};
