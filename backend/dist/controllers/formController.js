"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const formService_1 = __importDefault(require("../services/formService"));
const storageService_1 = __importDefault(require("../services/storageService"));
const signedUrl_1 = require("../utils/signedUrl");
// ---- Admin ----
const listForms = async (req, res) => {
    res.json(await formService_1.default.listByTenant(req.params.tenantId));
};
const getForm = async (req, res) => {
    const form = await formService_1.default.getById(req.params.formId);
    if (!form)
        return res.status(404).json({ error: 'not found' });
    res.json(form);
};
const createForm = async (req, res) => {
    const { name, kind, fields, notify_email, lead_magnet_asset_id, success_message, tags } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name required' });
    try {
        const form = await formService_1.default.create(req.params.tenantId, { name, kind, fields: fields || [], notify_email, lead_magnet_asset_id, success_message, tags });
        res.status(201).json(form);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
const updateForm = async (req, res) => {
    const { name, kind, fields, notify_email, lead_magnet_asset_id, success_message, tags } = req.body;
    try {
        const form = await formService_1.default.update(req.params.formId, { name, kind, fields, notify_email, lead_magnet_asset_id, success_message, tags });
        res.json(form);
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'not found' });
        res.status(400).json({ error: err.message });
    }
};
const deleteForm = async (req, res) => {
    try {
        await formService_1.default.remove(req.params.formId);
        res.json({ success: true });
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
const listSubmissions = async (req, res) => {
    res.json(await formService_1.default.listSubmissions(req.params.formId));
};
const listContacts = async (req, res) => {
    res.json(await formService_1.default.listContacts(req.params.tenantId));
};
const deleteContact = async (req, res) => {
    const ok = await formService_1.default.deleteContact(req.params.tenantId, req.params.contactId);
    if (!ok)
        return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
};
// ---- Public ----
// Public metadata so the form block can render fields on any surface
const getPublicForm = async (req, res) => {
    const form = await formService_1.default.getById(req.params.formId);
    if (!form)
        return res.status(404).json({ error: 'not found' });
    // never leak notify_email or internal settings to the public
    res.json({ id: form.id, name: form.name, kind: form.kind, fields: form.fields, success_message: form.success_message });
};
const submitForm = async (req, res) => {
    // Honeypot: real users never fill this hidden field
    if (req.body._hp)
        return res.json({ success: true, message: 'Thanks!' });
    try {
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const origin = req.headers.host ? `${proto}://${req.headers.host}` : '';
        const { successMessage } = await formService_1.default.submit(req.params.formId, req.body.data || {}, { pageSlug: typeof req.body.pageSlug === 'string' ? req.body.pageSlug : undefined, origin });
        res.json({ success: true, message: successMessage });
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message || 'submission failed' });
    }
};
const download = async (req, res) => {
    const token = req.params.token;
    const verified = (0, signedUrl_1.verifyDownloadToken)(token);
    if (!verified)
        return res.status(410).json({ error: 'link invalid or expired' });
    const asset = await storageService_1.default.getAsset(verified.assetId);
    if (!asset)
        return res.status(404).json({ error: 'file not found' });
    res.download(storageService_1.default.assetAbsolutePath(asset), asset.filename);
};
exports.default = {
    listForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    listSubmissions,
    listContacts,
    deleteContact,
    getPublicForm,
    submitForm,
    download,
};
