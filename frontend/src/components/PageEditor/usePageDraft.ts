import { useReducer, useCallback } from 'react'
import { BlockNode, PageContent, PageSection, SectionSettings } from '../blocks/types'
import { createBlock } from '../blocks/registry'

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

export const newSection = (columns = 1): PageSection => ({
  id: `sec-${uid()}`,
  settings: { paddingY: 'medium' },
  columns: Array.from({ length: columns }, () => ({ id: `col-${uid()}`, widthFraction: 1 / columns, blocks: [] })),
})

type Action =
  | { type: 'SET_CONTENT'; content: PageContent }
  | { type: 'SELECT'; selection: Selection }
  | { type: 'ADD_SECTION'; afterSectionId?: string; columns?: number }
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
      const section = newSection(action.columns || 1)
      const sections = [...state.content.sections]
      const idx = action.afterSectionId ? sections.findIndex(s => s.id === action.afterSectionId) : sections.length - 1
      sections.splice(idx + 1, 0, section)
      return withHistory(state, { sections }, { selection: { kind: 'section', id: section.id } })
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
