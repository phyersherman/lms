import { randomUUID } from 'crypto'
import prisma from '../db/client'
import siteSettingsService from './siteSettingsService'
import tenantService from './tenantService'
import { validatePageContent, validateSlug, PageContent } from '../utils/pageContent'

// ---------------------------------------------------------------------------
// Site packages: a single JSON document describing an entire site — settings,
// theme, navigation, pages (with block content), forms, blog posts and
// products — that can be imported to build a site from scratch OR re-imported
// to update it. Idempotent upserts by stable identity:
//   pages/posts/categories -> slug        forms/products -> `key`
// Blocks reference forms/products by key ("formKey"/"productKey"); the
// importer resolves those to database ids. See docs/SITE_PACKAGE_REFERENCE.md.
// ---------------------------------------------------------------------------

export interface ImportSummary {
  created: Record<string, string[]>
  updated: Record<string, string[]>
  warnings: string[]
}

const note = (bucket: Record<string, string[]>, kind: string, name: string) => {
  bucket[kind] = bucket[kind] || []
  bucket[kind].push(name)
}

// Fill in missing ids so packages can be authored without them.
const normalizeContent = (content: any): PageContent => {
  if (!content || !Array.isArray(content.sections)) {
    throw new Error('page content must have a sections array')
  }
  for (const section of content.sections) {
    section.id = section.id || `sec-${randomUUID()}`
    if (!Array.isArray(section.columns)) throw new Error('each section needs a columns array')
    for (const column of section.columns) {
      column.id = column.id || `col-${randomUUID()}`
      if (typeof column.widthFraction !== 'number') column.widthFraction = 1 / section.columns.length
      if (!Array.isArray(column.blocks)) column.blocks = []
      for (const block of column.blocks) {
        block.id = block.id || `block-${randomUUID()}`
        if (typeof block.type !== 'string') throw new Error('each block needs a type')
      }
    }
  }
  return validatePageContent(content)
}

// Resolve formKey/productKey references inside block configs to database ids.
const resolveBlockRefs = (
  content: PageContent,
  formIdsByKey: Map<string, string>,
  productIdsByKey: Map<string, string>,
  warnings: string[],
  pageLabel: string
) => {
  for (const section of content.sections) {
    for (const column of section.columns) {
      for (const block of column.blocks) {
        if (!block.config) continue
        let config: any
        try {
          config = JSON.parse(block.config)
        } catch {
          continue
        }
        let changed = false
        if (typeof config.formKey === 'string') {
          const id = formIdsByKey.get(config.formKey)
          if (id) {
            config.formId = id
          } else {
            warnings.push(`${pageLabel}: form key "${config.formKey}" not found — form block will be empty`)
          }
          delete config.formKey
          changed = true
        }
        if (typeof config.productKey === 'string') {
          const id = productIdsByKey.get(config.productKey)
          if (id) {
            config.productId = id
          } else {
            warnings.push(`${pageLabel}: product key "${config.productKey}" not found — product block will be empty`)
          }
          delete config.productKey
          changed = true
        }
        if (changed) block.config = JSON.stringify(config)
      }
    }
  }
}

const importPackage = async (tenantId: string, pkg: any): Promise<ImportSummary> => {
  if (!pkg || typeof pkg !== 'object') throw new Error('package must be a JSON object')
  const summary: ImportSummary = { created: {}, updated: {}, warnings: [] }

  // ---- site settings + tenant branding ----
  if (pkg.site) {
    const site = pkg.site
    if (site.name || site.theme) {
      await tenantService.update(tenantId, {
        name: site.name,
        theme: site.theme
          ? { primaryColor: site.theme.primaryColor, secondaryColor: site.theme.secondaryColor, logoUrl: site.theme.logoUrl }
          : undefined,
      })
    }
    await siteSettingsService.upsert(tenantId, {
      theme: site.theme,
      header: site.header,
      footer: site.footer,
      features: site.features,
      homepage_mode: site.homepage_mode,
    })
    note(summary.updated, 'site', site.name || 'settings')
  }

  // ---- domains (additive; never removes existing) ----
  for (const d of pkg.domains || []) {
    const host = typeof d === 'string' ? d : d?.host
    if (!host) continue
    try {
      await tenantService.addDomain(tenantId, host, typeof d === 'object' && !!d.isPrimary)
      note(summary.created, 'domains', host)
    } catch (err: any) {
      if (/already/.test(err.message || '')) {
        const existing = await prisma.domain.findUnique({ where: { host: host.toLowerCase().trim() } })
        if (existing?.tenantId !== tenantId) summary.warnings.push(`domain "${host}" is attached to another site — skipped`)
      } else {
        summary.warnings.push(`domain "${host}": ${err.message}`)
      }
    }
  }

  // ---- forms (upsert by key) ----
  const formIdsByKey = new Map<string, string>()
  for (const form of pkg.forms || []) {
    if (!form?.key || !form?.name) {
      summary.warnings.push('a form entry is missing "key" or "name" — skipped')
      continue
    }
    // lead magnet can reference an already-uploaded asset by filename
    let leadMagnetId: string | null | undefined = undefined
    if (form.lead_magnet_filename !== undefined) {
      if (form.lead_magnet_filename === null) {
        leadMagnetId = null
      } else {
        const asset = await prisma.asset.findFirst({
          where: { tenant_id: tenantId, filename: form.lead_magnet_filename },
          orderBy: { created_at: 'desc' },
        })
        if (asset) leadMagnetId = asset.id
        else summary.warnings.push(`form "${form.key}": no uploaded file named "${form.lead_magnet_filename}" — upload it and re-import, or set it in the Forms admin`)
      }
    }
    const data = {
      name: form.name,
      kind: form.kind || 'contact',
      fields: form.fields || [],
      notify_email: form.notify_email ?? null,
      success_message: form.success_message ?? null,
      tags: form.tags || [],
      ...(leadMagnetId !== undefined ? { lead_magnet_asset_id: leadMagnetId } : {}),
    }
    const existing = await prisma.form.findUnique({
      where: { tenant_id_import_key: { tenant_id: tenantId, import_key: form.key } },
    })
    if (existing) {
      await prisma.form.update({ where: { id: existing.id }, data: data as any })
      formIdsByKey.set(form.key, existing.id)
      note(summary.updated, 'forms', form.key)
    } else {
      const created = await prisma.form.create({
        data: { tenant_id: tenantId, import_key: form.key, ...data } as any,
      })
      formIdsByKey.set(form.key, created.id)
      note(summary.created, 'forms', form.key)
    }
  }
  // existing forms not in this package remain available for reference
  const otherForms = await prisma.form.findMany({ where: { tenant_id: tenantId, import_key: { not: null } } })
  for (const f of otherForms) if (f.import_key && !formIdsByKey.has(f.import_key)) formIdsByKey.set(f.import_key, f.id)

  // ---- products (upsert by key) ----
  const productIdsByKey = new Map<string, string>()
  for (const product of pkg.products || []) {
    if (!product?.key || !product?.name) {
      summary.warnings.push('a product entry is missing "key" or "name" — skipped')
      continue
    }
    const data = {
      name: product.name,
      description: product.description ?? null,
      price_cents: Number(product.price_cents) || 0,
      currency: (product.currency || 'usd').toLowerCase(),
      quantity_tiers: product.quantity_tiers ?? [],
      custom_fields: product.custom_fields ?? [],
      policy_text: product.policy_text ?? null,
      image_urls: product.image_urls || [],
      active: product.active !== false,
    }
    const existing = await prisma.product.findUnique({
      where: { tenant_id_import_key: { tenant_id: tenantId, import_key: product.key } },
    })
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: data as any })
      productIdsByKey.set(product.key, existing.id)
      note(summary.updated, 'products', product.key)
    } else {
      const created = await prisma.product.create({
        data: { tenant_id: tenantId, import_key: product.key, ...data } as any,
      })
      productIdsByKey.set(product.key, created.id)
      note(summary.created, 'products', product.key)
    }
  }
  const otherProducts = await prisma.product.findMany({ where: { tenant_id: tenantId, import_key: { not: null } } })
  for (const p of otherProducts) if (p.import_key && !productIdsByKey.has(p.import_key)) productIdsByKey.set(p.import_key, p.id)

  // ---- blog categories (upsert by slug) ----
  const categoryIdsBySlug = new Map<string, string>()
  for (const cat of pkg.categories || []) {
    const name = typeof cat === 'string' ? cat : cat?.name
    if (!name) continue
    const slug = (typeof cat === 'object' && cat.slug) || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const existing = await prisma.category.findUnique({
      where: { tenant_id_slug: { tenant_id: tenantId, slug } },
    })
    if (existing) {
      categoryIdsBySlug.set(slug, existing.id)
      note(summary.updated, 'categories', slug)
    } else {
      const created = await prisma.category.create({ data: { tenant_id: tenantId, name, slug } })
      categoryIdsBySlug.set(slug, created.id)
      note(summary.created, 'categories', slug)
    }
  }

  // ---- pages (upsert by slug; replaces content) ----
  for (const page of pkg.pages || []) {
    if (!page?.title) {
      summary.warnings.push('a page entry is missing "title" — skipped')
      continue
    }
    let slug: string
    try {
      slug = validateSlug(page.slug ?? '')
    } catch (err: any) {
      summary.warnings.push(`page "${page.title}": ${err.message} — skipped`)
      continue
    }
    let content: PageContent
    try {
      content = normalizeContent(page.content || { sections: [] })
    } catch (err: any) {
      summary.warnings.push(`page "${page.title}": invalid content (${err.message}) — skipped`)
      continue
    }
    resolveBlockRefs(content, formIdsByKey, productIdsByKey, summary.warnings, `page "${page.title}"`)

    const publish = page.publish !== false // default: publish
    const shared = {
      title: page.title,
      seo_title: page.seo_title ?? null,
      seo_description: page.seo_description ?? null,
      og_image_url: page.og_image_url ?? null,
      draft_content: content as any,
      ...(publish ? { published_content: content as any, status: 'published', published_at: new Date() } : {}),
    }
    const existing = await prisma.page.findUnique({
      where: { tenant_id_slug: { tenant_id: tenantId, slug } },
    })
    if (existing) {
      await prisma.page.update({ where: { id: existing.id }, data: shared })
      note(summary.updated, 'pages', slug || '(homepage)')
    } else {
      await prisma.page.create({ data: { tenant_id: tenantId, slug, ...shared } })
      note(summary.created, 'pages', slug || '(homepage)')
    }
  }

  // ---- blog posts (upsert by slug) ----
  for (const post of pkg.posts || []) {
    if (!post?.slug || !post?.title) {
      summary.warnings.push('a post entry is missing "slug" or "title" — skipped')
      continue
    }
    let content: PageContent
    try {
      content = normalizeContent(post.content || { sections: [] })
    } catch (err: any) {
      summary.warnings.push(`post "${post.slug}": invalid content (${err.message}) — skipped`)
      continue
    }
    resolveBlockRefs(content, formIdsByKey, productIdsByKey, summary.warnings, `post "${post.slug}"`)

    const categoryIds = (post.categories || [])
      .map((slug: string) => categoryIdsBySlug.get(slug))
      .filter(Boolean) as string[]
    for (const slug of post.categories || []) {
      if (!categoryIdsBySlug.get(slug)) summary.warnings.push(`post "${post.slug}": category "${slug}" not found`)
    }

    const publish = post.publish !== false
    const shared = {
      title: post.title,
      excerpt: post.excerpt ?? null,
      content: content as any,
      featured: !!post.featured,
      cover_image_url: post.cover_image_url ?? null,
      ...(publish ? { status: 'published', published_at: new Date() } : { status: 'draft' }),
      categories: { set: categoryIds.map(id => ({ id })) },
    }
    const existing = await prisma.post.findUnique({
      where: { tenant_id_slug: { tenant_id: tenantId, slug: post.slug } },
    })
    if (existing) {
      await prisma.post.update({ where: { id: existing.id }, data: shared })
      note(summary.updated, 'posts', post.slug)
    } else {
      await prisma.post.create({
        data: {
          tenant_id: tenantId,
          slug: post.slug,
          ...shared,
          categories: { connect: categoryIds.map(id => ({ id })) },
        },
      })
      note(summary.created, 'posts', post.slug)
    }
  }

  return summary
}

// ---- export: serialize a site back to a package (ids -> keys) ----

const exportPackage = async (tenantId: string) => {
  const [tenant, settings, pages, forms, products, categories, posts, assets] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, include: { domains: true } }),
    prisma.siteSettings.findUnique({ where: { tenant_id: tenantId } }),
    prisma.page.findMany({ where: { tenant_id: tenantId }, orderBy: { slug: 'asc' } }),
    prisma.form.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'asc' } }),
    prisma.product.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'asc' } }),
    prisma.category.findMany({ where: { tenant_id: tenantId }, orderBy: { name: 'asc' } }),
    prisma.post.findMany({ where: { tenant_id: tenantId }, include: { categories: true }, orderBy: { created_at: 'asc' } }),
    prisma.asset.findMany({ where: { tenant_id: tenantId } }),
  ])
  if (!tenant) throw new Error('tenant not found')

  const assetById = new Map(assets.map(a => [a.id, a]))

  // give un-keyed forms/products stable keys derived from their names
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const formKeyById = new Map<string, string>()
  const usedFormKeys = new Set<string>()
  for (const f of forms) {
    let key = f.import_key || slugify(f.name) || f.id
    while (usedFormKeys.has(key)) key = `${key}-2`
    usedFormKeys.add(key)
    formKeyById.set(f.id, key)
    if (!f.import_key) await prisma.form.update({ where: { id: f.id }, data: { import_key: key } })
  }
  const productKeyById = new Map<string, string>()
  const usedProductKeys = new Set<string>()
  for (const p of products) {
    let key = p.import_key || slugify(p.name) || p.id
    while (usedProductKeys.has(key)) key = `${key}-2`
    usedProductKeys.add(key)
    productKeyById.set(p.id, key)
    if (!p.import_key) await prisma.product.update({ where: { id: p.id }, data: { import_key: key } })
  }

  // rewrite block refs id -> key
  const keyifyContent = (content: any) => {
    if (!content?.sections) return content
    const clone = JSON.parse(JSON.stringify(content))
    for (const section of clone.sections) {
      for (const column of section.columns || []) {
        for (const block of column.blocks || []) {
          if (!block.config) continue
          try {
            const config = JSON.parse(block.config)
            let changed = false
            if (config.formId && formKeyById.has(config.formId)) {
              config.formKey = formKeyById.get(config.formId)
              delete config.formId
              changed = true
            }
            if (config.productId && productKeyById.has(config.productId)) {
              config.productKey = productKeyById.get(config.productId)
              delete config.productId
              changed = true
            }
            if (changed) block.config = JSON.stringify(config)
          } catch {
            // leave unparseable config as-is
          }
        }
      }
    }
    return clone
  }

  return {
    version: 1,
    site: {
      name: tenant.name,
      theme: settings?.theme || {
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        logoUrl: tenant.logoUrl,
      },
      header: settings?.header || null,
      footer: settings?.footer || null,
      features: settings?.features || { lms: true, blog: false, commerce: false },
      homepage_mode: settings?.homepage_mode || 'lms',
    },
    domains: tenant.domains.map(d => ({ host: d.host, isPrimary: d.isPrimary })),
    forms: forms.map(f => ({
      key: formKeyById.get(f.id),
      name: f.name,
      kind: f.kind,
      fields: f.fields,
      notify_email: f.notify_email,
      success_message: f.success_message,
      tags: f.tags,
      ...(f.lead_magnet_asset_id && assetById.get(f.lead_magnet_asset_id)
        ? { lead_magnet_filename: assetById.get(f.lead_magnet_asset_id)!.filename }
        : {}),
    })),
    products: products.map(p => ({
      key: productKeyById.get(p.id),
      name: p.name,
      description: p.description,
      price_cents: p.price_cents,
      currency: p.currency,
      quantity_tiers: p.quantity_tiers,
      custom_fields: p.custom_fields,
      policy_text: p.policy_text,
      image_urls: p.image_urls,
      active: p.active,
    })),
    categories: categories.map(c => ({ name: c.name, slug: c.slug })),
    pages: pages.map(p => ({
      slug: p.slug,
      title: p.title,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
      og_image_url: p.og_image_url,
      publish: p.status === 'published',
      content: keyifyContent(p.status === 'published' && p.published_content ? p.published_content : p.draft_content),
    })),
    posts: posts.map(p => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      featured: p.featured,
      publish: p.status === 'published',
      cover_image_url: p.cover_image_url,
      categories: p.categories.map(c => c.slug),
      content: keyifyContent(p.content),
    })),
  }
}

export default { importPackage, exportPackage }
