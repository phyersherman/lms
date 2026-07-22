import { useReducer, useCallback } from 'react'
import { BlockNode, GridPlacement, PageContent, PageSection, SectionSettings, GRID_COLUMNS } from '../blocks/types'
import { createBlock } from '../blocks/registry'

// Sensible starting sizes (in grid cells) when a block is added to a grid
// section or a stacked section is converted to freeform.
export const DEFAULT_GRID_SIZES: Record<string, { w: number; h: number }> = {
  text: { w: 12, h: 4 },
  hero: { w: 24, h: 12 },
  image: { w: 10, h: 8 },
  video: { w: 14, h: 9 },
  quote: { w: 12, h: 4 },
  button: { w: 4, h: 2 },
  divider: { w: 24, h: 1 },
  spacer: { w: 24, h: 2 },
  form: { w: 12, h: 12 },
  product: { w: 24, h: 14 },
  blogListing: { w: 24, h: 10 },
  quiz: { w: 24, h: 10 },
}

export const gridSizeFor = (type: string) => DEFAULT_GRID_SIZES[type] || { w: 12, h: 4 }

export type Selection =
  | { kind: 'block'; id: string }
  | { kind: 'section'; id: string }
  | null

export interface DraftState {
  content: PageContent
  selection: Selection
  past: PageContent[]
  future: PageContent[]
  dirty: boolean
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

export const newSection = (columns = 1, layout: 'columns' | 'grid' = 'grid'): PageSection => ({
  id: `sec-${uid()}`,
  settings: layout === 'grid' ? { paddingY: 'medium', layout: 'grid', minRows: 6 } : { paddingY: 'medium' },
  columns:
    layout === 'grid'
      ? [{ id: `col-${uid()}`, widthFraction: 1, blocks: [] }]
      : Array.from({ length: columns }, () => ({ id: `col-${uid()}`, widthFraction: 1 / columns, blocks: [] })),
})

// ---- stacked <-> freeform conversion ----

const toGridLayout = (section: PageSection): PageSection => {
  if (section.settings?.layout === 'grid') return section
  const blocks: BlockNode[] = []
  let xCursor = 0
  const colYs: number[] = []
  section.columns.forEach((column, ci) => {
    const w = Math.max(2, Math.round(column.widthFraction * GRID_COLUMNS))
    const x = Math.min(xCursor, GRID_COLUMNS - w)
    let y = 0
    for (const block of column.blocks) {
      const size = gridSizeFor(block.type)
      blocks.push({ ...block, placement: { x, y, w, h: size.h } })
      y += size.h + 1
    }
    colYs[ci] = y
    xCursor += w
  })
  return {
    ...section,
    settings: { ...section.settings, layout: 'grid', minRows: Math.max(6, ...colYs) },
    columns: [{ id: `col-${uid()}`, widthFraction: 1, blocks }],
  }
}

const toColumnsLayout = (section: PageSection): PageSection => {
  if (section.settings?.layout !== 'grid') return section
  const blocks = [...section.columns.flatMap(c => c.blocks)]
    .sort((a, b) => (a.placement?.y ?? 0) - (b.placement?.y ?? 0) || (a.placement?.x ?? 0) - (b.placement?.x ?? 0))
    .map(({ placement, ...rest }) => rest as BlockNode)
  const { layout, minRows, ...restSettings } = section.settings || {}
  return {
    ...section,
    settings: restSettings,
    columns: [{ id: `col-${uid()}`, widthFraction: 1, blocks }],
  }
}

type Action =
  | { type: 'SET_CONTENT'; content: PageContent }
  | { type: 'SELECT'; selection: Selection }
  | { type: 'ADD_SECTION'; afterSectionId?: string; columns?: number; layout?: 'columns' | 'grid' }
  | { type: 'SET_SECTION_LAYOUT'; sectionId: string; layout: 'columns' | 'grid' }
  | { type: 'SET_BLOCK_PLACEMENT'; blockId: string; placement: GridPlacement; device?: 'desktop' | 'mobile'; transient?: boolean }
  | { type: 'EXPLODE_HERO'; blockId: string }
  | { type: 'COMMIT_SNAPSHOT'; before: PageContent }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'MOVE_SECTION'; sectionId: string; direction: -1 | 1 }
  | { type: 'REORDER_SECTIONS'; activeId: string; overId: string }
  | { type: 'UPDATE_SECTION_SETTINGS'; sectionId: string; settings: Partial<SectionSettings> }
  | { type: 'SET_SECTION_COLUMNS'; sectionId: string; widths: number[] }
  | { type: 'ADD_BLOCK'; sectionId: string; columnId: string; blockType: string; index?: number }
  | { type: 'UPDATE_BLOCK'; blockId: string; updates: Partial<BlockNode>; transient?: boolean }
  | { type: 'DELETE_BLOCK'; blockId: string }
  | { type: 'MOVE_BLOCK'; blockId: string; toColumnId: string; toIndex: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' }

const MAX_HISTORY = 60

const cloneContent = (c: PageContent): PageContent => JSON.parse(JSON.stringify(c))

function withHistory(state: DraftState, content: PageContent, extra?: Partial<DraftState>): DraftState {
  return {
    ...state,
    content,
    past: [...state.past.slice(-MAX_HISTORY), state.content],
    future: [],
    dirty: true,
    ...extra,
  }
}

function mapBlocks(content: PageContent, fn: (b: BlockNode) => BlockNode | null): PageContent {
  return {
    sections: content.sections.map(s => ({
      ...s,
      columns: s.columns.map(c => ({
        ...c,
        blocks: c.blocks.map(fn).filter((b): b is BlockNode => b !== null),
      })),
    })),
  }
}

function findBlockLocation(content: PageContent, blockId: string) {
  for (const section of content.sections) {
    for (const column of section.columns) {
      const index = column.blocks.findIndex(b => b.id === blockId)
      if (index !== -1) return { section, column, index, block: column.blocks[index] }
    }
  }
  return null
}

function reducer(state: DraftState, action: Action): DraftState {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.content, past: [], future: [], dirty: false, selection: null }

    case 'SELECT':
      return { ...state, selection: action.selection }

    case 'ADD_SECTION': {
      const section = newSection(action.columns || 1, action.layout || 'grid')
      const sections = [...state.content.sections]
      const idx = action.afterSectionId ? sections.findIndex(s => s.id === action.afterSectionId) : sections.length - 1
      sections.splice(idx + 1, 0, section)
      return withHistory(state, { sections }, { selection: { kind: 'section', id: section.id } })
    }

    case 'SET_SECTION_LAYOUT': {
      const sections = state.content.sections.map(s => {
        if (s.id !== action.sectionId) return s
        return action.layout === 'grid' ? toGridLayout(s) : toColumnsLayout(s)
      })
      return withHistory(state, { sections })
    }

    case 'SET_BLOCK_PLACEMENT': {
      const key = action.device === 'mobile' ? 'placementMobile' : 'placement'
      const content = mapBlocks(state.content, b =>
        b.id === action.blockId ? { ...b, [key]: action.placement } : b
      )
      if (action.transient) return { ...state, content, dirty: true }
      return withHistory(state, content)
    }

    // Replace a hero block with individually placeable blocks (kicker, heading,
    // subheading, buttons) and move its visual styling onto the section, so
    // every element can be dragged/resized like anything else on the grid.
    case 'EXPLODE_HERO': {
      let done = false
      const sections = state.content.sections.map(section => {
        const column = section.columns.find(c => c.blocks.some(b => b.id === action.blockId))
        if (!column || done) return section
        const hero = column.blocks.find(b => b.id === action.blockId)!
        if (hero.type !== 'hero') return section
        done = true
        let config: any = {}
        try {
          config = hero.config ? JSON.parse(hero.config) : {}
        } catch { /* keep defaults */ }
        const p = hero.placement || { x: 0, y: 0, w: GRID_COLUMNS, h: 14 }
        const align = config.alignment || 'center'
        const textAlign = `text-align:${align}`
        const color = config.textColor || '#ffffff'

        const pieces: BlockNode[] = []
        let y = p.y + 1
        const uid2 = () => `block-${uid()}`
        if (config.kicker) {
          pieces.push({ id: uid2(), type: 'text', content: `<p style="${textAlign};font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin:0">${config.kicker}</p>`, config: '{}', placement: { x: p.x + 2, y, w: p.w - 4, h: 2 } })
          y += 2
        }
        pieces.push({ id: uid2(), type: 'text', content: `<h1 style="${textAlign};margin:0">${hero.content || 'Heading'}</h1>`, config: '{}', placement: { x: p.x + 2, y, w: p.w - 4, h: 3 } })
        y += 3
        if (config.subheading) {
          pieces.push({ id: uid2(), type: 'text', content: `<p style="${textAlign};font-size:19px;line-height:1.5;opacity:0.92;margin:0">${config.subheading}</p>`, config: '{}', placement: { x: p.x + 2, y, w: p.w - 4, h: 3 } })
          y += 3
        }
        const buttons: any[] = config.buttons || []
        if (buttons.length) {
          y += 1
          const bw = 6
          const gap = 1
          const total = buttons.length * bw + (buttons.length - 1) * gap
          let bx = align === 'left' ? p.x + 2 : Math.max(p.x, p.x + Math.round((p.w - total) / 2))
          for (const b of buttons) {
            pieces.push({
              id: uid2(),
              type: 'button',
              content: b.label || 'Button',
              config: JSON.stringify(
                b.variant === 'outline'
                  ? { url: b.url || '#', outline: true, textColor: color, backgroundColor: 'transparent', alignment: 'center' }
                  : { url: b.url || '#', backgroundColor: 'var(--color-primary)', textColor: '#ffffff', alignment: 'center' }
              ),
              placement: { x: Math.min(bx, p.x + p.w - bw), y, w: bw, h: 2 },
            })
            bx += bw + gap
          }
        }

        return {
          ...section,
          settings: {
            ...section.settings,
            backgroundColor: config.backgroundColor || section.settings?.backgroundColor,
            backgroundImageUrl: config.backgroundImageUrl || section.settings?.backgroundImageUrl,
            overlayOpacity: config.backgroundImageUrl ? config.overlayOpacity ?? 0.45 : section.settings?.overlayOpacity,
            textColor: color,
          },
          columns: section.columns.map(c =>
            c.id === column.id
              ? { ...c, blocks: c.blocks.flatMap(b => (b.id === action.blockId ? pieces : [b])) }
              : c
          ),
        }
      })
      if (!done) return state
      return withHistory(state, { sections }, { selection: null })
    }

    case 'COMMIT_SNAPSHOT':
      // Push a pre-interaction snapshot onto the undo stack (the live content
      // was already updated transiently during the drag/resize).
      return {
        ...state,
        past: [...state.past.slice(-MAX_HISTORY), action.before],
        future: [],
        dirty: true,
      }

    case 'DELETE_SECTION': {
      const sections = state.content.sections.filter(s => s.id !== action.sectionId)
      return withHistory(state, { sections: sections.length ? sections : [newSection()] }, { selection: null })
    }

    case 'MOVE_SECTION': {
      const sections = [...state.content.sections]
      const idx = sections.findIndex(s => s.id === action.sectionId)
      const to = idx + action.direction
      if (idx === -1 || to < 0 || to >= sections.length) return state
      const [s] = sections.splice(idx, 1)
      sections.splice(to, 0, s)
      return withHistory(state, { sections })
    }

    case 'REORDER_SECTIONS': {
      const sections = [...state.content.sections]
      const from = sections.findIndex(s => s.id === action.activeId)
      const to = sections.findIndex(s => s.id === action.overId)
      if (from === -1 || to === -1 || from === to) return state
      const [s] = sections.splice(from, 1)
      sections.splice(to, 0, s)
      return withHistory(state, { sections })
    }

    case 'UPDATE_SECTION_SETTINGS': {
      const sections = state.content.sections.map(s =>
        s.id === action.sectionId ? { ...s, settings: { ...s.settings, ...action.settings } } : s
      )
      return withHistory(state, { sections })
    }

    case 'SET_SECTION_COLUMNS': {
      const sections = state.content.sections.map(s => {
        if (s.id !== action.sectionId) return s
        const widths = action.widths
        const columns = widths.map((w, i) =>
          s.columns[i]
            ? { ...s.columns[i], widthFraction: w }
            : { id: `col-${uid()}`, widthFraction: w, blocks: [] }
        )
        // blocks from removed columns flow into the last remaining column
        if (s.columns.length > widths.length) {
          const orphans = s.columns.slice(widths.length).flatMap(c => c.blocks)
          columns[columns.length - 1] = {
            ...columns[columns.length - 1],
            blocks: [...columns[columns.length - 1].blocks, ...orphans],
          }
        }
        return { ...s, columns }
      })
      return withHistory(state, { sections })
    }

    case 'ADD_BLOCK': {
      const block = createBlock(action.blockType)
      const sections = state.content.sections.map(s => {
        if (s.id !== action.sectionId) return s
        if (s.settings?.layout === 'grid') {
          // place at the bottom of the grid, full default size
          const existing = s.columns.flatMap(c => c.blocks)
          const bottom = existing.reduce((m, b) => Math.max(m, b.placement ? b.placement.y + b.placement.h : 0), 0)
          const size = gridSizeFor(action.blockType)
          const placed = { ...block, placement: { x: 0, y: bottom + (existing.length ? 1 : 0), w: size.w, h: size.h } }
          return { ...s, columns: [{ ...s.columns[0], blocks: [...s.columns[0].blocks, placed] }] }
        }
        return {
          ...s,
          columns: s.columns.map(c => {
            if (c.id !== action.columnId) return c
            const blocks = [...c.blocks]
            blocks.splice(action.index ?? blocks.length, 0, block)
            return { ...c, blocks }
          }),
        }
      })
      return withHistory(state, { sections }, { selection: { kind: 'block', id: block.id } })
    }

    case 'UPDATE_BLOCK': {
      const content = mapBlocks(state.content, b => (b.id === action.blockId ? { ...b, ...action.updates } : b))
      if (action.transient) {
        // no history entry (e.g. every keystroke while typing)
        return { ...state, content, dirty: true }
      }
      return withHistory(state, content)
    }

    case 'DELETE_BLOCK': {
      const content = mapBlocks(state.content, b => (b.id === action.blockId ? null : b))
      return withHistory(state, content, {
        selection: state.selection?.kind === 'block' && state.selection.id === action.blockId ? null : state.selection,
      })
    }

    case 'MOVE_BLOCK': {
      const loc = findBlockLocation(state.content, action.blockId)
      if (!loc) return state
      const block = loc.block
      // remove
      let content = mapBlocks(state.content, b => (b.id === action.blockId ? null : b))
      // insert
      content = {
        sections: content.sections.map(s => ({
          ...s,
          columns: s.columns.map(c => {
            if (c.id !== action.toColumnId) return c
            const blocks = [...c.blocks]
            const idx = Math.min(Math.max(action.toIndex, 0), blocks.length)
            blocks.splice(idx, 0, block)
            return { ...c, blocks }
          }),
        })),
      }
      return withHistory(state, content)
    }

    case 'UNDO': {
      if (!state.past.length) return state
      const past = [...state.past]
      const prev = past.pop()!
      return { ...state, content: prev, past, future: [state.content, ...state.future], dirty: true }
    }

    case 'REDO': {
      if (!state.future.length) return state
      const [next, ...future] = state.future
      return { ...state, content: next, past: [...state.past, state.content], future, dirty: true }
    }

    case 'MARK_SAVED':
      return { ...state, dirty: false }

    default:
      return state
  }
}

export function usePageDraft(initial: PageContent) {
  const [state, dispatch] = useReducer(reducer, {
    content: initial && initial.sections?.length ? cloneContent(initial) : { sections: [newSection()] },
    selection: null,
    past: [],
    future: [],
    dirty: false,
  })

  const select = useCallback((selection: Selection) => dispatch({ type: 'SELECT', selection }), [])
  return { state, dispatch, select }
}

export type DraftDispatch = (action: Action) => void
export type DraftAction = Action
