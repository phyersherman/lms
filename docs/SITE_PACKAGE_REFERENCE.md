# Site Package Reference

A **site package** is a single JSON document describing an entire website —
settings, theme, navigation, pages (with block content), forms, blog posts and
products. Importing a package builds the site from scratch **or updates an
existing one**: items are matched by stable identity and overwritten, anything
not mentioned in the package is left untouched.

Import/export lives in **Admin → Tenant → Website → Site Package**, or via API:

```
POST /api/tenants/:tenantId/site-package/import   { "package": { ... } }
GET  /api/tenants/:tenantId/site-package/export
```

## Identity & update semantics

| Entity     | Matched by          | On match            | Not in package |
|------------|---------------------|---------------------|----------------|
| site       | (the tenant)        | fields merged       | —              |
| domains    | `host`              | skipped (additive)  | kept           |
| pages      | `slug`              | fully overwritten   | kept           |
| forms      | `key`               | fully overwritten   | kept           |
| products   | `key`               | fully overwritten   | kept           |
| categories | `slug`              | kept                | kept           |
| posts      | `slug`              | fully overwritten   | kept           |

Nothing is ever deleted by an import. To remove a page/form/etc., delete it in
the admin UI.

## Top-level shape

```jsonc
{
  "version": 1,
  "site": {
    "name": "Acme Inc",
    "theme": { "primaryColor": "#0ea5a4", "secondaryColor": "#1e293b", "backgroundColor": "#ffffff", "textColor": "#1e293b", "logoUrl": "" },
    "header": { "logoUrl": "", "navItems": [ { "label": "Home", "kind": "page", "target": "" }, { "label": "Blog", "kind": "url", "target": "/blog" }, { "label": "Sign In", "kind": "lms", "target": "/login" } ] },
    "footer": { "text": "© 2026 Acme Inc", "links": [ { "label": "Privacy", "url": "/privacy" } ] },
    "features": { "lms": false, "blog": true, "commerce": true },
    "homepage_mode": "site"            // "site" | "lms"
  },
  "domains": [ { "host": "www.acme.com", "isPrimary": true } ],
  "forms": [ ... ],
  "products": [ ... ],
  "categories": [ { "name": "News", "slug": "news" } ],
  "pages": [ ... ],
  "posts": [ ... ]
}
```

All top-level sections are optional — a package containing only `pages` just
upserts pages.

## Pages

```jsonc
{
  "slug": "",                          // "" = homepage; reserved: admin, api, login, dashboard, course(s), blog, checkout, preview, certificates, my-courses, uploads…
  "title": "Home",
  "seo_title": "Acme — Widgets that work",
  "seo_description": "…",
  "publish": true,                     // default true; false = save as draft
  "content": { "sections": [ ... ] }
}
```

### Content tree

`content.sections[].columns[].blocks[]`. Ids are optional — the importer
generates them. Sections come in two layout modes:

**Stacked columns** (default): blocks stack vertically inside flex columns.
`widthFraction` values in a section should sum to ~1 (defaults to equal widths).

```jsonc
{
  "settings": { "backgroundColor": "#f8fafc", "paddingY": "large", "backgroundImageUrl": "", "fullWidth": false },
  "columns": [
    { "widthFraction": 0.5, "blocks": [ { "type": "text", "content": "<h2>Hello</h2><p>…</p>" } ] },
    { "widthFraction": 0.5, "blocks": [ ... ] }
  ]
}
```

**Freeform grid** (`"layout": "grid"`): blocks are placed anywhere on a
24-column grid (rows are 24 px and grow with content) and carry a `placement`
`{ x, y, w, h }` in cell units. All blocks live in a single column. On mobile
the grid collapses to a stacked column ordered by position. This is the layout
the visual editor's drag-and-resize canvas produces.

```jsonc
{
  "settings": { "layout": "grid", "minRows": 12, "paddingY": "medium" },
  "columns": [ { "widthFraction": 1, "blocks": [
    { "type": "hero",   "content": "Big headline", "placement": { "x": 0,  "y": 0, "w": 24, "h": 10 } },
    { "type": "text",   "content": "<p>Left…</p>", "placement": { "x": 0,  "y": 11, "w": 11, "h": 5 } },
    { "type": "button", "content": "Go",           "placement": { "x": 14, "y": 12, "w": 6,  "h": 2 } }
  ] } ]
}
```

### Block types

Every block is `{ "type", "content"?, "config"? }` — `config` is a **JSON
string** (stringify it).

| type          | content                | config (JSON string of)                                                                 |
|---------------|------------------------|------------------------------------------------------------------------------------------|
| `text`        | HTML                   | `{}`                                                                                     |
| `hero`        | heading text           | `{ kicker, subheading, alignment, height: small|medium|large, backgroundColor, backgroundImageUrl, overlayOpacity, textColor, buttons: [{label,url,variant:"solid"|"outline"}] }` |
| `image`       | image URL              | `{ altText, caption, alignment, maxWidth, rounded, shadow }`                             |
| `video`       | YouTube/Vimeo/file URL | `{ title, aspectRatio: "16:9"|"4:3" }`                                                   |
| `quote`       | quote text             | `{ attribution, textColor, borderColor, backgroundColor }`                               |
| `button`      | label                  | `{ url, alignment, size, backgroundColor, textColor, openInNewTab }`                     |
| `divider`     | —                      | `{ color, thickness, width: full|half|quarter }`                                         |
| `spacer`      | —                      | `{ height }` (px)                                                                        |
| `form`        | —                      | `{ "formKey": "newsletter", submitLabel, align: "left"|"center" }`                       |
| `product`     | —                      | `{ "productKey": "book-preorder", buttonLabel }`                                         |
| `blogListing` | —                      | `{ heading, limit }`                                                                     |

**Content framing (grid sections):** every block config may include a reserved
`_frame` object controlling how the content sits inside its grid container:
`{ "hAlign": "stretch|start|center|end", "vAlign": "stretch|start|center|end", "padding": 6, "fillText": false }`.
`stretch` (the default for visual blocks like hero/image/video/button/quote)
makes the element itself fill the container, so resizing the container resizes
the element. Text keeps its font size unless `fillText` is true.

**Cross-references:** form and product blocks reference package entries by
`formKey` / `productKey`; the importer resolves them to database ids (and the
exporter converts ids back to keys). Keys of forms/products already imported in
a *previous* package for the same site also resolve.

## Forms

```jsonc
{
  "key": "newsletter",                 // stable identity for updates + formKey refs
  "name": "Newsletter Signup",
  "kind": "capture",                   // capture | contact | download | custom
  "fields": [
    { "key": "first_name", "label": "First Name", "type": "text", "required": true },
    { "key": "email", "label": "Email Address", "type": "email", "required": true },
    { "key": "topic", "label": "Topic", "type": "select", "options": ["Sales", "Support"] }
  ],                                   // types: text | email | textarea | select | checkbox | tel
  "notify_email": "owner@acme.com",    // where submissions are emailed (null = none)
  "success_message": "Thanks!",
  "tags": ["newsletter"],              // applied to the contact (+ automatic page:<slug> tag)
  "lead_magnet_filename": "whitepaper.pdf"  // optional: matches an UPLOADED asset by filename;
                                            // submitters get an expiring signed download link
}
```

Binary files are **not** part of packages — upload PDFs/images in
**Website → Files** first, then reference by `lead_magnet_filename` (or by URL
for images).

## Products

```jsonc
{
  "key": "book-preorder",
  "name": "The Great Book (Signed)",
  "description": "Pre-order a personally signed copy.",
  "price_cents": 3500,
  "currency": "usd",
  "quantity_tiers": [ { "minQty": 2, "unitPriceCents": 3200 } ],
  "custom_fields": [ { "key": "personalization", "label": "Personalization Request", "type": "textarea", "required": false, "placeholder": "To [Name], …" } ],
  "policy_text": "Full refund available until shipment.",
  "image_urls": [],
  "active": true
}
```

Checkout requires the site's Stripe keys (Website → Store).

## Posts

```jsonc
{
  "slug": "first-post",
  "title": "The First Post",
  "excerpt": "One-line summary shown in listings.",
  "featured": true,
  "publish": true,                     // false = draft
  "cover_image_url": "",
  "categories": ["news"],              // category slugs (declare in "categories")
  "content": { "sections": [ ... ] }   // same tree as pages
}
```

## Import result

The import returns a summary:

```json
{ "created": { "pages": ["", "about"] }, "updated": { "forms": ["newsletter"] }, "warnings": ["page \"X\": form key \"y\" not found — form block will be empty"] }
```

Warnings never abort the import — the affected item is skipped or imported
with a placeholder, and everything else proceeds.
