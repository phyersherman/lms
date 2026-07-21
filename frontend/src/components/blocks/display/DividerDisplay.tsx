import React from 'react'
import { BlockNode, parseConfig } from '../types'

export interface DividerConfig {
  color?: string
  thickness?: number
  width?: 'full' | 'half' | 'quarter'
}

export const DEFAULT_DIVIDER_CONFIG: DividerConfig = { color: '#e2e8f0', thickness: 1, width: 'full' }

const WIDTHS = { full: '100%', half: '50%', quarter: '25%' } as const

const DividerDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_DIVIDER_CONFIG)
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `${config.thickness || 1}px solid ${config.color || '#e2e8f0'}`,
        width: WIDTHS[config.width || 'full'],
        margin: '8px auto',
      }}
    />
  )
}

export default DividerDisplay
