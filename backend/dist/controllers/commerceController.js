"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commerceService_1 = __importDefault(require("../services/commerceService"));
const siteSettingsService_1 = __importDefault(require("../services/siteSettingsService"));
// ---- Admin ----
const getConfig = async (req, res) => {
    res.json(await commerceService_1.default.getConfigSafe(req.params.tenantId));
};
const updateConfig = async (req, res) => {
    const { stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, currency } = req.body;
    try {
        res.json(await commerceService_1.default.upsertConfig(req.params.tenantId, { stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, currency }));
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
const listProducts = async (req, res) => {
    res.json(await commerceService_1.default.listProducts(req.params.tenantId));
};
const createProduct = async (req, res) => {
    if (!req.body.name)
        return res.status(400).json({ error: 'name required' });
    try {
        res.status(201).json(await commerceService_1.default.createProduct(req.params.tenantId, req.body));
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
const updateProduct = async (req, res) => {
    try {
        res.json(await commerceService_1.default.updateProduct(req.params.productId, req.body));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'not found' });
        res.status(400).json({ error: err.message });
    }
};
const deleteProduct = async (req, res) => {
    try {
        await commerceService_1.default.deleteProduct(req.params.productId);
        res.json({ success: true });
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
};
const listOrders = async (req, res) => {
    res.json(await commerceService_1.default.listOrders(req.params.tenantId));
};
const updateOrderStatus = async (req, res) => {
    try {
        const order = await commerceService_1.default.updateOrderStatus(req.params.tenantId, req.params.orderId, req.body.status);
        if (!order)
            return res.status(404).json({ error: 'not found' });
        res.json(order);
    }
    catch (err) {
        res.status(err.statusCode || 400).json({ error: err.message });
    }
};
// ---- Public ----
const commerceEnabled = async (tenantId) => {
    const features = await siteSettingsService_1.default.getFeatures(tenantId);
    return features.commerce;
};
const getPublicProduct = async (req, res) => {
    const product = await commerceService_1.default.getProduct(req.params.productId);
    if (!product || !product.active)
        return res.status(404).json({ error: 'not found' });
    if (!(await commerceEnabled(product.tenant_id)))
        return res.status(404).json({ error: 'not found' });
    res.json({
        id: product.id,
        name: product.name,
        description: product.description,
        price_cents: product.price_cents,
        currency: product.currency,
        quantity_tiers: product.quantity_tiers,
        custom_fields: product.custom_fields,
        policy_text: product.policy_text,
        image_urls: product.image_urls,
    });
};
const checkout = async (req, res) => {
    const { productId, quantity, email, customData } = req.body;
    if (!productId)
        return res.status(400).json({ error: 'productId required' });
    try {
        const product = await commerceService_1.default.getProduct(productId);
        if (!product || !(await commerceEnabled(product.tenant_id)))
            return res.status(404).json({ error: 'not found' });
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const origin = req.headers.host ? `${proto}://${req.headers.host}` : '';
        const result = await commerceService_1.default.createCheckout(productId, { quantity, email, customData, origin });
        res.json(result);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message || 'checkout failed' });
    }
};
// Raw-body Stripe webhook (mounted before express.json in index.ts)
const webhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature)
        return res.status(400).json({ error: 'missing signature' });
    try {
        const result = await commerceService_1.default.handleWebhook(req.params.tenantId, req.body, signature);
        res.json(result);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};
exports.default = {
    getConfig,
    updateConfig,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listOrders,
    updateOrderStatus,
    getPublicProduct,
    checkout,
    webhook,
};
