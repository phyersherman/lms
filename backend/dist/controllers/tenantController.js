"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tenantService_1 = __importDefault(require("../services/tenantService"));
const listTenants = async (_req, res) => {
    const tenants = await tenantService_1.default.list();
    res.json(tenants);
};
const getTenant = async (req, res) => {
    const t = await tenantService_1.default.getById(req.params.id);
    if (!t)
        return res.status(404).json({ error: 'not found' });
    res.json(t);
};
const createTenant = async (req, res) => {
    const { name, defaultLocale, theme, domains } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name required' });
    const t = await tenantService_1.default.create({ name, defaultLocale, theme, domains });
    res.status(201).json(t);
};
const updateTenant = async (req, res) => {
    const { name, defaultLocale, theme, domains, certificateSignature } = req.body;
    const t = await tenantService_1.default.update(req.params.id, { name, defaultLocale, theme, domains, certificateSignature });
    if (!t)
        return res.status(404).json({ error: 'not found' });
    res.json(t);
};
const deleteTenant = async (req, res) => {
    const deleted = await tenantService_1.default.delete(req.params.id);
    if (!deleted)
        return res.status(404).json({ error: 'not found' });
    res.status(200).json({ success: true });
};
const listDomains = async (req, res) => {
    const domains = await tenantService_1.default.listDomains(req.params.id);
    res.json(domains);
};
const addDomain = async (req, res) => {
    const { host, isPrimary } = req.body;
    if (!host || typeof host !== 'string')
        return res.status(400).json({ error: 'host required' });
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(host.trim()) && !host.trim().includes('localhost')) {
        return res.status(400).json({ error: 'invalid hostname' });
    }
    try {
        const domain = await tenantService_1.default.addDomain(req.params.id, host, !!isPrimary);
        res.status(201).json(domain);
    }
    catch (err) {
        res.status(409).json({ error: err.message || 'could not add domain' });
    }
};
const removeDomain = async (req, res) => {
    const removed = await tenantService_1.default.removeDomain(req.params.id, req.params.domainId);
    if (!removed)
        return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
};
exports.default = { listTenants, getTenant, createTenant, updateTenant, deleteTenant, listDomains, addDomain, removeDomain };
