import { Request, Response } from 'express'
import sitePackageService from '../services/sitePackageService'

const importPackage = async (req: Request, res: Response) => {
  const pkg = req.body?.package ?? req.body
  try {
    const summary = await sitePackageService.importPackage(req.params.tenantId as string, pkg)
    res.json(summary)
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'import failed' })
  }
}

const exportPackage = async (req: Request, res: Response) => {
  try {
    const pkg = await sitePackageService.exportPackage(req.params.tenantId as string)
    res.json(pkg)
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'export failed' })
  }
}

export default { importPackage, exportPackage }
