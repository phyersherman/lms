import React, { useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BlockNode, PageContent } from '../blocks/types'
import { createBlock } from '../blocks/registry'
import BlockShell from './BlockShell'
import AddBlockMenu from './AddBlockMenu'
import Inspector from './Inspector'
import { DraftAction, Selection } from './usePageDraft'
import styles from './PageEditor.module.css'

export interface IModuleBlock extends BlockNode {
  order_index: number
}

interface Props {
  blocks: IModuleBlock[]
  onBlocksChange: (blocks: IModuleBlock[]) => void
}

const COL_ID = 'module-col'
const SEC_ID = 'module-sec'

// Single-column drag-and-drop block editor for LMS module content. Same
// canvas/inspector experience as the website page editor, but operates on a
// flat block list persisted through the existing course save flow.
const ModuleBlocksEditor: React.FC<Props> = ({ blocks, onBlocksChange }) => {
  const [selection, setSelection] = useState<Selection>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const reindex = (list: BlockNode[]): IModuleBlock[] =>
    list.map((b, i) => ({ ...b, order_index: i }))

  // Adapter: translate editor actions into flat-list updates
  const dispatch = (action: DraftAction) => {
    switch (action.type) {
      case 'SELECT':
        setSelection(action.selection)
        break
      case 'ADD_BLOCK': {
        const block = createBlock(action.blockType)
        onBlocksChange(reindex([...blocks, block]))
        setSelection({ kind: 'block', id: block.id })
        break
      }
      case 'UPDATE_BLOCK':
        onBlocksChange(reindex(blocks.map(b => (b.id === action.blockId ? { ...b, ...action.updates } : b))))
        break
      case 'DELETE_BLOCK':
        onBlocksChange(reindex(blocks.filter(b => b.id !== action.blockId)))
        if (selection?.kind === 'block' && selection.id === action.blockId) setSelection(null)
        break
      case 'MOVE_BLOCK': {
        const from = blocks.findIndex(b => b.id === action.blockId)
        if (from === -1) break
        const list = [...blocks]
        const [moved] = list.splice(from, 1)
        list.splice(Math.min(action.toIndex, list.length), 0, moved)
        onBlocksChange(reindex(list))
        break
      }
      default:
        break
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const overIndex = blocks.findIndex(b => b.id === over.id)
    if (overIndex === -1) return
    dispatch({ type: 'MOVE_BLOCK', blockId: String(active.id), toColumnId: COL_ID, toIndex: overIndex })
  }

  const content: PageContent = {
    sections: [{ id: SEC_ID, columns: [{ id: COL_ID, widthFraction: 1, blocks }] }],
  }

  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
      <div style={{ flex: 1, padding: 16, minWidth: 0 }} onClick={() => setSelection(null)}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className={styles.columnBlocks}>
              {blocks.map(block => (
                <BlockShell
                  key={block.id}
                  block={block}
                  columnId={COL_ID}
                  sectionId={SEC_ID}
                  selected={selection?.kind === 'block' && selection.id === block.id}
                  context={{ surface: 'lms' }}
                  dispatch={dispatch}
                  onSelect={() => setSelection({ kind: 'block', id: block.id })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div onClick={e => e.stopPropagation()}>
          <AddBlockMenu surface="lms" onAdd={type => dispatch({ type: 'ADD_BLOCK', sectionId: SEC_ID, columnId: COL_ID, blockType: type })} />
        </div>
      </div>
      {selection && <Inspector content={content} selection={selection} dispatch={dispatch} />}
    </div>
  )
}

export default ModuleBlocksEditor
