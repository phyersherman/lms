import fs from 'fs'
import path from 'path'
import prisma from '../db/client'

// Regenerates the Traefik dynamic (file provider) configuration from the
// Domain table so customer domains route to the frontend + backend and get
// automatic Let's Encrypt certificates. Traefik watches the file and applies
// changes without a restart.
//
// Enabled by setting TRAEFIK_DYNAMIC_DIR (e.g. /traefik-dynamic, a volume
// shared with the traefik container). No-op otherwise (local dev).

const sanitize = (host: string) => host.replace(/[^a-z0-9]/gi, '-')

export const syncDomains = async (): Promise<void> => {
  const dir = process.env.TRAEFIK_DYNAMIC_DIR
  if (!dir || !process.env.DATABASE_URL) return

  try {
    const domains = await prisma.domain.findMany({ select: { host: true } })
    const hosts = domains.map(d => d.host).filter(Boolean)

    const config: any = { http: { routers: {}, services: {} } }

    config.http.services['sites-frontend'] = {
      loadBalancer: { servers: [{ url: process.env.FRONTEND_INTERNAL_URL || 'http://frontend:3000' }] },
    }
    config.http.services['sites-backend'] = {
      loadBalancer: { servers: [{ url: process.env.BACKEND_INTERNAL_URL || 'http://backend:4000' }] },
    }

    for (const host of hosts) {
      const key = sanitize(host)
      // HTTP -> HTTPS redirect
      config.http.routers[`site-${key}-http`] = {
        rule: `Host(\`${host}\`)`,
        entryPoints: ['web'],
        middlewares: ['redirect-to-https@docker'],
        service: 'sites-frontend',
      }
      // API on the same domain
      config.http.routers[`site-${key}-api`] = {
        rule: `Host(\`${host}\`) && PathPrefix(\`/api\`)`,
        entryPoints: ['websecure'],
        tls: { certResolver: 'letsencrypt' },
        service: 'sites-backend',
      }
      // Frontend
      config.http.routers[`site-${key}`] = {
        rule: `Host(\`${host}\`)`,
        entryPoints: ['websecure'],
        tls: { certResolver: 'letsencrypt' },
        service: 'sites-frontend',
      }
    }

    fs.mkdirSync(dir, { recursive: true })
    const target = path.join(dir, 'sites.yml')
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, toYaml(config), 'utf8')
    fs.renameSync(tmp, target) // atomic swap so traefik never reads a partial file
    console.log(`[domainSync] wrote ${hosts.length} domain route(s) to ${target}`)
  } catch (err) {
    console.error('[domainSync] failed to sync domains:', err)
  }
}

// Minimal YAML serializer for the plain-object config shape above
// (strings, arrays of strings/objects, nested objects — no anchors/refs).
function toYaml(value: any, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          const body = toYaml(item, indent + 2)
          const lines = body.split('\n')
          return `${pad}- ${lines[0].trim()}\n${lines.slice(1).join('\n')}`.trimEnd()
        }
        return `${pad}- ${toYaml(item)}`
      })
      .join('\n')
  }
  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  return entries
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null && !(Array.isArray(v) && v.length === 0) && Object.keys(v).length > 0) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`
      }
      return `${pad}${k}: ${toYaml(v)}`
    })
    .join('\n')
}

function quote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

export default { syncDomains }
