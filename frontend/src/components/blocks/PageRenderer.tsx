import React from 'react'
import { PageContent, PageSection } from './types'
import BlockDisplay from './BlockDisplay'
import { BlockRenderContext } from './registry'

const SECTION_PADDING = { none: '0', small: '24px 0', medium: '48px 0', large: '96px 0' } as const

export const SectionRenderer: React.FC<{ section: PageSection; context?: BlockRenderContext }> = ({ section, context }) => {
  const settings = section.settings || {}
  return (
    <section
      style={{
        backgroundColor: settings.backgroundColor || 'transparent',
        backgroundImage: settings.backgroundImageUrl ? `url(${settings.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: SECTION_PADDING[settings.paddingY || 'medium'],
      }}
    >
      <div
        style={{
          maxWidth: settings.fullWidth ? 'none' : 1100,
          margin: '0 auto',
          padding: settings.fullWidth ? 0 : '0 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {section.columns.map(column => (
          <div
            key={column.id}
            // 260px floor makes columns stack on mobile without media queries
            style={{ flex: `1 1 ${Math.max(column.widthFraction * 100 - 3, 10)}%`, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {column.blocks.map(block => (
              <BlockDisplay key={block.id} block={block} context={context} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// Renders a full page content tree (used by the public site and editor preview).
const PageRenderer: React.FC<{ content: PageContent; context?: BlockRenderContext }> = ({ content, context }) => {
  if (!content?.sections?.length) return null
  return (
    <>
      {content.sections.map(section => (
        <SectionRenderer key={section.id} section={section} context={context} />
      ))}
    </>
  )
}

export default PageRenderer
