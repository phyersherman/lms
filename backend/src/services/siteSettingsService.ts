import prisma from '../db/client'

export interface SiteFeatures {
  lms: boolean
  blog: boolean
  commerce: boolean
}

// Tenants created before the website-builder existed have no SiteSettings row;
// they behave as LMS-only portals.
export const LEGACY_DEFAULTS = {
  theme: null,
  header: null,
  footer: null,
  features: { lms: true, blog: false, commerce: false } as SiteFeatures,
  homepage_mode: 'lms',
}

const getByTenantId = async (tenantId: string) => {
  return prisma.siteSettings.findUnique({ where: { tenant_id: tenantId } })
}

const getFeatures = async (tenantId: string): Promise<SiteFeatures> => {
  const settings = await getByTenantId(tenantId)
  const features = (settings?.features as Partial<SiteFeatures> | null) || {}
  return { ...LEGACY_DEFAULTS.features, lms: features.lms !== false, ...features }
}

const upsert = async (
  tenantId: string,
  data: { theme?: any; header?: any; footer?: any; features?: any; homepage_mode?: string }
) => {
  const clean: any = {}
  if (data.theme !== undefined) clean.theme = data.theme
  if (data.header !== undefined) clean.header = data.header
  if (data.footer !== undefined) clean.footer = data.footer
  if (data.features !== undefined) clean.features = data.features
  if (data.homepage_mode !== undefined) {
    if (!['site', 'lms'].includes(data.homepage_mode)) throw new Error('invalid homepage_mode')
    clean.homepage_mode = data.homepage_mode
  }
  return prisma.siteSettings.upsert({
    where: { tenant_id: tenantId },
    update: clean,
    create: { tenant_id: tenantId, ...clean },
  })
}

// Public site descriptor served to the frontend for rendering a tenant's site.
const getPublicSite = async (tenantId: string) => {
  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    getByTenantId(tenantId),
  ])
  if (!tenant) return null
  const theme = {
    primaryColor: tenant.primaryColor || '#0ea5a4',
    secondaryColor: tenant.secondaryColor || '#334155',
    logoUrl: tenant.logoUrl || '',
    ...((settings?.theme as object | null) || {}),
  }
  const features = (settings?.features as Partial<SiteFeatures> | null) || {}
  return {
    tenantId: tenant.id,
    name: tenant.name,
    theme,
    header: settings?.header || null,
    footer: settings?.footer || null,
    features: { ...LEGACY_DEFAULTS.features, lms: features.lms !== false, ...features },
    homepage_mode: settings ? settings.homepage_mode : LEGACY_DEFAULTS.homepage_mode,
  }
}

export default { getByTenantId, getFeatures, upsert, getPublicSite }
