import React from 'react'
import { BlockNode } from '../types'
import { FitText, useBlockFrame } from '../frame'

const TextDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const { fillText } = useBlockFrame()
  if (!block.content) {
    return <p style={{ color: '#999', fontStyle: 'italic' }}>Empty text block</p>
  }
  const body = (
    <div
      className="block-text"
      style={{ fontSize: 16, lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  )
  // font size is fixed unless the block opts into "scale to fill"
  return fillText ? <FitText>{body}</FitText> : body
}

export default TextDisplay
