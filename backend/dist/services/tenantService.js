"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../db/client"));
const domainSyncService_1 = require("./domainSyncService");
// If DATABASE_URL is not provided or Prisma not set up yet, fall back to in-memory
const _tenants = [
    {
        id: 'tenant_1',
        name: 'Acme Corp',
        defaultLocale: 'en',
        theme: { primaryColor: '#0ea5a4', logoUrl: '' },
        domains: [{ id: 'd1', host: 'acme.local', isPrimary: true }]
    }
];
const list = async () => {
    if (!process.env.DATABASE_URL)
        return _tenants;
    return client_1.default.tenant.findMany({ include: { domains: true } });
};
const getById = async (id) => {
    if (!process.env.DATABASE_URL)
        return _tenants.find(t => t.id === id);
    const tenant = await client_1.default.tenant.findUnique({ where: { id }, include: { domains: true } });
    return tenant || undefined;
};
const getByHost = async (host) => {
    if (!process.env.DATABASE_URL)
        return _tenants.find(t => t.domains.some(d => d.host === host));
    const domain = await client_1.default.domain.findUnique({ where: { host }, include: { tenant: true } });
    if (!domain)
        return undefined;
    const tenant = await client_1.default.tenant.findUnique({ where: { id: domain.tenantId }, include: { domains: true } });
    return tenant;
};
const create = async (data) => {
    if (!process.env.DATABASE_URL) {
        const t = {
            id: `tenant_${Date.now()}`,
            name: data.name,
            defaultLocale: data.defaultLocale || 'en',
            theme: data.theme || { primaryColor: '#0ea5a4', logoUrl: '' },
            domains: (data.domains || []).map((d, i) => ({ id: `d_${Date.now()}_${i}`, host: d.host, isPrimary: !!d.isPrimary }))
        };
        _tenants.push(t);
        return t;
    }
    // create tenant with optional domains
    const domainData = data.domains ? data.domains.map((d) => ({
        host: typeof d === 'string' ? d : d.host,
        isPrimary: typeof d === 'string' ? false : !!d.isPrimary
    })) : [];
    const tenant = await client_1.default.tenant.create({
        data: {
            name: data.name,
            defaultLocale: data.defaultLocale || 'en',
            primaryColor: data.theme?.primaryColor,
            secondaryColor: data.theme?.secondaryColor,
            logoUrl: data.theme?.logoUrl,
            domains: domainData.length > 0 ? { create: domainData } : undefined
        },
        include: { domains: true }
    });
    if (domainData.length > 0)
        void (0, domainSyncService_1.syncDomains)();
    return tenant;
};
const update = async (id, data) => {
    if (!process.env.DATABASE_URL) {
        const tenant = _tenants.find(t => t.id === id);
        if (!tenant)
            return undefined;
        if (data.name)
            tenant.name = data.name;
        if (data.defaultLocale)
            tenant.defaultLocale = data.defaultLocale;
        if (data.theme)
            tenant.theme = data.theme;
        return tenant;
    }
    const tenant = await client_1.default.tenant.update({
        where: { id },
        data: {
            name: data.name,
            defaultLocale: data.defaultLocale,
            primaryColor: data.theme?.primaryColor,
            secondaryColor: data.theme?.secondaryColor,
            logoUrl: data.theme?.logoUrl,
            certificateSignature: data.certificateSignature
        },
        include: { domains: true }
    });
    // sync domains when provided: remove missing, add new, update isPrimary
    if (data.domains) {
        const desired = data.domains.map(d => ({ host: d.host.toLowerCase().trim(), isPrimary: !!d.isPrimary }));
        const existing = await client_1.default.domain.findMany({ where: { tenantId: id } });
        const desiredHosts = new Set(desired.map(d => d.host));
        const existingByHost = new Map(existing.map(d => [d.host, d]));
        for (const d of existing) {
            if (!desiredHosts.has(d.host))
                await client_1.default.domain.delete({ where: { id: d.id } });
        }
        for (const d of desired) {
            const found = existingByHost.get(d.host);
            if (!found) {
                await client_1.default.domain.create({ data: { host: d.host, isPrimary: d.isPrimary, tenantId: id } });
            }
            else if (found.isPrimary !== d.isPrimary) {
                await client_1.default.domain.update({ where: { id: found.id }, data: { isPrimary: d.isPrimary } });
            }
        }
        void (0, domainSyncService_1.syncDomains)();
        return getById(id);
    }
    return tenant;
};
const listDomains = async (tenantId) => {
    if (!process.env.DATABASE_URL)
        return _tenants.find(t => t.id === tenantId)?.domains || [];
    return client_1.default.domain.findMany({ where: { tenantId }, orderBy: { host: 'asc' } });
};
const addDomain = async (tenantId, host, isPrimary = false) => {
    const normalized = host.toLowerCase().trim();
    if (!process.env.DATABASE_URL) {
        const tenant = _tenants.find(t => t.id === tenantId);
        if (!tenant)
            throw new Error('tenant not found');
        const d = { id: `d_${Date.now()}`, host: normalized, isPrimary };
        tenant.domains.push(d);
        return d;
    }
    const taken = await client_1.default.domain.findUnique({ where: { host: normalized } });
    if (taken)
        throw new Error('domain already in use');
    if (isPrimary) {
        await client_1.default.domain.updateMany({ where: { tenantId }, data: { isPrimary: false } });
    }
    const domain = await client_1.default.domain.create({ data: { host: normalized, isPrimary, tenantId } });
    void (0, domainSyncService_1.syncDomains)();
    return domain;
};
const removeDomain = async (tenantId, domainId) => {
    if (!process.env.DATABASE_URL) {
        const tenant = _tenants.find(t => t.id === tenantId);
        if (!tenant)
            return false;
        const idx = tenant.domains.findIndex(d => d.id === domainId);
        if (idx === -1)
            return false;
        tenant.domains.splice(idx, 1);
        return true;
    }
    const domain = await client_1.default.domain.findUnique({ where: { id: domainId } });
    if (!domain || domain.tenantId !== tenantId)
        return false;
    await client_1.default.domain.delete({ where: { id: domainId } });
    void (0, domainSyncService_1.syncDomains)();
    return true;
};
const deleteTenant = async (id) => {
    if (!process.env.DATABASE_URL) {
        const index = _tenants.findIndex(t => t.id === id);
        if (index === -1)
            return false;
        _tenants.splice(index, 1);
        return true;
    }
    const result = await client_1.default.tenant.delete({ where: { id } });
    return !!result;
};
exports.default = { list, getById, getByHost, create, update, delete: deleteTenant, listDomains, addDomain, removeDomain };
