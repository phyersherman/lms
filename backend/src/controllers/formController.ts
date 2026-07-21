import { Request, Response } from 'express'
import formService from '../services/formService'
import storageService from '../services/storageService'
import { verifyDownloadToken } from '../utils/signedUrl'

// ---- Admin ----

const listForms = async (req: Request, res: Response) => {
  res.json(await formService.listByTenant(req.params.tenantId as string))
}

const getForm = async (req: Request, res: Response) => {
  const form = await formService.getById(req.params.formId as string)
  if (!form) return res.status(404).json({ error: 'not found' })
  res.json(form)
}

const createForm = async (req: Request, res: Response) => {
  const { name, kind, fields, notify_email, lead_magnet_asset_id, success_message, tags } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const form = await formService.create(req.params.tenantId as string, { name, kind, fields: fields || [], notify_email, lead_magnet_asset_id, success_message, tags })
    res.status(201).json(form)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

const updateForm = async (req: Request, res: Response) => {
  const { name, kind, fields, notify_email, lead_magnet_asset_id, success_message, tags } = req.body
  try {
    const form = await formService.update(req.params.formId as string, { name, kind, fields, notify_email, lead_magnet_asset_id, success_message, tags })
    res.json(form)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' })
    res.status(400).json({ error: err.message })
  }
}

const deleteForm = async (req: Request, res: Response) => {
  try {
    await formService.remove(req.params.formId as string)
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}

const listSubmissions = async (req: Request, res: Response) => {
  res.json(await formService.listSubmissions(req.params.formId as string))
}

const listContacts = async (req: Request, res: Response) => {
  res.json(await formService.listContacts(req.params.tenantId as string))
}

const deleteContact = async (req: Request, res: Response) => {
  const ok = await formService.deleteContact(req.params.tenantId as string, req.params.contactId as string)
  if (!ok) return res.status(404).json({ error: 'not found' })
  res.json({ success: true })
}

// ---- Public ----

// Public metadata so the form block can render fields on any surface
const getPublicForm = async (req: Request, res: Response) => {
  const form = await formService.getById(req.params.formId as string)
  if (!form) return res.status(404).json({ error: 'not found' })
  // never leak notify_email or internal settings to the public
  res.json({ id: form.id, name: form.name, kind: form.kind, fields: form.fields, success_message: form.success_message })
}

const submitForm = async (req: Request, res: Response) => {
  // Honeypot: real users never fill this hidden field
  if (req.body._hp) return res.json({ success: true, message: 'Thanks!' })
  try {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https'
    const origin = req.headers.host ? `${proto}://${req.headers.host}` : ''
    const { successMessage } = await formService.submit(
      req.params.formId as string,
      req.body.data || {},
      { pageSlug: typeof req.body.pageSlug === 'string' ? req.body.pageSlug : undefined, origin }
    )
    res.json({ success: true, message: successMessage })
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'submission failed' })
  }
}

const download = async (req: Request, res: Response) => {
  const token = req.params.token as string
  const verified = verifyDownloadToken(token)
  if (!verified) return res.status(410).json({ error: 'link invalid or expired' })
  const asset = await storageService.getAsset(verified.assetId)
  if (!asset) return res.status(404).json({ error: 'file not found' })
  res.download(storageService.assetAbsolutePath(asset), asset.filename)
}

export default {
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  listSubmissions,
  listContacts,
  deleteContact,
  getPublicForm,
  submitForm,
  download,
}
