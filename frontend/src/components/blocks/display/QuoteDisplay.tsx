import React from 'react'
import { BlockNode, parseConfig } from '../types'

export interface QuoteConfig {
  attribution?: string
  textColor?: string
  borderColor?: string
  backgroundColor?: string
}

export const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  attribution: '',
  textColor: '#333',
  borderColor: 'var(--color-primary, #0ea5a4)',
  backgroundColor: '#f9fffe',
}

const QuoteDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_QUOTE_CONFIG)
  return (
    <blockquote
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        padding: 24,
        margin: 0,
        borderRadius: 4,
        fontStyle: 'italic',
        lineHeight: 1.8,
      }}
    >
      <p style={{ fontSize: 18, margin: config.attribution ? '0 0 16px 0' : 0 }}>
        {block.content || 'No quote provided'}
      </p>
      {config.attribution && (
        <footer style={{ fontSize: 14, opacity: 0.8, textAlign: 'right', fontStyle: 'normal' }}>
          — {config.attribution}
        </footer>
      )}
    </blockquote>
  )
}

export default QuoteDisplay
