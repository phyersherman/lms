import React from 'react'
import { BlockNode, parseConfig } from '../types'

export interface ImageConfig {
  altText?: string
  caption?: string
  rounded?: boolean
  shadow?: boolean
  maxWidth?: string
  alignment?: 'left' | 'center' | 'right'
}

export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  altText: '',
  caption: '',
  rounded: true,
  shadow: true,
  alignment: 'center',
}

const ImageDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_IMAGE_CONFIG)
  if (!block.content) {
    return (
      <div style={{ padding: '60px 20px', backgroundColor: '#f0f0f0', borderRadius: 8, color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
        No image selected
      </div>
    )
  }
  return (
    <figure style={{ margin: 0, textAlign: config.alignment || 'center' }}>
      <img
        src={block.content}
        alt={config.altText || ''}
        style={{
          maxWidth: config.maxWidth || '100%',
          width: config.maxWidth ? '100%' : undefined,
          height: 'auto',
          borderRadius: config.rounded ? 8 : 0,
          boxShadow: config.shadow ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        }}
      />
      {config.caption && (
        <figcaption style={{ marginTop: 8, fontSize: 14, color: '#666' }}>{config.caption}</figcaption>
      )}
    </figure>
  )
}

export default ImageDisplay
