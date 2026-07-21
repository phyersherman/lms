"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_DEFAULTS = void 0;
const client_1 = __importDefault(require("../db/client"));
// Tenants created before the website-builder existed have no SiteSettings row;
// they behave as LMS-only portals.
exports.LEGACY_DEFAULTS = {
    theme: null,
    header: null,
    footer: null,
    features: { lms: true, blog: false, commerce: false },
    homepage_mode: 'lms',
};
const getByTenantId = async (tenantId) => {
    return client_1.default.siteSettings.findUnique({ where: { tenant_id: tenantId } });
};
const getFeatures = async (tenantId) => {
    const settings = await getByTenantId(tenantId);
    const features = settings?.features || {};
    return { ...exports.LEGACY_DEFAULTS.features, lms: features.lms !== false, ...features };
};
const upsert = async (tenantId, data) => {
    const clean = {};
    if (data.theme !== undefined)
        clean.theme = data.theme;
    if (data.header !== undefined)
        clean.header = data.header;
    if (data.footer !== undefined)
        clean.footer = data.footer;
    if (data.features !== undefined)
        clean.features = data.features;
    if (data.homepage_mode !== undefined) {
        if (!['site', 'lms'].includes(data.homepage_mode))
            throw new Error('invalid homepage_mode');
        clean.homepage_mode = data.homepage_mode;
    }
    return client_1.default.siteSettings.upsert({
        where: { tenant_id: tenantId },
        update: clean,
        create: { tenant_id: tenantId, ...clean },
    });
};
// Public site descriptor served to the frontend for rendering a tenant's site.
const getPublicSite = async (tenantId) => {
    const [tenant, settings] = await Promise.all([
        client_1.default.tenant.findUnique({ where: { id: tenantId } }),
        getByTenantId(tenantId),
    ]);
    if (!tenant)
        return null;
    const theme = {
        primaryColor: tenant.primaryColor || '#0ea5a4',
        secondaryColor: tenant.secondaryColor || '#334155',
        logoUrl: tenant.logoUrl || '',
        ...(settings?.theme || {}),
    };
    const features = settings?.features || {};
    return {
        tenantId: tenant.id,
        name: tenant.name,
        theme,
        header: settings?.header || null,
        footer: settings?.footer || null,
        features: { ...exports.LEGACY_DEFAULTS.features, lms: features.lms !== false, ...features },
        homepage_mode: settings ? settings.homepage_mode : exports.LEGACY_DEFAULTS.homepage_mode,
    };
};
exports.default = { getByTenantId, getFeatures, upsert, getPublicSite };
