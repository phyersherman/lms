"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetAbsolutePath = exports.assetPublicUrl = exports.deleteAsset = exports.getAsset = exports.listAssets = exports.saveAsset = exports.isAllowedMime = exports.MAX_UPLOAD_BYTES = exports.UPLOADS_DIR = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../db/client"));
// Local-disk asset storage (swap for S3 later by reimplementing this module).
// Files live under UPLOADS_DIR/<tenantId>/<random>-<safe-filename> and are
// served at /api/uploads/<tenantId>/<file>.
exports.UPLOADS_DIR = process.env.UPLOADS_DIR || path_1.default.join(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
    'application/pdf',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp4',
]);
exports.MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const isAllowedMime = (mime) => ALLOWED_MIME.has(mime);
exports.isAllowedMime = isAllowedMime;
const safeName = (filename) => filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
const saveAsset = async (tenantId, file) => {
    if (!(0, exports.isAllowedMime)(file.mimetype))
        throw new Error(`file type ${file.mimetype} not allowed`);
    if (file.buffer.length > exports.MAX_UPLOAD_BYTES)
        throw new Error('file too large (max 25 MB)');
    const relDir = tenantId;
    const name = `${crypto_1.default.randomBytes(6).toString('hex')}-${safeName(file.originalname)}`;
    const relPath = path_1.default.join(relDir, name);
    const absDir = path_1.default.join(exports.UPLOADS_DIR, relDir);
    fs_1.default.mkdirSync(absDir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(absDir, name), file.buffer);
    return client_1.default.asset.create({
        data: {
            tenant_id: tenantId,
            filename: file.originalname,
            path: relPath,
            mime: file.mimetype,
            size: file.buffer.length,
        },
    });
};
exports.saveAsset = saveAsset;
const listAssets = async (tenantId) => {
    return client_1.default.asset.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } });
};
exports.listAssets = listAssets;
const getAsset = async (assetId) => {
    return client_1.default.asset.findUnique({ where: { id: assetId } });
};
exports.getAsset = getAsset;
const deleteAsset = async (tenantId, assetId) => {
    const asset = await client_1.default.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.tenant_id !== tenantId)
        return false;
    try {
        fs_1.default.unlinkSync(path_1.default.join(exports.UPLOADS_DIR, asset.path));
    }
    catch {
        // file already gone — still remove the record
    }
    await client_1.default.asset.delete({ where: { id: assetId } });
    return true;
};
exports.deleteAsset = deleteAsset;
const assetPublicUrl = (asset) => `/api/uploads/${asset.path.split(path_1.default.sep).join('/')}`;
exports.assetPublicUrl = assetPublicUrl;
const assetAbsolutePath = (asset) => path_1.default.join(exports.UPLOADS_DIR, asset.path);
exports.assetAbsolutePath = assetAbsolutePath;
exports.default = { saveAsset: exports.saveAsset, listAssets: exports.listAssets, getAsset: exports.getAsset, deleteAsset: exports.deleteAsset, assetPublicUrl: exports.assetPublicUrl, assetAbsolutePath: exports.assetAbsolutePath, UPLOADS_DIR: exports.UPLOADS_DIR };
