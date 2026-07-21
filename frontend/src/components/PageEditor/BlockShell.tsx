import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BlockNode } from '../blocks/types'
import { BLOCK_REGISTRY, BlockRenderContext } from '../blocks/registry'
import BlockDisplay from '../blocks/BlockDisplay'
import TextInlineEditor from './TextInlineEditor'
import { DraftDispatch } from './usePageDraft'
import styles from './PageEditor.module.css'

interface Props {
  block: BlockNode
  columnId: string
  sectionId: string
  selected: boolean
  context: BlockRenderContext
  dispatch: DraftDispatch
  onSelect: () => void
}

// Editor wrapper around a real block: hover outline, drag handle, selection,
// and inline editing for text blocks.
const BlockShell: React.FC<Props> = ({ block, columnId, sectionId, selected, context, dispatch, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: 'block', columnId, sectionId },
  })

  const def = BLOCK_REGISTRY[block.type]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`${styles.blockShell} ${selected ? styles.blockShellSelected : ''}`}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div className={styles.blockToolbar}>
        <button type="button" className={styles.dragHandle} {...attributes} {...listeners} title="Drag to move">
          ⠿
        </button>
        <span className={styles.blockLabel}>{def?.icon} {def?.label || block.type}</span>
        <button
          type="button"
          className={styles.blockDelete}
          title="Delete block"
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: 'DELETE_BLOCK', blockId: block.id })
          }}
        >
          ✕
        </button>
      </div>

      <div className={block.type === 'quiz' ? styles.blockNoninteractive : undefined}>
        {block.type === 'text' ? (
          <TextInlineEditor
            block={block}
            selected={selected}
            onChange={html => dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: { content: html }, transient: true })}
          />
        ) : (
          <BlockDisplay block={block} context={context} />
        )}
      </div>
    </div>
  )
}

export default BlockShell
