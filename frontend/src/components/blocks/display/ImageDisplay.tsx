import React from 'react'
import { BlockNode, parseConfig } from '../types'
import { useBlockFrame } from '../frame'

export interface ImageConfig {
  altText?: string
  caption?: string
  rounded?: boolean
  shadow?: boolean
  maxWidth?: string
  alignment?: 'left' | 'center' | 'right'
  objectFit?: 'cover' | 'contain'
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
  const { fillW, fillH } = useBlockFrame()
  const fills = fillW && fillH
  if (!block.content) {
    return (
      <div style={{ padding: fills ? 0 : '60px 20px', height: fills ? '100%' : undefined, display: fills ? 'flex' : undefined, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, color: '#999', fontStyle: 'italic', textAlign: 'center', boxSizing: 'border-box' }}>
        No image selected
      </div>
    )
  }
  if (fills) {
    // the container is the image: cover/contain it edge to edge
    return (
      <figure style={{ margin: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <img
          src={block.content}
          alt={config.altText || ''}
          style={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            objectFit: config.objectFit || 'cover',
            borderRadius: config.rounded ? 8 : 0,
            boxShadow: config.shadow ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          }}
        />
        {config.caption && (
          <figcaption style={{ marginTop: 8, fontSize: 14, color: '#666', textAlign: config.alignment || 'center' }}>{config.caption}</figcaption>
        )}
      </figure>
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
