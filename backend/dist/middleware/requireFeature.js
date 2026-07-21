"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = void 0;
const siteSettingsService_1 = __importDefault(require("../services/siteSettingsService"));
// Gate a route group on a per-site feature flag (SiteSettings.features).
// Only applies when the request arrived on a tenant domain (tenantResolver set
// req.tenantId). Requests on the platform/admin domain — where no tenant is
// resolved from the host — pass through so platform admins can always manage
// every tenant.
const requireFeature = (feature) => {
    return async (req, res, next) => {
        try {
            if (!req.tenantId)
                return next();
            if (!process.env.DATABASE_URL)
                return next();
            const features = await siteSettingsService_1.default.getFeatures(req.tenantId);
            if (!features[feature]) {
                return res.status(404).json({ error: `${feature} is not enabled for this site` });
            }
            return next();
        }
        catch (err) {
            return next(err);
        }
    };
};
exports.requireFeature = requireFeature;
exports.default = exports.requireFeature;
