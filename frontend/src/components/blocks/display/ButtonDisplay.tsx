import React from 'react'
import { BlockNode, parseConfig } from '../types'
import InlineText from '../../PageEditor/InlineText'
import type { EditableProps } from './HeroDisplay'

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

const ButtonDisplay: React.FC<{ block: BlockNode; editable?: EditableProps }> = ({ block, editable }) => {
  const config = parseConfig(block, DEFAULT_BUTTON_CONFIG)
  const size = config.size || 'medium'
  const style: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    padding: SIZE_PADDING[size],
    fontSize: SIZE_FONT[size],
    borderRadius: 6,
    fontWeight: 600,
    textDecoration: 'none',
  }
  return (
    <div style={{ textAlign: config.alignment || 'left' }}>
      {editable ? (
        // span in the editor so clicking edits the label instead of navigating
        <span style={style}>
          <InlineText value={block.content || ''} placeholder="Button" onChange={editable.onContent} />
        </span>
      ) : (
        <a
          href={config.url || '#'}
          target={config.openInNewTab ? '_blank' : '_self'}
          rel={config.openInNewTab ? 'noopener noreferrer' : undefined}
          style={style}
        >
          {block.content || 'Button'}
        </a>
      )}
    </div>
  )
}

export default ButtonDisplay
