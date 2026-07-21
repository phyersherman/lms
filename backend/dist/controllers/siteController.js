"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const siteSettingsService_1 = __importDefault(require("../services/siteSettingsService"));
const pageService_1 = __importDefault(require("../services/pageService"));
const tenantService_1 = __importDefault(require("../services/tenantService"));
// ---- Admin: site settings ----
const getSettings = async (req, res) => {
    const tenantId = req.params.tenantId;
    const settings = await siteSettingsService_1.default.getByTenantId(tenantId);
    res.json(settings || null);
};
const updateSettings = async (req, res) => {
    const tenantId = req.params.tenantId;
    const { theme, header, footer, features, homepage_mode } = req.body;
    try {
        const settings = await siteSettingsService_1.default.upsert(tenantId, { theme, header, footer, features, homepage_mode });
        res.json(settings);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'invalid settings' });
    }
};
// ---- Admin: pages ----
const listPages = async (req, res) => {
    const pages = await pageService_1.default.listByTenant(req.params.tenantId);
    res.json(pages);
};
const getPage = async (req, res) => {
    const page = await pageService_1.default.getById(req.params.pageId);
    if (!page)
        return res.status(404).json({ error: 'not found' });
    res.json(page);
};
const createPage = async (req, res) => {
    const { title, slug, seo_title, seo_description, content } = req.body;
    if (!title)
        return res.status(400).json({ error: 'title required' });
    try {
        const page = await pageService_1.default.create(req.params.tenantId, { title, slug: slug ?? '', seo_title, seo_description, content });
        res.status(201).json(page);
    }
    catch (err) {
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'a page with this slug already exists' });
        res.status(400).json({ error: err.message || 'could not create page' });
    }
};
const updatePage = async (req, res) => {
    const { title, slug, seo_title, seo_description, og_image_url, draft_content } = req.body;
    try {
        const page = await pageService_1.default.update(req.params.pageId, { title, slug, seo_title, seo_description, og_image_url, draft_content });
        res.json(page);
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'not found' });
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'a page with this slug already exists' });
        res.status(400).json({ error: err.message || 'could not update page' });
    }
};
const publishPage = async (req, res) => {
    const page = await pageService_1.default.publish(req.params.pageId);
    if (!page)
        return res.status(404).json({ error: 'not found' });
    res.json(page);
};
const unpublishPage = async (req, res) => {
    try {
        const page = await pageService_1.default.unpublish(req.params.pageId);
        res.json(page);
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
const deletePage = async (req, res) => {
    try {
        await pageService_1.default.remove(req.params.pageId);
        res.json({ success: true });
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
// ---- Public: site + page resolution by host ----
// GET /public/site-page?slug=about[&host=example.com]
// Host normally comes from the request (tenantResolver); the explicit `host`
// query param is used by the Next.js server rendering pages over the internal
// Docker network, where the original Host header isn't preserved.
const getPublicSitePage = async (req, res) => {
    let tenantId = req.tenantId;
    const hostParam = typeof req.query.host === 'string' ? req.query.host.split(':')[0] : undefined;
    if (hostParam) {
        const tenant = await tenantService_1.default.getByHost(hostParam);
        tenantId = tenant?.id;
    }
    if (!tenantId)
        return res.status(404).json({ error: 'no site configured for this domain' });
    const site = await siteSettingsService_1.default.getPublicSite(tenantId);
    if (!site)
        return res.status(404).json({ error: 'no site configured for this domain' });
    const slug = typeof req.query.slug === 'string' ? req.query.slug.replace(/^\/+|\/+$/g, '') : '';
    const [page, pages] = await Promise.all([
        pageService_1.default.getPublished(tenantId, slug),
        pageService_1.default.listPublished(tenantId),
    ]);
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
    });
};
exports.default = {
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
};
