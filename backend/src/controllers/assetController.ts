import { Request, Response } from 'express'
import storageService from '../services/storageService'

const upload = async (req: Request, res: Response) => {
  const file = (req as any).file as { originalname: string; mimetype: string; buffer: Buffer } | undefined
  if (!file) return res.status(400).json({ error: 'file required (multipart field "file")' })
  try {
    const asset = await storageService.saveAsset(req.params.tenantId as string, file)
    res.status(201).json({ ...asset, url: storageService.assetPublicUrl(asset) })
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'upload failed' })
  }
}

const list = async (req: Request, res: Response) => {
  const assets = await storageService.listAssets(req.params.tenantId as string)
  res.json(assets.map(a => ({ ...a, url: storageService.assetPublicUrl(a) })))
}

const remove = async (req: Request, res: Response) => {
  const ok = await storageService.deleteAsset(req.params.tenantId as string, req.params.assetId as string)
  if (!ok) return res.status(404).json({ error: 'not found' })
  res.json({ success: true })
}

export default { upload, list, remove }
