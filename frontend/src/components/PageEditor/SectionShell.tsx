import React from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { PageSection } from '../blocks/types'
import { BlockRenderContext } from '../blocks/registry'
import BlockShell from './BlockShell'
import AddBlockMenu from './AddBlockMenu'
import { DraftDispatch, Selection } from './usePageDraft'
import styles from './PageEditor.module.css'

const SECTION_PADDING = { none: '0', small: '24px 0', medium: '48px 0', large: '96px 0' } as const

const ColumnDropZone: React.FC<{
  columnId: string
  sectionId: string
  children: React.ReactNode
}> = ({ columnId, sectionId, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${columnId}`, data: { type: 'column', columnId, sectionId } })
  return (
    <div ref={setNodeRef} className={`${styles.columnDrop} ${isOver ? styles.columnDropOver : ''}`}>
      {children}
    </div>
  )
}

interface Props {
  section: PageSection
  selection: Selection
  context: BlockRenderContext
  dispatch: DraftDispatch
}

const SectionShell: React.FC<Props> = ({ section, selection, context, dispatch }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { type: 'section' },
  })

  const settings = section.settings || {}
  const isSelected = selection?.kind === 'section' && selection.id === section.id

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`${styles.sectionShell} ${isSelected ? styles.sectionShellSelected : ''}`}
      onClick={() => dispatch({ type: 'SELECT', selection: { kind: 'section', id: section.id } })}
    >
      <div className={styles.sectionToolbar}>
        <button type="button" className={styles.dragHandle} {...attributes} {...listeners} title="Drag section">
          ⠿ Section
        </button>
        <button
          type="button"
          title="Add section below"
          className={styles.sectionToolButton}
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: 'ADD_SECTION', afterSectionId: section.id })
          }}
        >
          + Section
        </button>
        <button
          type="button"
          title="Delete section"
          className={styles.sectionToolButton}
          onClick={e => {
            e.stopPropagation()
            if (confirm('Delete this section and its blocks?')) dispatch({ type: 'DELETE_SECTION', sectionId: section.id })
          }}
        >
          🗑
        </button>
      </div>

      <div
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
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            alignItems: 'flex-start',
          }}
        >
          {section.columns.map(column => (
            <div key={column.id} style={{ flex: `1 1 ${Math.max(column.widthFraction * 100 - 3, 10)}%`, minWidth: 200 }}>
              <ColumnDropZone columnId={column.id} sectionId={section.id}>
                <SortableContext items={column.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className={styles.columnBlocks}>
                    {column.blocks.map(block => (
                      <BlockShell
                        key={block.id}
                        block={block}
                        columnId={column.id}
                        sectionId={section.id}
                        selected={selection?.kind === 'block' && selection.id === block.id}
                        context={context}
                        dispatch={dispatch}
                        onSelect={() => dispatch({ type: 'SELECT', selection: { kind: 'block', id: block.id } })}
                      />
                    ))}
                  </div>
                </SortableContext>
                <div onClick={e => e.stopPropagation()}>
                  <AddBlockMenu
                    surface={context.surface}
                    onAdd={type => dispatch({ type: 'ADD_BLOCK', sectionId: section.id, columnId: column.id, blockType: type })}
                  />
                </div>
              </ColumnDropZone>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SectionShell
