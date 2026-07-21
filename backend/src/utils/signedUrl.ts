import crypto from 'crypto'

// HMAC-signed, expiring tokens for lead-magnet download links.

const getSecret = () => {
  const secret = process.env.DOWNLOAD_LINK_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET must be set for signed download links')
  return secret
}

export const signDownloadToken = (assetId: string, ttlSeconds = 7 * 24 * 3600): string => {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${assetId}.${expires}`
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export const verifyDownloadToken = (token: string): { assetId: string } | null => {
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null
  const payload = Buffer.from(payloadB64, 'base64url').toString()
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
  const lastDot = payload.lastIndexOf('.')
  const assetId = payload.slice(0, lastDot)
  const expires = Number(payload.slice(lastDot + 1))
  if (!assetId || !expires || expires < Date.now() / 1000) return null
  return { assetId }
}
