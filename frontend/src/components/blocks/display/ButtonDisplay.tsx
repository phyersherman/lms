import React from 'react'
import { BlockNode, parseConfig } from '../types'

export interface ButtonConfig {
  url?: string
  alignment?: 'left' | 'center' | 'right'
  backgroundColor?: string
  textColor?: string
  size?: 'small' | 'medium' | 'large'
  openInNewTab?: boolean
}

export const DEFAULT_BUTTON_CONFIG: ButtonConfig = {
  url: '',
  alignment: 'left',
  backgroundColor: 'var(--color-primary, #0ea5a4)',
  textColor: '#ffffff',
  size: 'medium',
  openInNewTab: false,
}

const SIZE_FONT = { small: 12, medium: 16, large: 20 } as const
const SIZE_PADDING = { small: '8px 16px', medium: '12px 24px', large: '16px 32px' } as const

const ButtonDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_BUTTON_CONFIG)
  const size = config.size || 'medium'
  return (
    <div style={{ textAlign: config.alignment || 'left' }}>
      <a
        href={config.url || '#'}
        target={config.openInNewTab ? '_blank' : '_self'}
        rel={config.openInNewTab ? 'noopener noreferrer' : undefined}
        style={{
          display: 'inline-block',
          backgroundColor: config.backgroundColor,
          color: config.textColor,
          padding: SIZE_PADDING[size],
          fontSize: SIZE_FONT[size],
          borderRadius: 6,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        {block.content || 'Button'}
      </a>
    </div>
  )
}

export default ButtonDisplay
