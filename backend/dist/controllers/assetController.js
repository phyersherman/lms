"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storageService_1 = __importDefault(require("../services/storageService"));
const upload = async (req, res) => {
    const file = req.file;
    if (!file)
        return res.status(400).json({ error: 'file required (multipart field "file")' });
    try {
        const asset = await storageService_1.default.saveAsset(req.params.tenantId, file);
        res.status(201).json({ ...asset, url: storageService_1.default.assetPublicUrl(asset) });
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'upload failed' });
    }
};
const list = async (req, res) => {
    const assets = await storageService_1.default.listAssets(req.params.tenantId);
    res.json(assets.map(a => ({ ...a, url: storageService_1.default.assetPublicUrl(a) })));
};
const remove = async (req, res) => {
    const ok = await storageService_1.default.deleteAsset(req.params.tenantId, req.params.assetId);
    if (!ok)
        return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
};
exports.default = { upload, list, remove };
