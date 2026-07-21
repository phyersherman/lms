import React from 'react'
import { PageContent, PageSection, GRID_COLUMNS, GRID_ROW_HEIGHT } from './types'
import BlockDisplay from './BlockDisplay'
import { FrameBox } from './frame'
import { BlockRenderContext } from './registry'

const SECTION_PADDING = { none: '0', small: '24px 0', medium: '48px 0', large: '96px 0' } as const

// Freeform grid section: blocks carry {x,y,w,h} placements on a 24-column
// grid. Rows are GRID_ROW_HEIGHT px minimum and grow with content. On mobile
// the .site-grid rules in globals.css collapse it to a stacked column ordered
// by placement (top-to-bottom, left-to-right).
export const GridSectionBody: React.FC<{ section: PageSection; context?: BlockRenderContext }> = ({ section, context }) => {
  const blocks = section.columns.flatMap(c => c.blocks)
  const settings = section.settings || {}
  const maxRow = Math.max(settings.minRows || 4, ...blocks.map(b => (b.placement ? b.placement.y + b.placement.h : 1)))
  return (
    <div
      className="site-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        gridAutoRows: `minmax(${GRID_ROW_HEIGHT}px, auto)`,
        minHeight: maxRow * GRID_ROW_HEIGHT,
        columnGap: 0,
        rowGap: 0,
      }}
    >
      {blocks.map((block, i) => {
        const p = block.placement || { x: 0, y: 0, w: GRID_COLUMNS, h: 2 }
        return (
          <div
            key={block.id}
            style={{
              gridColumn: `${Math.max(p.x, 0) + 1} / span ${Math.min(Math.max(p.w, 1), GRID_COLUMNS)}`,
              gridRow: `${Math.max(p.y, 0) + 1} / span ${Math.max(p.h, 1)}`,
              order: p.y * (GRID_COLUMNS + 1) + p.x, // mobile stacking order
              zIndex: i + 1,
              minWidth: 0,
            }}
          >
            <FrameBox block={block}>
              <BlockDisplay block={block} context={context} />
            </FrameBox>
          </div>
        )
      })}
    </div>
  )
}

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
          ...(settings.layout === 'grid'
            ? {}
            : { display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }),
        }}
      >
        {settings.layout === 'grid' ? (
          <GridSectionBody section={section} context={context} />
        ) : (
          section.columns.map(column => (
            <div
              key={column.id}
              // 260px floor makes columns stack on mobile without media queries
              style={{ flex: `1 1 ${Math.max(column.widthFraction * 100 - 3, 10)}%`, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {column.blocks.map(block => (
                <BlockDisplay key={block.id} block={block} context={context} />
              ))}
            </div>
          ))
        )}
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
