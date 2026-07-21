import { Request, Response } from 'express'
import tenantService from '../services/tenantService'

const listTenants = async (_req: Request, res: Response) => {
  const tenants = await tenantService.list()
  res.json(tenants)
}

const getTenant = async (req: Request, res: Response) => {
  const t = await tenantService.getById(req.params.id as string)
  if (!t) return res.status(404).json({ error: 'not found' })
  res.json(t)
}

const createTenant = async (req: Request, res: Response) => {
  const { name, defaultLocale, theme, domains } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const t = await tenantService.create({ name, defaultLocale, theme, domains })
  res.status(201).json(t)
}

const updateTenant = async (req: Request, res: Response) => {
  const { name, defaultLocale, theme, domains, certificateSignature } = req.body
  const t = await tenantService.update(req.params.id as string, { name, defaultLocale, theme, domains, certificateSignature })
  if (!t) return res.status(404).json({ error: 'not found' })
  res.json(t)
}

const deleteTenant = async (req: Request, res: Response) => {
  const deleted = await tenantService.delete(req.params.id as string)
  if (!deleted) return res.status(404).json({ error: 'not found' })
  res.status(200).json({ success: true })
}

const listDomains = async (req: Request, res: Response) => {
  const domains = await tenantService.listDomains(req.params.id as string)
  res.json(domains)
}

const addDomain = async (req: Request, res: Response) => {
  const { host, isPrimary } = req.body
  if (!host || typeof host !== 'string') return res.status(400).json({ error: 'host required' })
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(host.trim()) && !host.trim().includes('localhost')) {
    return res.status(400).json({ error: 'invalid hostname' })
  }
  try {
    const domain = await tenantService.addDomain(req.params.id as string, host, !!isPrimary)
    res.status(201).json(domain)
  } catch (err: any) {
    res.status(409).json({ error: err.message || 'could not add domain' })
  }
}

const removeDomain = async (req: Request, res: Response) => {
  const removed = await tenantService.removeDomain(req.params.id as string, req.params.domainId as string)
  if (!removed) return res.status(404).json({ error: 'not found' })
  res.json({ success: true })
}

export default { listTenants, getTenant, createTenant, updateTenant, deleteTenant, listDomains, addDomain, removeDomain }
