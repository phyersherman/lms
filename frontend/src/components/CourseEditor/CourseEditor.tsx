import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IBlock } from '../BlockEditor/types'
import ModuleBlocksEditor from '../PageEditor/ModuleBlocksEditor'
import { Chapter, Module, CourseData, EditorMode, EntityType } from './types'
import { createChapter, createModule, generateSlug, moveItem, createQuizBlock } from './utils'
import styles from './CourseEditor.module.css'

interface CourseEditorProps {
  mode: EditorMode
  entityType: EntityType
  initialData: CourseData
  onSave: (data: CourseData) => Promise<void>
  onDelete?: () => Promise<void>
  saving?: boolean
  backUrl: string
  backLabel?: string
}

const CourseEditor: React.FC<CourseEditorProps> = ({
  mode,
  entityType,
  initialData,
  onSave,
  onDelete,
  saving = false,
  backUrl,
  backLabel = 'Back',
}) => {
  // Core data state
  const [title, setTitle] = useState(initialData.title)
  const [description, setDescription] = useState(initialData.description || '')
  const [chapters, setChapters] = useState<Chapter[]>(initialData.chapters || [])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // UI state for adding chapters
  const [newChapterTitle, setNewChapterTitle] = useState('')
  
  // Module editor state
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null)
  const [editingModuleIndex, setEditingModuleIndex] = useState<number | null>(null)
  const [isCreatingModule, setIsCreatingModule] = useState(false)
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleSlug, setModuleSlug] = useState('')
  const [moduleSummary, setModuleSummary] = useState('')
  const [moduleBlocks, setModuleBlocks] = useState<IBlock[]>([])
  
  // Assessment modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [assessmentChapterIndex, setAssessmentChapterIndex] = useState<number | null>(null)
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [assessmentRequired, setAssessmentRequired] = useState(false)

  const router = useRouter()
  const entityLabel = entityType === 'template' ? 'Template' : 'Course'
  const isModuleEditorOpen = editingChapterIndex !== null

  // Track unsaved changes whenever data is modified
  useEffect(() => {
    const dataChanged = 
      title !== initialData.title ||
      description !== (initialData.description || '') ||
      JSON.stringify(chapters) !== JSON.stringify(initialData.chapters || [])
    setHasUnsavedChanges(dataChanged)
  }, [title, description, chapters, initialData])

  // Handle exit with confirmation
  const handleExit = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push(backUrl)
      }
    } else {
      router.push(backUrl)
    }
  }, [hasUnsavedChanges, backUrl, router])

  // ========== Chapter Operations ==========
  
  const handleAddChapter = useCallback(() => {
    if (!newChapterTitle.trim()) {
      alert('Please enter a chapter title')
      return
    }
    const chapter = createChapter(newChapterTitle.trim())
    setChapters(prev => [...prev, chapter])
    setNewChapterTitle('')
  }, [newChapterTitle])

  const handleRemoveChapter = useCallback((index: number) => {
    if (!confirm(`Are you sure you want to remove this chapter?`)) return
    setChapters(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleReorderChapter = useCallback((index: number, direction: 'up' | 'down') => {
    setChapters(prev => moveItem(prev, index, direction))
  }, [])

  // ========== Module Operations ==========

  const openModuleEditor = useCallback((chapterIdx: number, moduleIdx?: number) => {
    setEditingChapterIndex(chapterIdx)
    
    if (moduleIdx !== undefined) {
      // Editing existing module
      const module = chapters[chapterIdx].modules[moduleIdx]
      setEditingModuleIndex(moduleIdx)
      setIsCreatingModule(false)
      setModuleTitle(module.title)
      setModuleSlug(module.slug)
      setModuleSummary(module.summary || '')
      setModuleBlocks(module.blocks || [])
    } else {
      // Creating new module
      setEditingModuleIndex(null)
      setIsCreatingModule(true)
      setModuleTitle('')
      setModuleSlug('')
      setModuleSummary('')
      setModuleBlocks([])
    }
  }, [chapters])

  const closeModuleEditor = useCallback(() => {
    setEditingChapterIndex(null)
    setEditingModuleIndex(null)
    setIsCreatingModule(false)
    setModuleTitle('')
    setModuleSlug('')
    setModuleSummary('')
    setModuleBlocks([])
  }, [])

  const handleSaveModule = useCallback(() => {
    if (!moduleTitle.trim()) {
      alert('Please enter a module title')
      return
    }
    if (editingChapterIndex === null) return

    const slug = moduleSlug.trim() || generateSlug(moduleTitle)
    const chapterIdx = editingChapterIndex
    const moduleIdx = editingModuleIndex
    const creating = isCreatingModule
    const title = moduleTitle.trim()
    const summary = moduleSummary
    const blocks = [...moduleBlocks]
    
    // Close editor first to prevent double-calls
    setEditingChapterIndex(null)
    setEditingModuleIndex(null)
    setIsCreatingModule(false)
    setModuleTitle('')
    setModuleSlug('')
    setModuleSummary('')
    setModuleBlocks([])
    
    // Then update chapters
    setChapters(prev => {
      const updated = prev.map((chapter, idx) => {
        if (idx !== chapterIdx) return chapter
        
        if (creating) {
          // Add new module
          const newModule = createModule(title, chapter.modules.length)
          newModule.slug = slug
          newModule.summary = summary
          newModule.blocks = blocks
          return {
            ...chapter,
            modules: [...chapter.modules, newModule]
          }
        } else if (moduleIdx !== null) {
          // Update existing module
          return {
            ...chapter,
            modules: chapter.modules.map((mod, mIdx) => 
              mIdx === moduleIdx 
                ? { ...mod, title, slug, summary, blocks }
                : mod
            )
          }
        }
        return chapter
      })
      return updated
    })
  }, [editingChapterIndex, editingModuleIndex, isCreatingModule, moduleTitle, moduleSlug, moduleSummary, moduleBlocks])

  const handleDeleteModule = useCallback((chapterIdx: number, moduleIdx: number) => {
    if (!confirm('Delete this module?')) return
    setChapters(prev => {
      const updated = [...prev]
      updated[chapterIdx].modules = updated[chapterIdx].modules.filter((_, i) => i !== moduleIdx)
      return updated
    })
  }, [])

  const handleReorderModule = useCallback((chapterIdx: number, moduleIdx: number, direction: 'up' | 'down') => {
    setChapters(prev => {
      const updated = [...prev]
      updated[chapterIdx].modules = moveItem(updated[chapterIdx].modules, moduleIdx, direction)
      return updated
    })
  }, [])

  // ========== Assessment Operations ==========

  const openAssessmentEditor = useCallback((chapterIdx: number) => {
    const chapter = chapters[chapterIdx]
    setAssessmentChapterIndex(chapterIdx)
    setAssessmentTitle(chapter.assessmentTitle || `${chapter.title} Assessment`)
    setAssessmentRequired(chapter.assessmentRequired || false)
    setAssessmentModalOpen(true)
  }, [chapters])

  const handleSaveAssessment = useCallback(() => {
    if (assessmentChapterIndex === null) return
    if (!assessmentTitle.trim()) {
      alert('Please enter an assessment title')
      return
    }

    setChapters(prev => {
      const updated = [...prev]
      updated[assessmentChapterIndex].assessmentTitle = assessmentTitle
      updated[assessmentChapterIndex].assessmentRequired = assessmentRequired
      
      // Create or update assessment module
      const modules = updated[assessmentChapterIndex].modules || []
      const assessmentModuleIdx = modules.findIndex(m => m.slug === 'assessment')
      const quizBlock = createQuizBlock(assessmentTitle, assessmentRequired)
      
      if (assessmentModuleIdx >= 0) {
        // Update existing assessment module
        modules[assessmentModuleIdx].blocks = [quizBlock]
      } else {
        // Create new assessment module
        const assessmentModule = createModule(assessmentTitle, modules.length)
        assessmentModule.slug = 'assessment'
        assessmentModule.blocks = [quizBlock]
        modules.push(assessmentModule)
      }
      
      updated[assessmentChapterIndex].modules = modules
      return updated
    })
    
    setAssessmentModalOpen(false)
  }, [assessmentChapterIndex, assessmentTitle, assessmentRequired])

  // ========== Save Operations ==========

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert(`Please enter a ${entityLabel.toLowerCase()} title`)
      return
    }

    const data: CourseData = {
      id: initialData.id,
      title: title.trim(),
      description: description.trim() || undefined,
      chapters,
      tenantId: initialData.tenantId,
    }

    await onSave(data)
    setHasUnsavedChanges(false)
  }, [title, description, chapters, initialData.id, initialData.tenantId, entityLabel, onSave])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return
    if (!confirm(`Are you sure you want to delete this ${entityLabel.toLowerCase()}? This cannot be undone.`)) return
    await onDelete()
  }, [onDelete, entityLabel])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {mode === 'create' ? `New ${entityLabel}` : `Edit ${entityLabel}`}
        </h1>
        <button
          type="button"
          onClick={handleExit}
          className={styles.backLink}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#667eea',
            textDecoration: 'none',
            fontSize: 14,
            padding: 0
          }}
        >
          ← Exit
        </button>
      </div>

      <div className={styles.layout}>
        {/* Left Column: Main Form */}
        <div className={styles.mainColumn}>
          <form onSubmit={handleSave} className={styles.card}>
            <h2 className={styles.cardTitle}>{entityLabel} Details</h2>
            
            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`Enter ${entityLabel.toLowerCase()} title`}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`Enter ${entityLabel.toLowerCase()} description`}
                className={styles.textarea}
              />
            </div>

            {/* Chapters Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Chapters</h3>
              
              {chapters.length === 0 ? (
                <p className={styles.emptyState}>No chapters yet. Add one below to get started.</p>
              ) : (
                <div className={styles.chapterList}>
                  {chapters.map((chapter, chapterIdx) => (
                    <div key={chapter.id} className={styles.chapterCard}>
                      <div className={styles.chapterHeader}>
                        <div className={styles.chapterInfo}>
                          <span className={styles.chapterTitle}>{chapter.title}</span>
                          <span className={styles.chapterMeta}>{chapter.modules.length} modules</span>
                        </div>
                        <div className={styles.chapterActions}>
                          <button
                            type="button"
                            onClick={() => handleReorderChapter(chapterIdx, 'up')}
                            disabled={chapterIdx === 0}
                            className={styles.iconButton}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorderChapter(chapterIdx, 'down')}
                            disabled={chapterIdx === chapters.length - 1}
                            className={styles.iconButton}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssessmentEditor(chapterIdx)}
                            className={styles.iconButton}
                            title="Add Assessment"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(chapterIdx)}
                            className={`${styles.iconButton} ${styles.danger}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Modules List */}
                      {chapter.modules.length > 0 && (
                        <div className={styles.moduleList}>
                          {chapter.modules.map((module, moduleIdx) => (
                            <div key={module.id} className={styles.moduleItem}>
                              <div className={styles.moduleInfo}>
                                <span className={styles.moduleTitle}>{module.title}</span>
                                {module.blocks && module.blocks.length > 0 && (
                                  <span className={styles.moduleMeta}>{module.blocks.length} blocks</span>
                                )}
                              </div>
                              <div className={styles.moduleActions}>
                                <button
                                  type="button"
                                  onClick={() => handleReorderModule(chapterIdx, moduleIdx, 'up')}
                                  disabled={moduleIdx === 0}
                                  className={styles.smallButton}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReorderModule(chapterIdx, moduleIdx, 'down')}
                                  disabled={moduleIdx === chapter.modules.length - 1}
                                  className={styles.smallButton}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openModuleEditor(chapterIdx, moduleIdx)}
                                  className={`${styles.smallButton} ${styles.primary}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteModule(chapterIdx, moduleIdx)}
                                  className={`${styles.smallButton} ${styles.danger}`}
                                >
                                  Del
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Module Button */}
                      <button
                        type="button"
                        onClick={() => openModuleEditor(chapterIdx)}
                        className={styles.addModuleButton}
                      >
                        + Add Module
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Chapter Form */}
              <div className={styles.addChapterForm}>
                <h4 className={styles.addChapterTitle}>Add Chapter</h4>
                <div className={styles.addChapterRow}>
                  <input
                    type="text"
                    value={newChapterTitle}
                    onChange={e => setNewChapterTitle(e.target.value)}
                    placeholder="Chapter title"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className={styles.addButton}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? '💾 Saving...' : `💾 Save ${entityLabel}`}
              </button>
              {onDelete && mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.deleteButton}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Module Editor Panel */}
        <div className={styles.sideColumn}>
          {isModuleEditorOpen && (
            <div className={styles.card}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>
                  {isCreatingModule ? 'New Module' : 'Edit Module'}
                </h3>
                <button
                  type="button"
                  onClick={closeModuleEditor}
                  className={styles.closeButton}
                >
                  ✕
                </button>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Module Title</label>
                <input
                  type="text"
                  value={moduleTitle}
                  onChange={e => setModuleTitle(e.target.value)}
                  placeholder="Enter module title"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Slug</label>
                <input
                  type="text"
                  value={moduleSlug}
                  onChange={e => setModuleSlug(e.target.value)}
                  placeholder="Auto-generated from title"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Summary</label>
                <textarea
                  value={moduleSummary}
                  onChange={e => setModuleSummary(e.target.value)}
                  placeholder="Brief description"
                  className={styles.textareaSmall}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Content Blocks</label>
                <ModuleBlocksEditor
                  blocks={moduleBlocks as any}
                  onBlocksChange={blocks => setModuleBlocks(blocks as unknown as IBlock[])}
                />
              </div>

              <div className={styles.panelActions}>
                <button
                  type="button"
                  onClick={handleSaveModule}
                  className={styles.saveButton}
                >
                  {isCreatingModule ? 'Add Module' : 'Save Module'}
                </button>
                <button
                  type="button"
                  onClick={closeModuleEditor}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Assessment Modal */}
          {assessmentModalOpen && (
            <div className={styles.card}>
              <h3 className={styles.panelTitle}>Chapter Assessment</h3>

              <div className={styles.field}>
                <label className={styles.label}>Assessment Title</label>
                <input
                  type="text"
                  value={assessmentTitle}
                  onChange={e => setAssessmentTitle(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.checkboxField}>
                <input
                  type="checkbox"
                  id="assessment-required"
                  checked={assessmentRequired}
                  onChange={e => setAssessmentRequired(e.target.checked)}
                />
                <label htmlFor="assessment-required">Passing is required to continue</label>
              </div>

              <div className={styles.panelActions}>
                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  className={styles.saveButton}
                >
                  Add Assessment
                </button>
                <button
                  type="button"
                  onClick={() => setAssessmentModalOpen(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourseEditor
