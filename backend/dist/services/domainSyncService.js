"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDomains = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = __importDefault(require("../db/client"));
// Regenerates the Traefik dynamic (file provider) configuration from the
// Domain table so customer domains route to the frontend + backend and get
// automatic Let's Encrypt certificates. Traefik watches the file and applies
// changes without a restart.
//
// Enabled by setting TRAEFIK_DYNAMIC_DIR (e.g. /traefik-dynamic, a volume
// shared with the traefik container). No-op otherwise (local dev).
const sanitize = (host) => host.replace(/[^a-z0-9]/gi, '-');
const syncDomains = async () => {
    const dir = process.env.TRAEFIK_DYNAMIC_DIR;
    if (!dir || !process.env.DATABASE_URL)
        return;
    try {
        const domains = await client_1.default.domain.findMany({ select: { host: true } });
        const hosts = domains.map(d => d.host).filter(Boolean);
        const config = { http: { routers: {}, services: {} } };
        config.http.services['sites-frontend'] = {
            loadBalancer: { servers: [{ url: process.env.FRONTEND_INTERNAL_URL || 'http://frontend:3000' }] },
        };
        config.http.services['sites-backend'] = {
            loadBalancer: { servers: [{ url: process.env.BACKEND_INTERNAL_URL || 'http://backend:4000' }] },
        };
        for (const host of hosts) {
            const key = sanitize(host);
            // HTTP -> HTTPS redirect
            config.http.routers[`site-${key}-http`] = {
                rule: `Host(\`${host}\`)`,
                entryPoints: ['web'],
                middlewares: ['redirect-to-https@docker'],
                service: 'sites-frontend',
            };
            // API on the same domain
            config.http.routers[`site-${key}-api`] = {
                rule: `Host(\`${host}\`) && PathPrefix(\`/api\`)`,
                entryPoints: ['websecure'],
                tls: { certResolver: 'letsencrypt' },
                service: 'sites-backend',
            };
            // Frontend
            config.http.routers[`site-${key}`] = {
                rule: `Host(\`${host}\`)`,
                entryPoints: ['websecure'],
                tls: { certResolver: 'letsencrypt' },
                service: 'sites-frontend',
            };
        }
        fs_1.default.mkdirSync(dir, { recursive: true });
        const target = path_1.default.join(dir, 'sites.yml');
        const tmp = `${target}.tmp`;
        fs_1.default.writeFileSync(tmp, toYaml(config), 'utf8');
        fs_1.default.renameSync(tmp, target); // atomic swap so traefik never reads a partial file
        console.log(`[domainSync] wrote ${hosts.length} domain route(s) to ${target}`);
    }
    catch (err) {
        console.error('[domainSync] failed to sync domains:', err);
    }
};
exports.syncDomains = syncDomains;
// Minimal YAML serializer for the plain-object config shape above
// (strings, arrays of strings/objects, nested objects — no anchors/refs).
function toYaml(value, indent = 0) {
    const pad = '  '.repeat(indent);
    if (value === null || value === undefined)
        return 'null';
    if (typeof value === 'string')
        return quote(value);
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0)
            return '[]';
        return value
            .map(item => {
            if (typeof item === 'object' && item !== null) {
                const body = toYaml(item, indent + 2);
                const lines = body.split('\n');
                return `${pad}- ${lines[0].trim()}\n${lines.slice(1).join('\n')}`.trimEnd();
            }
            return `${pad}- ${toYaml(item)}`;
        })
            .join('\n');
    }
    const entries = Object.entries(value);
    if (entries.length === 0)
        return '{}';
    return entries
        .map(([k, v]) => {
        if (typeof v === 'object' && v !== null && !(Array.isArray(v) && v.length === 0) && Object.keys(v).length > 0) {
            return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
        }
        return `${pad}${k}: ${toYaml(v)}`;
    })
        .join('\n');
}
function quote(s) {
    return `'${s.replace(/'/g, "''")}'`;
}
exports.default = { syncDomains: exports.syncDomains };
