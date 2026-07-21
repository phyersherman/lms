import React from 'react'
import { BlockNode, parseConfig } from '../types'

export interface SpacerConfig {
  height?: number // px
}

export const DEFAULT_SPACER_CONFIG: SpacerConfig = { height: 40 }

const SpacerDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_SPACER_CONFIG)
  return <div style={{ height: config.height || 40 }} aria-hidden="true" />
}

export default SpacerDisplay
