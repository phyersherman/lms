import React, { useRef, useState, useCallback } from 'react'
import { BlockNode, GridPlacement, PageSection, GRID_COLUMNS, GRID_ROW_HEIGHT } from '../blocks/types'
import { FrameBox } from '../blocks/frame'
import { BLOCK_REGISTRY, BlockRenderContext } from '../blocks/registry'
import BlockInner from './BlockInner'
import { DraftDispatch, Selection } from './usePageDraft'
import styles from './PageEditor.module.css'

interface Props {
  section: PageSection
  selection: Selection
  context: BlockRenderContext
  dispatch: DraftDispatch
  contentSnapshot: () => any // current PageContent (for undo snapshots)
}

type DragMode =
  | { kind: 'move' }
  | { kind: 'resize'; edges: { e?: boolean; s?: boolean; w?: boolean; n?: boolean } }

interface DragState {
  blockId: string
  mode: DragMode
  startX: number
  startY: number
  origin: GridPlacement
  before: any // content snapshot for the undo stack
  moved: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

const isEditableTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  !!el.closest('[data-inline-edit], .ProseMirror, input, textarea, select, [contenteditable="true"]')

// Freeform canvas: blocks positioned on a 24-column grid, moved by dragging
// anywhere on the block and resized from edge/corner handles, snapping to
// grid cells. Mirrors the public GridSectionBody rendering exactly.
const GridSectionEditor: React.FC<Props> = ({ section, selection, context, dispatch, contentSnapshot }) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState(false)

  const blocks = section.columns.flatMap(c => c.blocks)
  const settings = section.settings || {}
  const maxRow = Math.max(
    settings.minRows || 6,
    ...blocks.map(b => (b.placement ? b.placement.y + b.placement.h : 1))
  )

  const cellSize = useCallback(() => {
    const width = canvasRef.current?.clientWidth || GRID_COLUMNS * 40
    return { w: width / GRID_COLUMNS, h: GRID_ROW_HEIGHT }
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const { w: cellW, h: cellH } = cellSize()
      const dxCells = Math.round((e.clientX - drag.startX) / cellW)
      const dyCells = Math.round((e.clientY - drag.startY) / cellH)
      if (!drag.moved && dxCells === 0 && dyCells === 0) return
      drag.moved = true
      setDragging(true)

      const o = drag.origin
      let next: GridPlacement
      if (drag.mode.kind === 'move') {
        next = {
          x: clamp(o.x + dxCells, 0, GRID_COLUMNS - o.w),
          y: Math.max(o.y + dyCells, 0),
          w: o.w,
          h: o.h,
        }
      } else {
        const edges = drag.mode.edges
        let { x, y, w, h } = o
        if (edges.e) w = clamp(o.w + dxCells, 1, GRID_COLUMNS - o.x)
        if (edges.s) h = Math.max(o.h + dyCells, 1)
        if (edges.w) {
          const newX = clamp(o.x + dxCells, 0, o.x + o.w - 1)
          w = o.w + (o.x - newX)
          x = newX
        }
        if (edges.n) {
          const newY = clamp(o.y + dyCells, 0, o.y + o.h - 1)
          h = o.h + (o.y - newY)
          y = newY
        }
        next = { x, y, w, h }
      }
      dispatch({ type: 'SET_BLOCK_PLACEMENT', blockId: drag.blockId, placement: next, transient: true })
    },
    [cellSize, dispatch]
  )

  const endDrag = useCallback(() => {
    const drag = dragRef.current
    dragRef.current = null
    setDragging(false)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', endDrag)
    if (drag?.moved) {
      // placements were applied transiently; record one undo step for the whole gesture
      dispatch({ type: 'COMMIT_SNAPSHOT', before: drag.before })
    }
  }, [dispatch, onPointerMove])

  const beginDrag = (e: React.PointerEvent, block: BlockNode, mode: DragMode) => {
    if (e.button !== 0) return
    // Inline text editing wins only once the block is already selected —
    // the first click/drag on an unselected block selects and moves it.
    const alreadySelected = selection?.kind === 'block' && selection.id === block.id
    if (mode.kind === 'move' && alreadySelected && isEditableTarget(e.target)) return
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'SELECT', selection: { kind: 'block', id: block.id } })
    dragRef.current = {
      blockId: block.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: block.placement || { x: 0, y: 0, w: GRID_COLUMNS, h: 2 },
      before: JSON.parse(JSON.stringify(contentSnapshot())),
      moved: false,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }

  return (
    <div
      ref={canvasRef}
      className={`${styles.gridCanvas} ${dragging ? styles.gridCanvasDragging : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        gridAutoRows: `minmax(${GRID_ROW_HEIGHT}px, auto)`,
        minHeight: maxRow * GRID_ROW_HEIGHT,
        backgroundSize: `calc(100% / ${GRID_COLUMNS}) ${GRID_ROW_HEIGHT}px`,
      }}
    >
      {blocks.map((block, i) => {
        const p = block.placement || { x: 0, y: 0, w: GRID_COLUMNS, h: 2 }
        const selected = selection?.kind === 'block' && selection.id === block.id
        const def = BLOCK_REGISTRY[block.type]
        return (
          <div
            key={block.id}
            className={`${styles.gridBlock} ${selected ? styles.gridBlockSelected : ''}`}
            style={{
              gridColumn: `${p.x + 1} / span ${clamp(p.w, 1, GRID_COLUMNS)}`,
              gridRow: `${p.y + 1} / span ${Math.max(p.h, 1)}`,
              zIndex: selected ? 40 : i + 1,
              minWidth: 0,
            }}
            onPointerDown={e => beginDrag(e, block, { kind: 'move' })}
            onClick={e => {
              e.stopPropagation()
              dispatch({ type: 'SELECT', selection: { kind: 'block', id: block.id } })
            }}
          >
            <div className={styles.gridBlockLabel}>
              {def?.icon} {def?.label || block.type}
              <button
                type="button"
                title="Delete block"
                className={styles.blockDelete}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation()
                  dispatch({ type: 'DELETE_BLOCK', blockId: block.id })
                }}
              >
                ✕
              </button>
            </div>

            <div className={styles.gridBlockContent}>
              <FrameBox block={block}>
                <BlockInner block={block} selected={!!selected} context={context} dispatch={dispatch} />
              </FrameBox>
            </div>

            {/* resize handles */}
            <div className={`${styles.gridHandle} ${styles.gridHandleE}`} onPointerDown={e => beginDrag(e, block, { kind: 'resize', edges: { e: true } })} />
            <div className={`${styles.gridHandle} ${styles.gridHandleW}`} onPointerDown={e => beginDrag(e, block, { kind: 'resize', edges: { w: true } })} />
            <div className={`${styles.gridHandle} ${styles.gridHandleS}`} onPointerDown={e => beginDrag(e, block, { kind: 'resize', edges: { s: true } })} />
            <div className={`${styles.gridHandle} ${styles.gridHandleSE}`} onPointerDown={e => beginDrag(e, block, { kind: 'resize', edges: { e: true, s: true } })} />
          </div>
        )
      })}
    </div>
  )
}

export default GridSectionEditor
