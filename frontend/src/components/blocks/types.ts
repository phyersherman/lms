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

export function parseConfig<T extends object>(block: BlockNode, defaults: T): T {
  if (!block.config) return { ...defaults }
  try {
    return { ...defaults, ...JSON.parse(block.config) }
  } catch {
    return { ...defaults }
  }
}
