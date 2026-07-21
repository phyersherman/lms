import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PageContent } from '../blocks/types'
import SectionShell from './SectionShell'
import Inspector from './Inspector'
import { usePageDraft } from './usePageDraft'
import styles from './PageEditor.module.css'

export type DeviceMode = 'desktop' | 'tablet' | 'mobile'
const DEVICE_WIDTHS: Record<DeviceMode, string> = { desktop: '100%', tablet: '768px', mobile: '390px' }

interface Props {
  initialContent: PageContent
  // Called (debounced) whenever the draft changes; resolve => saved state shown
  onSaveDraft: (content: PageContent) => Promise<void>
  onPublish?: (content: PageContent) => Promise<void>
  headerLeft?: React.ReactNode // back link / page title area
  headerRight?: React.ReactNode // extra actions (settings, etc.)
  publishedAt?: string | null
  tenantId?: string // enables tenant-scoped pickers (forms, assets) in the inspector
}

const PageEditor: React.FC<Props> = ({ initialContent, onSaveDraft, onPublish, headerLeft, headerRight, publishedAt, tenantId }) => {
  const { state, dispatch } = usePageDraft(initialContent)
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved')
  const [publishing, setPublishing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(state.content)
  contentRef.current = state.content

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const doSave = useCallback(async () => {
    setSaveState('saving')
    try {
      await onSaveDraft(contentRef.current)
      dispatch({ type: 'MARK_SAVED' })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [onSaveDraft, dispatch])

  // Debounced autosave
  useEffect(() => {
    if (!state.dirty) return
    setSaveState('dirty')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 1500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state.content, state.dirty, doSave])

  // Keyboard: undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const target = e.target as HTMLElement
      // Let text inputs and the rich-text editor keep their native undo
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeData: any = active.data.current
    const overData: any = over.data.current

    if (activeData?.type === 'section') {
      if (overData?.type === 'section') {
        dispatch({ type: 'REORDER_SECTIONS', activeId: String(active.id), overId: String(over.id) })
      }
      return
    }

    if (activeData?.type === 'block') {
      // Find where the block currently is
      let fromColumnId = activeData.columnId as string
      let fromIndex = -1
      for (const s of state.content.sections) {
        for (const c of s.columns) {
          const i = c.blocks.findIndex(b => b.id === active.id)
          if (i !== -1) {
            fromColumnId = c.id
            fromIndex = i
          }
        }
      }

      if (overData?.type === 'block') {
        // Dropped on another block: insert at its position
        for (const s of state.content.sections) {
          for (const c of s.columns) {
            const overIndex = c.blocks.findIndex(b => b.id === over.id)
            if (overIndex !== -1) {
              let toIndex = overIndex
              if (c.id === fromColumnId && fromIndex < overIndex) toIndex = overIndex // arrayMove semantics after removal
              dispatch({ type: 'MOVE_BLOCK', blockId: String(active.id), toColumnId: c.id, toIndex })
              return
            }
          }
        }
      } else if (overData?.type === 'column') {
        // Dropped on an (empty area of a) column: append
        const col = state.content.sections.flatMap(s => s.columns).find(c => c.id === overData.columnId)
        dispatch({ type: 'MOVE_BLOCK', blockId: String(active.id), toColumnId: overData.columnId, toIndex: col ? col.blocks.length : 0 })
      }
    }
  }

  const handlePublish = async () => {
    if (!onPublish) return
    setPublishing(true)
    try {
      // Flush pending draft first so publish captures latest content
      await onSaveDraft(contentRef.current)
      dispatch({ type: 'MARK_SAVED' })
      setSaveState('saved')
      await onPublish(contentRef.current)
    } catch {
      setSaveState('error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className={styles.editorRoot}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>{headerLeft}</div>

        <div className={styles.deviceToggle}>
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map(m => (
            <button
              key={m}
              type="button"
              className={device === m ? styles.deviceActive : ''}
              onClick={() => setDevice(m)}
              title={m}
            >
              {m === 'desktop' ? '🖥' : m === 'tablet' ? '📱' : '📲'}
            </button>
          ))}
        </div>

        <div className={styles.topbarRight}>
          <button type="button" className={styles.topbarButton} onClick={() => dispatch({ type: 'UNDO' })} disabled={!state.past.length} title="Undo (Cmd+Z)">
            ↩
          </button>
          <button type="button" className={styles.topbarButton} onClick={() => dispatch({ type: 'REDO' })} disabled={!state.future.length} title="Redo (Cmd+Shift+Z)">
            ↪
          </button>
          <span className={styles.saveState}>
            {saveState === 'saved' && '✓ Saved'}
            {saveState === 'dirty' && '…'}
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'error' && <span style={{ color: '#dc2626' }}>Save failed</span>}
          </span>
          {headerRight}
          {onPublish && (
            <button type="button" className={styles.publishButton} onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing…' : publishedAt ? 'Publish changes' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.workArea}>
        <div className={styles.canvasScroll} onClick={() => dispatch({ type: 'SELECT', selection: null })}>
          <div className={styles.canvas} style={{ maxWidth: DEVICE_WIDTHS[device] }}>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <SortableContext items={state.content.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {state.content.sections.map(section => (
                  <SectionShell
                    key={section.id}
                    section={section}
                    selection={state.selection}
                    context={{ surface: 'site' }}
                    dispatch={dispatch}
                    contentSnapshot={() => contentRef.current}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className={styles.addSectionRow} onClick={e => e.stopPropagation()}>
              <button type="button" className={styles.addBlockButton} onClick={() => dispatch({ type: 'ADD_SECTION' })}>
                + Add section
              </button>
            </div>
          </div>
        </div>

        <Inspector content={state.content} selection={state.selection} dispatch={dispatch} tenantId={tenantId} />
      </div>
    </div>
  )
}

export default PageEditor
