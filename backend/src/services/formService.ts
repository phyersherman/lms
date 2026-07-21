import prisma from '../db/client'
import emailService from './emailService'
import storageService from './storageService'
import { signDownloadToken } from '../utils/signedUrl'

export interface FormFieldDef {
  key: string
  label: string
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'tel'
  required?: boolean
  options?: string[]
  placeholder?: string
}

const listByTenant = async (tenantId: string) => {
  return prisma.form.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { submissions: true } } },
  })
}

const getById = async (id: string) => prisma.form.findUnique({ where: { id } })

const validateFields = (fields: any): FormFieldDef[] => {
  if (!Array.isArray(fields)) throw new Error('fields must be an array')
  for (const f of fields) {
    if (!f || typeof f.key !== 'string' || typeof f.label !== 'string' || typeof f.type !== 'string') {
      throw new Error('each field needs key, label and type')
    }
  }
  return fields
}

const create = async (
  tenantId: string,
  data: { name: string; kind?: string; fields: any; notify_email?: string; lead_magnet_asset_id?: string; success_message?: string; tags?: string[] }
) => {
  return prisma.form.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      kind: data.kind || 'contact',
      fields: validateFields(data.fields) as any,
      notify_email: data.notify_email || null,
      lead_magnet_asset_id: data.lead_magnet_asset_id || null,
      success_message: data.success_message || null,
      tags: data.tags || [],
    },
  })
}

const update = async (
  id: string,
  data: { name?: string; kind?: string; fields?: any; notify_email?: string | null; lead_magnet_asset_id?: string | null; success_message?: string | null; tags?: string[] }
) => {
  const clean: any = {}
  if (data.name !== undefined) clean.name = data.name
  if (data.kind !== undefined) clean.kind = data.kind
  if (data.fields !== undefined) clean.fields = validateFields(data.fields) as any
  if (data.notify_email !== undefined) clean.notify_email = data.notify_email
  if (data.lead_magnet_asset_id !== undefined) clean.lead_magnet_asset_id = data.lead_magnet_asset_id
  if (data.success_message !== undefined) clean.success_message = data.success_message
  if (data.tags !== undefined) clean.tags = data.tags
  return prisma.form.update({ where: { id }, data: clean })
}

const remove = async (id: string) => {
  await prisma.form.delete({ where: { id } })
  return true
}

const listSubmissions = async (formId: string) => {
  return prisma.formSubmission.findMany({ where: { form_id: formId }, orderBy: { created_at: 'desc' } })
}

// Public submission path: store, upsert contact, notify, deliver lead magnet.
const submit = async (
  formId: string,
  data: Record<string, any>,
  meta: { pageSlug?: string; origin?: string }
) => {
  const form = await prisma.form.findUnique({ where: { id: formId } })
  if (!form) throw Object.assign(new Error('form not found'), { statusCode: 404 })

  const fields = form.fields as unknown as FormFieldDef[]

  // Only keep declared fields; enforce required
  const clean: Record<string, any> = {}
  for (const f of fields) {
    const value = data[f.key]
    if (f.required && (value === undefined || value === null || String(value).trim() === '')) {
      throw Object.assign(new Error(`${f.label} is required`), { statusCode: 400 })
    }
    if (value !== undefined) clean[f.key] = typeof value === 'string' ? value.slice(0, 5000) : value
  }

  const submission = await prisma.formSubmission.create({
    data: {
      tenant_id: form.tenant_id,
      form_id: form.id,
      data: clean,
      page_slug: meta.pageSlug || null,
    },
  })

  // Upsert contact when an email field is present
  const emailField = fields.find(f => f.type === 'email') || fields.find(f => f.key.toLowerCase().includes('email'))
  const email = emailField ? String(clean[emailField.key] || '').trim().toLowerCase() : ''
  const nameField = fields.find(f => ['name', 'first_name', 'firstname', 'full_name'].includes(f.key.toLowerCase()))
  const name = nameField ? String(clean[nameField.key] || '').trim() : undefined

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const newTags = [...form.tags, ...(meta.pageSlug ? [`page:${meta.pageSlug || 'home'}`] : [])]
    const existing = await prisma.contact.findUnique({
      where: { tenant_id_email: { tenant_id: form.tenant_id, email } },
    })
    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          tags: Array.from(new Set([...existing.tags, ...newTags])),
        },
      })
    } else {
      await prisma.contact.create({
        data: {
          tenant_id: form.tenant_id,
          email,
          name: name || null,
          tags: Array.from(new Set(newTags)),
          source_page_slug: meta.pageSlug || null,
        },
      })
    }
  }

  // Fire-and-forget emails so slow SMTP never blocks the visitor
  void notifyAndDeliver(form, clean, email, meta).catch(err =>
    console.error('[formService] notification/delivery failed:', err?.message || err)
  )

  return { submission, successMessage: form.success_message || 'Thanks! Your submission has been received.' }
}

const notifyAndDeliver = async (
  form: { id: string; tenant_id: string; name: string; notify_email: string | null; lead_magnet_asset_id: string | null },
  data: Record<string, any>,
  submitterEmail: string,
  meta: { pageSlug?: string; origin?: string }
) => {
  const rows = Object.entries(data)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;"><b>${escapeHtml(k)}</b></td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${escapeHtml(String(v))}</td></tr>`)
    .join('')

  if (form.notify_email) {
    await emailService.sendEmail({
      to: form.notify_email,
      subject: `New "${form.name}" submission`,
      templateName: 'form-notification',
      variables: {
        formName: form.name,
        pageSlug: meta.pageSlug || '(homepage)',
        rows,
      },
      tenantId: form.tenant_id,
    })
  }

  if (form.lead_magnet_asset_id && submitterEmail) {
    const asset = await storageService.getAsset(form.lead_magnet_asset_id)
    if (asset && asset.tenant_id === form.tenant_id) {
      const token = signDownloadToken(asset.id)
      const base = meta.origin || ''
      await emailService.sendEmail({
        to: submitterEmail,
        subject: `Your download is ready`,
        templateName: 'lead-magnet',
        variables: {
          filename: asset.filename,
          downloadUrl: `${base}/api/public/downloads/${token}`,
        },
        tenantId: form.tenant_id,
      })
    }
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Contacts
const listContacts = async (tenantId: string) => {
  return prisma.contact.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } })
}

const deleteContact = async (tenantId: string, contactId: string) => {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact || contact.tenant_id !== tenantId) return false
  await prisma.contact.delete({ where: { id: contactId } })
  return true
}

export default { listByTenant, getById, create, update, remove, listSubmissions, submit, listContacts, deleteContact }
