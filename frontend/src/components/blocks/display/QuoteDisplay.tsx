import React from 'react'
import { BlockNode, parseConfig } from '../types'
import InlineText from '../../PageEditor/InlineText'
import type { EditableProps } from './HeroDisplay'

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

const QuoteDisplay: React.FC<{ block: BlockNode; editable?: EditableProps }> = ({ block, editable }) => {
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
      <p style={{ fontSize: 18, margin: config.attribution || editable ? '0 0 16px 0' : 0 }}>
        {editable ? (
          <InlineText value={block.content || ''} placeholder="Quote text" onChange={editable.onContent} />
        ) : (
          block.content || 'No quote provided'
        )}
      </p>
      {(config.attribution || editable) && (
        <footer style={{ fontSize: 14, opacity: 0.8, textAlign: 'right', fontStyle: 'normal' }}>
          —{' '}
          {editable ? (
            <InlineText value={config.attribution || ''} placeholder="Attribution" onChange={v => editable.onConfigPatch({ attribution: v })} />
          ) : (
            config.attribution
          )}
        </footer>
      )}
    </blockquote>
  )
}

export default QuoteDisplay
