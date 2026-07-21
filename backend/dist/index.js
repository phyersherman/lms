"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = __importDefault(require("./routes"));
const tenantResolver_1 = require("./middleware/tenantResolver");
const domainSyncService_1 = require("./services/domainSyncService");
const storageService_1 = require("./services/storageService");
const commerceController_1 = __importDefault(require("./controllers/commerceController"));
const csurf_1 = __importDefault(require("csurf"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
// Stripe webhooks need the raw request body for signature verification, so
// this route is mounted BEFORE express.json() (and is naturally CSRF-exempt —
// it responds before the CSRF middleware is reached).
app.post('/api/webhooks/stripe/:tenantId', express_1.default.raw({ type: 'application/json' }), (req, res) => void commerceController_1.default.webhook(req, res));
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// The app is served same-origin on every site domain (Next rewrite in dev,
// Traefik path routing in production), so CORS headers are not needed. Legacy
// cross-origin deployments can still opt in by setting FRONTEND_ORIGINS.
if (process.env.FRONTEND_ORIGINS) {
    const FRONTEND_ORIGINS = process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim());
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (FRONTEND_ORIGINS.includes(origin))
                return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    }));
    console.log('Allowed frontend origins:', FRONTEND_ORIGINS);
}
app.use((0, cookie_parser_1.default)());
// CSRF protection using double-submit cookie via `csurf`.
// We'll expose a `/api/csrf-token` endpoint that returns a token the client should send
// in the `X-CSRF-Token` header for state-changing requests.
const csrfMiddleware = (0, csurf_1.default)({ cookie: { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } });
// Route to fetch CSRF token (unprotected so client can obtain a token before auth)
app.get('/api/csrf-token', csrfMiddleware, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
// Apply CSRF protection to non-auth POST/PUT/DELETE endpoints. We skip login/register so users
// can obtain a token and login without being blocked on first request.
// Also skip public endpoints which should be accessible without CSRF.
app.use((req, res, next) => {
    const isAuthPath = req.path.startsWith('/api/auth');
    const isPublicPath = req.path.startsWith('/api/public/');
    const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
    if (isSafeMethod || isAuthPath || isPublicPath)
        return next();
    return csrfMiddleware(req, res, next);
});
// If running behind a proxy/load-balancer, enable trust proxy for proper host resolution
app.set('trust proxy', 1);
// multi-tenant resolver middleware: sets req.tenantId
app.use(tenantResolver_1.tenantResolver);
// public uploaded assets (images, etc.) — long cache, filenames are random
app.use('/api/uploads', express_1.default.static(storageService_1.UPLOADS_DIR, { maxAge: '7d', index: false }));
app.use('/api', routes_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`LMS backend listening on port ${PORT}`);
    // regenerate Traefik routes for customer domains on boot (no-op in dev)
    void (0, domainSyncService_1.syncDomains)();
});
