// Shared block node shape. Matches both the LMS Block table rows
// ({ id, type, content, config, order_index }) and the nodes stored inside a
// website Page's content JSON tree, so one registry renders both.
export interface BlockNode {
  id: string
  type: string
  content?: string
  config?: string // JSON string
  order_index?: number
}

export interface SectionSettings {
  backgroundColor?: string
  backgroundImageUrl?: string
  paddingY?: 'none' | 'small' | 'medium' | 'large'
  fullWidth?: boolean
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
