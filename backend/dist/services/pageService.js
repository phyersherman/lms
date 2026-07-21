"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../db/client"));
const pageContent_1 = require("../utils/pageContent");
const listByTenant = async (tenantId) => {
    return client_1.default.page.findMany({
        where: { tenant_id: tenantId },
        orderBy: [{ slug: 'asc' }],
        select: {
            id: true, slug: true, title: true, status: true,
            published_at: true, updated_at: true, created_at: true,
        },
    });
};
const getById = async (id) => {
    return client_1.default.page.findUnique({ where: { id } });
};
const create = async (tenantId, data) => {
    const slug = (0, pageContent_1.validateSlug)(data.slug ?? '');
    const content = data.content ? (0, pageContent_1.validatePageContent)(data.content) : (0, pageContent_1.emptyPageContent)();
    return client_1.default.page.create({
        data: {
            tenant_id: tenantId,
            slug,
            title: data.title,
            seo_title: data.seo_title,
            seo_description: data.seo_description,
            draft_content: content,
        },
    });
};
const update = async (id, data) => {
    const clean = {};
    if (data.title !== undefined)
        clean.title = data.title;
    if (data.slug !== undefined)
        clean.slug = (0, pageContent_1.validateSlug)(data.slug);
    if (data.seo_title !== undefined)
        clean.seo_title = data.seo_title;
    if (data.seo_description !== undefined)
        clean.seo_description = data.seo_description;
    if (data.og_image_url !== undefined)
        clean.og_image_url = data.og_image_url;
    if (data.draft_content !== undefined)
        clean.draft_content = (0, pageContent_1.validatePageContent)(data.draft_content);
    return client_1.default.page.update({ where: { id }, data: clean });
};
const publish = async (id) => {
    const page = await client_1.default.page.findUnique({ where: { id } });
    if (!page)
        return null;
    return client_1.default.page.update({
        where: { id },
        data: {
            published_content: page.draft_content,
            status: 'published',
            published_at: new Date(),
        },
    });
};
const unpublish = async (id) => {
    return client_1.default.page.update({
        where: { id },
        data: { status: 'draft', published_content: undefined, published_at: null },
    });
};
const remove = async (id) => {
    await client_1.default.page.delete({ where: { id } });
    return true;
};
const getPublished = async (tenantId, slug) => {
    const page = await client_1.default.page.findUnique({
        where: { tenant_id_slug: { tenant_id: tenantId, slug } },
    });
    if (!page || page.status !== 'published' || !page.published_content)
        return null;
    return page;
};
// Published pages for navigation menus / sitemaps.
const listPublished = async (tenantId) => {
    return client_1.default.page.findMany({
        where: { tenant_id: tenantId, status: 'published' },
        orderBy: [{ slug: 'asc' }],
        select: { slug: true, title: true, updated_at: true },
    });
};
exports.default = { listByTenant, getById, create, update, publish, unpublish, remove, getPublished, listPublished };
