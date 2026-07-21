import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import routes from './routes'
import { tenantResolver } from './middleware/tenantResolver'
import { syncDomains } from './services/domainSyncService'
import { UPLOADS_DIR } from './services/storageService'
import commerceController from './controllers/commerceController'
import csurf from 'csurf'

const app = express()

app.use(helmet())

// Stripe webhooks need the raw request body for signature verification, so
// this route is mounted BEFORE express.json() (and is naturally CSRF-exempt —
// it responds before the CSRF middleware is reached).
app.post(
  '/api/webhooks/stripe/:tenantId',
  express.raw({ type: 'application/json' }),
  (req, res) => void commerceController.webhook(req, res)
)

// 5mb limit accommodates site-package imports (whole-site JSON documents)
app.use(express.json({ limit: '5mb' }))
app.use(morgan('dev'))

// The app is served same-origin on every site domain (Next rewrite in dev,
// Traefik path routing in production), so CORS headers are not needed. Legacy
// cross-origin deployments can still opt in by setting FRONTEND_ORIGINS.
if (process.env.FRONTEND_ORIGINS) {
  const FRONTEND_ORIGINS = process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim())
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true
  }))
  console.log('Allowed frontend origins:', FRONTEND_ORIGINS)
}
app.use(cookieParser())

// CSRF protection using double-submit cookie via `csurf`.
// We'll expose a `/api/csrf-token` endpoint that returns a token the client should send
// in the `X-CSRF-Token` header for state-changing requests.
const csrfMiddleware = csurf({ cookie: { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } })

// Route to fetch CSRF token (unprotected so client can obtain a token before auth)
app.get('/api/csrf-token', csrfMiddleware, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// Apply CSRF protection to non-auth POST/PUT/DELETE endpoints. We skip login/register so users
// can obtain a token and login without being blocked on first request.
// Also skip public endpoints which should be accessible without CSRF.
app.use((req, res, next) => {
  const isAuthPath = req.path.startsWith('/api/auth')
  const isPublicPath = req.path.startsWith('/api/public/')
  const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
  if (isSafeMethod || isAuthPath || isPublicPath) return next()
  return csrfMiddleware(req as any, res as any, next as any)
})

// If running behind a proxy/load-balancer, enable trust proxy for proper host resolution
app.set('trust proxy', 1)

// multi-tenant resolver middleware: sets req.tenantId
app.use(tenantResolver)

// public uploaded assets (images, etc.) — long cache, filenames are random
app.use('/api/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', index: false }))

app.use('/api', routes)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`LMS backend listening on port ${PORT}`)
  // regenerate Traefik routes for customer domains on boot (no-op in dev)
  void syncDomains()
})
