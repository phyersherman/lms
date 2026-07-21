import React from 'react'
import { BlockNode } from '../types'

const TextDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  if (!block.content) {
    return <p style={{ color: '#999', fontStyle: 'italic' }}>Empty text block</p>
  }
  return (
    <div
      className="block-text"
      style={{ fontSize: 16, lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  )
}

export default TextDisplay
