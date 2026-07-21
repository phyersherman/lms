import React from 'react'
import { BlockNode } from './types'
import { BLOCK_REGISTRY, BlockRenderContext } from './registry'

// Single entry point for rendering any block on any surface (public site,
// LMS course player, editor preview).
const BlockDisplay: React.FC<{ block: BlockNode; context?: BlockRenderContext }> = ({ block, context }) => {
  const def = BLOCK_REGISTRY[block.type]
  if (!def) {
    return (
      <div style={{ padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 6, fontSize: 13 }}>
        Unknown block type: {block.type}
      </div>
    )
  }
  const Display = def.Display
  return <Display block={block} context={context} />
}

export default BlockDisplay
