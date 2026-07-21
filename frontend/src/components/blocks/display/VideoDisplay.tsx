import React from 'react'
import { BlockNode, parseConfig } from '../types'
import { useBlockFrame } from '../frame'

export interface VideoConfig {
  title?: string
  aspectRatio?: '16:9' | '4:3'
}

export const DEFAULT_VIDEO_CONFIG: VideoConfig = { title: '', aspectRatio: '16:9' }

// Normalize YouTube (watch/shorts/live/youtu.be) and Vimeo URLs to embed URLs.
export function toEmbedUrl(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch' && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
      const m = u.pathname.match(/^\/(shorts|live|embed)\/([^/]+)/)
      if (m) return `https://www.youtube.com/embed/${m[2]}`
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean).pop()
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    if (host === 'player.vimeo.com') return url
  } catch {
    return null
  }
  return null
}

const VideoDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_VIDEO_CONFIG)
  const { fillW, fillH } = useBlockFrame()
  const fills = fillW && fillH
  const embedUrl = block.content ? toEmbedUrl(block.content) : null
  const paddingTop = config.aspectRatio === '4:3' ? '75%' : '56.25%'

  if (!block.content) {
    return (
      <div style={{ padding: fills ? 0 : '60px 20px', height: fills ? '100%' : undefined, display: fills ? 'flex' : undefined, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, color: '#999', fontStyle: 'italic', textAlign: 'center', boxSizing: 'border-box' }}>
        No video URL set
      </div>
    )
  }

  return (
    <div style={fills ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      {config.title && <h4 style={{ marginTop: 0, marginBottom: 12 }}>{config.title}</h4>}
      {embedUrl ? (
        // filling: the player tracks the container instead of a fixed aspect box
        <div style={fills ? { position: 'relative', flex: 1, minHeight: 0, borderRadius: 8, overflow: 'hidden' } : { position: 'relative', paddingTop, borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            title={config.title || 'Video'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <video controls style={fills ? { width: '100%', flex: 1, minHeight: 0, objectFit: 'contain', borderRadius: 8, backgroundColor: '#000' } : { width: '100%', maxHeight: 480, borderRadius: 8, backgroundColor: '#000' }}>
          <source src={block.content} />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  )
}

export default VideoDisplay
