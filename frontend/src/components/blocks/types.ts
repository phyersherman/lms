// Shared block node shape. Matches both the LMS Block table rows
// ({ id, type, content, config, order_index }) and the nodes stored inside a
// website Page's content JSON tree, so one registry renders both.
// Position of a block inside a freeform grid section (cell units on a
// GRID_COLUMNS-wide grid; rows are GRID_ROW_HEIGHT px tall and grow with content).
export interface GridPlacement {
  x: number // column start, 0-based
  y: number // row start, 0-based
  w: number // column span
  h: number // row span (minimum height; content can stretch it)
}

export const GRID_COLUMNS = 24
export const GRID_ROW_HEIGHT = 24 // px

export interface BlockNode {
  id: string
  type: string
  content?: string
  config?: string // JSON string
  order_index?: number
  placement?: GridPlacement // used when the parent section layout is 'grid'
  // independent phone layout (edited in the editor's mobile view); when absent
  // the block auto-stacks full-width in desktop order. Tablet uses desktop.
  placementMobile?: GridPlacement
}

export interface SectionSettings {
  backgroundColor?: string
  backgroundImageUrl?: string
  paddingY?: 'none' | 'small' | 'medium' | 'large'
  fullWidth?: boolean
  // 'columns' (default): stacked blocks in flex columns
  // 'grid': freeform placement — blocks live in the section's first column
  //         and carry a `placement`
  layout?: 'columns' | 'grid'
  minRows?: number // grid: minimum canvas height in rows
  overlayOpacity?: number // 0..1 dark overlay over backgroundImageUrl
  textColor?: string // inherited text color for the section's content
}

// Section background with optional dark overlay over the image + inherited
// text color. Shared by the public renderer and the editor shells.
export const sectionBackgroundStyle = (settings: SectionSettings = {}): { [k: string]: string | undefined } => {
  const overlay = settings.backgroundImageUrl && settings.overlayOpacity
    ? `linear-gradient(rgba(0,0,0,${settings.overlayOpacity}), rgba(0,0,0,${settings.overlayOpacity})), `
    : ''
  return {
    backgroundColor: settings.backgroundColor || 'transparent',
    backgroundImage: settings.backgroundImageUrl ? `${overlay}url(${settings.backgroundImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: settings.textColor || undefined,
  }
}

// Phone layout for a grid section: explicit placementMobile when set,
// otherwise blocks stack full-width in desktop (y,x) order. Shared by the
// editor's mobile canvas and the public renderer's generated media CSS.
export function mobileLayout(blocks: BlockNode[]): Map<string, GridPlacement> {
  const layout = new Map<string, GridPlacement>()
  const ordered = [...blocks].sort(
    (a, b) => (a.placement?.y ?? 0) - (b.placement?.y ?? 0) || (a.placement?.x ?? 0) - (b.placement?.x ?? 0)
  )
  // lay out the auto-stacked blocks below any explicitly placed ones
  let cursor = Math.max(0, ...blocks.map(b => (b.placementMobile ? b.placementMobile.y + b.placementMobile.h : 0)))
  for (const block of ordered) {
    if (block.placementMobile) {
      layout.set(block.id, block.placementMobile)
    } else {
      const h = Math.max(block.placement?.h ?? 4, 2)
      layout.set(block.id, { x: 0, y: cursor, w: GRID_COLUMNS, h })
      cursor += h + 1
    }
  }
  return layout
}

export interface PageColumn {
  id: string
  widthFraction: number
  blocks: BlockNode[]
}

export interface PageSection {
  id: string
  settings?: SectionSettings
  columns: PageColumn[]
}

export interface PageContent {
  sections: PageSection[]
}

// How a block's content sits inside its grid container. Stored in the block
// config under the reserved `_frame` key. 'stretch' makes the content fill
// the container on that axis (so resizing the container resizes the content).
export interface BlockFrame {
  hAlign: 'start' | 'center' | 'end' | 'stretch'
  vAlign: 'start' | 'center' | 'end' | 'stretch'
  padding: number // px inside the container
  fillText?: boolean // text blocks: scale the type to fill the container
}

// Visual blocks fill their container by default — the container IS the
// element. Text flows naturally from the top-left at its set font size.
export const FRAME_DEFAULTS: Record<string, BlockFrame> = {
  text: { hAlign: 'stretch', vAlign: 'start', padding: 6 },
  hero: { hAlign: 'stretch', vAlign: 'stretch', padding: 0 },
  image: { hAlign: 'stretch', vAlign: 'stretch', padding: 0 },
  video: { hAlign: 'stretch', vAlign: 'stretch', padding: 0 },
  quote: { hAlign: 'stretch', vAlign: 'stretch', padding: 0 },
  button: { hAlign: 'stretch', vAlign: 'stretch', padding: 6 },
  divider: { hAlign: 'stretch', vAlign: 'center', padding: 0 },
  spacer: { hAlign: 'stretch', vAlign: 'stretch', padding: 0 },
  form: { hAlign: 'stretch', vAlign: 'start', padding: 6 },
  product: { hAlign: 'stretch', vAlign: 'start', padding: 6 },
  blogListing: { hAlign: 'stretch', vAlign: 'start', padding: 6 },
  quiz: { hAlign: 'stretch', vAlign: 'start', padding: 6 },
}

export function parseFrame(block: BlockNode): BlockFrame {
  const defaults = FRAME_DEFAULTS[block.type] || { hAlign: 'stretch', vAlign: 'start', padding: 6 }
  if (!block.config) return { ...defaults }
  try {
    const parsed = JSON.parse(block.config)
    return { ...defaults, ...(parsed._frame || {}) }
  } catch {
    return { ...defaults }
  }
}

export function parseConfig<T extends object>(block: BlockNode, defaults: T): T {
  if (!block.config) return { ...defaults }
  try {
    return { ...defaults, ...JSON.parse(block.config) }
  } catch {
    return { ...defaults }
  }
}
