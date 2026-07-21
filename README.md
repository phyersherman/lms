# SiteBuilder — Multi-Site Website Builder + LMS

A multi-tenant platform for hosting many websites in one app, each on its own
custom domain(s), with a Squarespace-style drag-and-drop page editor and an
optional white-label LMS per site.

## What each site can be

- **Website only** — pages, blog, forms/contacts, store
- **Website + LMS** — a public site with a course portal attached
- **LMS only** — the domain goes straight to the learner login (legacy behavior)

Per-site features are toggled in **Admin → Tenant → Website** (`lms`, `blog`,
`commerce`) along with the homepage mode.

## Feature overview

**Website builder**
- Visual editor: drag-and-drop sections, columns and blocks (@dnd-kit), inline
  rich-text editing (Tiptap), right-hand inspector, undo/redo, autosave drafts,
  explicit publish, device preview (desktop/tablet/mobile)
- Block library: hero, text, image, video (YouTube/Vimeo), quote, button,
  divider, spacer, form, product, blog listing (+ quiz inside the LMS)
- Pages with slugs, SEO meta, per-host `sitemap.xml` + `robots.txt`
- Header navigation + footer editor, per-site theme (colors/logo) served
  server-side with no flash

**Multi-site + domains**
- Host-based tenant resolution (`Domain` table); add domains in the admin UI
- In production the backend regenerates a Traefik file-provider config on every
  domain change — new domains route and get Let's Encrypt certificates (HTTP-01)
  automatically; point DNS at the server and add the domain in admin
- Same-origin `/api` on every domain (no CORS)

**Forms & contacts**
- Form builder (email capture, contact, download, custom), form block for pages
- Public submissions: honeypot + rate limiting, notification email, master
  per-site contact list with form tags + source-page tags, CSV export
- Lead magnets: upload a PDF, submissions email an HMAC-signed expiring
  download link

**Blog**
- Posts (same visual editor), categories, featured posts, cover images,
  public `/blog` listing + post pages, blog-listing block

**Commerce (Stripe)**
- Per-site Stripe keys (AES-encrypted at rest), products with volume-tier
  pricing and custom checkout fields (e.g. personalization requests)
- Hosted Stripe Checkout; signature-verified webhook per site at
  `/api/webhooks/stripe/:tenantId` marks orders paid + sends confirmation email
- Orders admin with status lifecycle (pending → paid → shipped / refunded)

**LMS (unchanged feature set, upgraded editor)**
- Courses → chapters → modules → blocks, quizzes + analytics, progress,
  enrollments (individual/bulk/CSV), certificates (PDF), registration links,
  passwordless access + magic codes, per-tenant email config (Mailgun)
- Module content editing now uses the same drag-and-drop canvas + inspector as
  the website editor

## Repo layout

- `backend/` — Express + TypeScript + Prisma (Postgres); routes → controllers →
  services. Tenant resolution in `src/middleware/tenantResolver.ts`; feature
  gating in `src/middleware/requireFeature.ts`; Traefik config generation in
  `src/services/domainSyncService.ts`.
- `frontend/` — Next.js 14 (pages router). Public sites render through
  `pages/[[...slug]].tsx` → `src/components/site/SiteLayout` →
  `src/components/blocks/` (shared block registry). Editor in
  `src/components/PageEditor/`. Admin under `pages/admin/`.

## Local development

```bash
# Postgres running locally, then:
cd backend
cp .env.example .env   # set DATABASE_URL + JWT_SECRET (+ ENCRYPTION_SECRET for Stripe/email keys)
npm install
npx prisma migrate dev
npm run dev            # :4000

cd ../frontend
npm install
npm run dev            # :3000, proxies /api to :4000
```

- The platform admin is served on `localhost` (or `PLATFORM_DOMAIN`).
- To preview a customer site locally, add an `/etc/hosts` entry (e.g.
  `127.0.0.1 demo.test`), attach `demo.test` to a tenant in the admin UI, and
  browse `http://demo.test:3000`.

## Production

`docker-compose.prod.yml`: Traefik (docker + file providers, ACME HTTP-01),
Postgres, backend, frontend. See `.env.production.example`. `BASE_DOMAIN` is the
platform/admin domain; customer domains are added per-tenant in the admin UI and
go live without a redeploy.
