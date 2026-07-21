import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import prisma from '../db/client'

// Local-disk asset storage (swap for S3 later by reimplementing this module).
// Files live under UPLOADS_DIR/<tenantId>/<random>-<safe-filename> and are
// served at /api/uploads/<tenantId>/<file>.

export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'application/pdf',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/mp4',
])

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

export const isAllowedMime = (mime: string) => ALLOWED_MIME.has(mime)

const safeName = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)

export const saveAsset = async (tenantId: string, file: { originalname: string; mimetype: string; buffer: Buffer }) => {
  if (!isAllowedMime(file.mimetype)) throw new Error(`file type ${file.mimetype} not allowed`)
  if (file.buffer.length > MAX_UPLOAD_BYTES) throw new Error('file too large (max 25 MB)')

  const relDir = tenantId
  const name = `${crypto.randomBytes(6).toString('hex')}-${safeName(file.originalname)}`
  const relPath = path.join(relDir, name)
  const absDir = path.join(UPLOADS_DIR, relDir)
  fs.mkdirSync(absDir, { recursive: true })
  fs.writeFileSync(path.join(absDir, name), file.buffer)

  return prisma.asset.create({
    data: {
      tenant_id: tenantId,
      filename: file.originalname,
      path: relPath,
      mime: file.mimetype,
      size: file.buffer.length,
    },
  })
}

export const listAssets = async (tenantId: string) => {
  return prisma.asset.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } })
}

export const getAsset = async (assetId: string) => {
  return prisma.asset.findUnique({ where: { id: assetId } })
}

export const deleteAsset = async (tenantId: string, assetId: string) => {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!asset || asset.tenant_id !== tenantId) return false
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, asset.path))
  } catch {
    // file already gone — still remove the record
  }
  await prisma.asset.delete({ where: { id: assetId } })
  return true
}

export const assetPublicUrl = (asset: { path: string }) => `/api/uploads/${asset.path.split(path.sep).join('/')}`

export const assetAbsolutePath = (asset: { path: string }) => path.join(UPLOADS_DIR, asset.path)

export default { saveAsset, listAssets, getAsset, deleteAsset, assetPublicUrl, assetAbsolutePath, UPLOADS_DIR }
