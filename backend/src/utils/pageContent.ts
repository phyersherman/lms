import { randomUUID } from 'crypto'

// Layout tree stored in Page.draft_content / Page.published_content.
export interface PageBlockNode {
  id: string
  type: string
  content?: string
  config?: string // JSON string, same shape as LMS Block.config
}

export interface PageColumn {
  id: string
  widthFraction: number // 0..1, columns in a section should sum to ~1
  blocks: PageBlockNode[]
}

export interface PageSection {
  id: string
  settings?: {
    backgroundColor?: string
    backgroundImageUrl?: string
    paddingY?: 'none' | 'small' | 'medium' | 'large'
    fullWidth?: boolean
  }
  columns: PageColumn[]
}

export interface PageContent {
  sections: PageSection[]
}

export const emptyPageContent = (): PageContent => ({
  sections: [
    {
      id: randomUUID(),
      settings: { paddingY: 'medium' },
      columns: [{ id: randomUUID(), widthFraction: 1, blocks: [] }],
    },
  ],
})

// Structural validation of an editor-supplied content tree. Throws on invalid.
export const validatePageContent = (content: any): PageContent => {
  if (!content || typeof content !== 'object' || !Array.isArray(content.sections)) {
    throw new Error('content must be an object with a sections array')
  }
  for (const section of content.sections) {
    if (!section || typeof section.id !== 'string' || !Array.isArray(section.columns)) {
      throw new Error('each section needs an id and columns array')
    }
    for (const column of section.columns) {
      if (!column || typeof column.id !== 'string' || !Array.isArray(column.blocks)) {
        throw new Error('each column needs an id and blocks array')
      }
      for (const block of column.blocks) {
        if (!block || typeof block.id !== 'string' || typeof block.type !== 'string') {
          throw new Error('each block needs an id and type')
        }
      }
    }
  }
  return content as PageContent
}

// Slugs that collide with app routes and can never be used for site pages.
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'logout', 'dashboard', 'my-courses', 'course', 'courses',
  'certificates', 'preview', 'blog', 'checkout', 'accept-invite', 'forgot-password',
  'reset-password', 'passwordless-login', 'passwordless-register', '_next', 'uploads',
  'sitemap.xml', 'robots.txt', 'favicon.ico',
])

export const validateSlug = (slug: string): string => {
  const clean = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
  if (clean === '') return '' // homepage
  const first = clean.split('/')[0]
  if (RESERVED_SLUGS.has(first)) throw new Error(`slug "${first}" is reserved`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(clean)) {
    throw new Error('slug may only contain lowercase letters, numbers, hyphens and slashes')
  }
  return clean
}
