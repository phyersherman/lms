import React from 'react'
import { BlockNode, parseConfig } from '../types'

export interface HeroConfig {
  subheading?: string
  kicker?: string
  backgroundColor?: string
  backgroundImageUrl?: string
  overlayOpacity?: number // 0..1, dark overlay over background image
  textColor?: string
  alignment?: 'left' | 'center' | 'right'
  height?: 'small' | 'medium' | 'large'
  buttons?: { label: string; url: string; variant?: 'solid' | 'outline' }[]
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  subheading: '',
  kicker: '',
  backgroundColor: 'var(--color-secondary, #1e293b)',
  backgroundImageUrl: '',
  overlayOpacity: 0.45,
  textColor: '#ffffff',
  alignment: 'center',
  height: 'medium',
  buttons: [],
}

const HEIGHT_PADDING = { small: '48px 24px', medium: '88px 24px', large: '140px 24px' } as const

// content = heading text
const HeroDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_HERO_CONFIG)
  const align = config.alignment || 'center'
  const hasImage = !!config.backgroundImageUrl
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: config.backgroundColor,
        backgroundImage: hasImage ? `url(${config.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {hasImage && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${config.overlayOpacity ?? 0.45})` }} />
      )}
      <div
        style={{
          position: 'relative',
          padding: HEIGHT_PADDING[config.height || 'medium'],
          textAlign: align,
          color: config.textColor,
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {config.kicker && (
          <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>
            {config.kicker}
          </p>
        )}
        <h1 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.15 }}>
          {block.content || 'Hero heading'}
        </h1>
        {config.subheading && (
          <p style={{ margin: '20px 0 0 0', fontSize: 'clamp(16px, 2.5vw, 20px)', lineHeight: 1.5, opacity: 0.92 }}>
            {config.subheading}
          </p>
        )}
        {config.buttons && config.buttons.length > 0 && (
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
            {config.buttons.map((b, i) => (
              <a
                key={i}
                href={b.url || '#'}
                style={
                  b.variant === 'outline'
                    ? { display: 'inline-block', padding: '12px 24px', borderRadius: 6, fontWeight: 600, textDecoration: 'none', color: config.textColor, border: `2px solid ${config.textColor}` }
                    : { display: 'inline-block', padding: '12px 24px', borderRadius: 6, fontWeight: 600, textDecoration: 'none', color: '#fff', background: 'var(--color-primary, #0ea5a4)' }
                }
              >
                {b.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HeroDisplay
