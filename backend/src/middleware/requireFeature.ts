import { Request, Response, NextFunction } from 'express'
import siteSettingsService, { SiteFeatures } from '../services/siteSettingsService'

// Gate a route group on a per-site feature flag (SiteSettings.features).
// Only applies when the request arrived on a tenant domain (tenantResolver set
// req.tenantId). Requests on the platform/admin domain — where no tenant is
// resolved from the host — pass through so platform admins can always manage
// every tenant.
export const requireFeature = (feature: keyof SiteFeatures) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenantId) return next()
      if (!process.env.DATABASE_URL) return next()
      const features = await siteSettingsService.getFeatures(req.tenantId)
      if (!features[feature]) {
        return res.status(404).json({ error: `${feature} is not enabled for this site` })
      }
      return next()
    } catch (err) {
      return next(err)
    }
  }
}

export default requireFeature
