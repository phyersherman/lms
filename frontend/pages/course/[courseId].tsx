import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import BlockDisplay from '../../src/components/blocks/BlockDisplay'
import api from '../../src/lib/api'
import LearnerLayout from '../../src/components/LearnerLayout'

interface Module {
  id: string
  title: string
  summary?: string
  order_index: number
  blocks: Block[]
}

interface Block {
  id: string
  type: string
  content?: string
  config?: string
  order_index?: number
}

interface Chapter {
  id: string
  title: string
  order_index: number
  modules: Module[]
  completed?: boolean
}

interface Course {
  id: string
  title: string
  description?: string
  chapters: Chapter[]
}

interface ModuleAccessStatus {
  accessible: boolean
  reason?: string
}

interface Progress {
  completedModules: string[]
  completedChapters: string[]
  courseCompleted: boolean
  courseCompletedAt?: string
  certificateId?: string | null
}

const CourseViewPage: React.FC = () => {
  const router = useRouter()
  const { courseId } = router.query
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<Progress>({
    completedModules: [],
    completedChapters: [],
    courseCompleted: false,
  })
  const [loading, setLoading] = useState(true)
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([])
  const [moduleAccessStatus, setModuleAccessStatus] = useState<Record<string, ModuleAccessStatus>>({})
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)

  useEffect(() => {
    if (!courseId || typeof courseId !== 'string') return

    const fetchCourseAndProgress = async () => {
      try {
        const [courseData, progressData] = await Promise.all([
          api.getCourse(courseId),
          api.getCourseProgress(courseId),
        ])
        setCourse(courseData)
        setProgress({
          completedModules: progressData.completedModules || [],
          completedChapters: progressData.completedChapters || [],
          courseCompleted: progressData.courseCompleted,
          courseCompletedAt: progressData.courseCompletedAt,
          certificateId: progressData.certificateId,
        })
        setLoading(false)

        // Check access for all modules
        if (courseData.chapters) {
          for (const chapter of courseData.chapters) {
            for (const module of chapter.modules) {
              checkModuleAccess(module.id, courseId)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching course:', err)
        setLoading(false)
      }
    }

    fetchCourseAndProgress()
  }, [courseId])

  // Show completion screen when course is just finished
  useEffect(() => {
    if (progress.courseCompleted && !showCompletionScreen) {
      setShowCompletionScreen(true)
    }
  }, [progress.courseCompleted])

  const checkModuleAccess = async (moduleId: string, cId: string) => {
    try {
      const status = await api.getModuleAccess(moduleId, cId)
      setModuleAccessStatus(prev => ({
        ...prev,
        [moduleId]: status,
      }))
    } catch (err) {
      console.error('Error checking module access:', err)
    }
  }

  const toggleChapter = (chapterId: string) => {
    setExpandedChapterIds(prev =>
      prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]
    )
  }

  if (loading) {
    return (
      <LearnerLayout title="Loading Course">
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p>Loading course...</p>
        </div>
      </LearnerLayout>
    )
  }

  if (!course) {
    return (
      <LearnerLayout title="Course Not Found">
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p>Course not found</p>
        </div>
      </LearnerLayout>
    )
  }

  // Calculate course progress percentage
  let totalModules = 0
  let totalChapters = course.chapters.length
  for (const chapter of course.chapters) {
    totalModules += chapter.modules.length
  }
  const courseProgressPercent = totalModules > 0 ? (progress.completedModules.length / totalModules) * 100 : 0

  return (
    <LearnerLayout title={course.title}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>{course.title}</h1>
          {progress.courseCompleted && (
            <span style={{ background: '#d4edda', color: '#155724', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
              ✓ Completed
            </span>
          )}
        </div>
        {course.description && (
          <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
            {course.description}
          </p>
        )}
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
            <div
              style={{
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                height: '100%',
                width: `${courseProgressPercent}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '13px', color: '#666', minWidth: '50px', textAlign: 'right' }}>
            {Math.round(courseProgressPercent)}%
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
        {/* Left sidebar: Course outline */}
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>
            Course Content
          </h2>

          {course.chapters.map(chapter => {
            const chapterModulesCompleted = chapter.modules.filter(m => progress.completedModules.includes(m.id)).length
            const chapterProgressPercent = chapter.modules.length > 0 ? (chapterModulesCompleted / chapter.modules.length) * 100 : 0

            return (
              <div key={chapter.id} style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => {
                    toggleChapter(chapter.id)
                    setSelectedChapterId(chapter.id)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: expandedChapterIds.includes(chapter.id) ? '#f0f4ff' : '#fafbfc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {progress.completedChapters.includes(chapter.id) && (
                      <span style={{ fontSize: '14px' }}>✓</span>
                    )}
                    {chapter.title}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {expandedChapterIds.includes(chapter.id) ? '▼' : '▶'} {chapterModulesCompleted}/{chapter.modules.length}
                  </span>
                </button>

                {expandedChapterIds.includes(chapter.id) && (
                  <div style={{ paddingLeft: '12px', marginTop: '8px' }}>
                    {chapter.modules.map(module => {
                      const status = moduleAccessStatus[module.id]
                      const isLocked = status && !status.accessible
                      const isCompleted = progress.completedModules.includes(module.id)

                      return (
                        <button
                          key={module.id}
                          onClick={() => {
                            if (!isLocked) {
                              setSelectedModuleId(module.id)
                              setSelectedChapterId(chapter.id)
                            }
                          }}
                          disabled={isLocked}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            marginBottom: '6px',
                            background: selectedModuleId === module.id ? '#667eea' : '#f9fafb',
                            color: selectedModuleId === module.id ? 'white' : isLocked ? '#999' : '#333',
                            border: selectedModuleId === module.id ? '1px solid #667eea' : '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            opacity: isLocked ? 0.6 : 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          title={isLocked ? status?.reason : ''}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isCompleted && <span style={{ fontSize: '12px' }}>✓</span>}
                            {module.title}
                          </span>
                          {isLocked && <span style={{ fontSize: '12px' }}>🔒</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right side: Module content */}
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          {showCompletionScreen ? (
            <CourseCompletionScreen
              course={course}
              progress={progress}
              onBrowseCourse={() => setShowCompletionScreen(false)}
            />
          ) : selectedModuleId && selectedChapterId ? (
            <ModuleView
              courseId={courseId as string}
              chapterId={selectedChapterId}
              moduleId={selectedModuleId}
              onModuleSelect={setSelectedModuleId}
              onChapterSelect={(chId) => {
                setSelectedChapterId(chId)
                setExpandedChapterIds(prev => prev.includes(chId) ? prev : [...prev, chId])
              }}
              course={course}
              progress={progress}
              onProgressUpdate={() => {
                // Refresh progress and module access status
                if (courseId && typeof courseId === 'string') {
                  api.getCourseProgress(courseId).then(progressData => {
                    setProgress({
                      completedModules: progressData.completedModules || [],
                      completedChapters: progressData.completedChapters || [],
                      courseCompleted: progressData.courseCompleted,
                      courseCompletedAt: progressData.courseCompletedAt,
                      certificateId: progressData.certificateId,
                    })
                  })
                  // Refresh access status so sidebar locks update
                  if (course) {
                    for (const ch of course.chapters) {
                      for (const mod of ch.modules) {
                        checkModuleAccess(mod.id, courseId)
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
              <p>Select a module to view its content</p>
            </div>
          )}
        </div>
      </div>
    </LearnerLayout>
  )
}

interface CourseCompletionScreenProps {
  course: Course
  progress: Progress
  onBrowseCourse: () => void
}

const CourseCompletionScreen: React.FC<CourseCompletionScreenProps> = ({ course, progress, onBrowseCourse }) => {
  const completedAt = progress.courseCompletedAt ? new Date(progress.courseCompletedAt).toLocaleDateString() : 'Today'

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      <h2 style={{ fontSize: '28px', color: '#333', marginBottom: '12px' }}>
        Congratulations!
      </h2>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
        You have completed
      </p>
      <h3 style={{ fontSize: '22px', color: '#667eea', marginBottom: '24px' }}>
        {course.title}
      </h3>
      <p style={{ fontSize: '14px', color: '#999', marginBottom: '32px' }}>
        Completed on {completedAt}
      </p>

      {/* Certificate section */}
      {progress.certificateId ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📜</div>
          <h4 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>Certificate of Completion</h4>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: '0 0 20px 0' }}>
            Your certificate is ready!
          </p>
          <button
            onClick={() => api.downloadCertificate(progress.certificateId!)}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            📥 Download Certificate
          </button>
        </div>
      ) : (
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📜</div>
          <h4 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>Certificate of Completion</h4>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
            Your certificate is being generated...
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onBrowseCourse}
          style={{
            padding: '12px 24px',
            background: '#f0f4ff',
            color: '#667eea',
            border: '1px solid #667eea',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Review Course Content
        </button>
        <Link href="/my-courses" passHref legacyBehavior>
          <a
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Back to My Courses
          </a>
        </Link>
      </div>
    </div>
  )
}

interface ModuleViewProps {
  courseId: string
  chapterId: string
  moduleId: string
  onModuleSelect: (moduleId: string) => void
  onChapterSelect: (chapterId: string) => void
  course: Course
  progress: Progress
  onProgressUpdate: () => void
}

const ModuleView: React.FC<ModuleViewProps> = ({
  courseId,
  chapterId,
  moduleId,
  onModuleSelect,
  onChapterSelect,
  course,
  progress,
  onProgressUpdate,
}) => {
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModule = async () => {
      setLoading(true)
      try {
        const data = await api.getModule(moduleId)
        setModule(data)
      } catch (err) {
        console.error('Error fetching module:', err)
      } finally {
        setLoading(false)
      }
    }

    setError(null)
    fetchModule()
  }, [moduleId])

  const chapter = course.chapters.find(c => c.id === chapterId)
  if (!chapter) return <p>Chapter not found</p>

  const moduleIndex = chapter.modules.findIndex(m => m.id === moduleId)
  const isFirstModule = moduleIndex === 0
  const isLastModule = moduleIndex === chapter.modules.length - 1
  const prevModule = moduleIndex > 0 ? chapter.modules[moduleIndex - 1] : null
  const nextModule = moduleIndex < chapter.modules.length - 1 ? chapter.modules[moduleIndex + 1] : null
  const allChaptersIndex = course.chapters.findIndex(c => c.id === chapterId)
  const nextChapter = allChaptersIndex < course.chapters.length - 1 ? course.chapters[allChaptersIndex + 1] : null

  const isModuleCompleted = progress.completedModules.includes(moduleId)

  // Complete current module, then navigate forward
  const handleNext = async () => {
    setError(null)
    setCompleting(true)
    try {
      if (!isModuleCompleted) {
        const response = await api.completeModule(moduleId, courseId)
        onProgressUpdate()

        if (response.courseCompleted) return

        if (response.chapterCompleted && response.nextChapter) {
          const firstMod = response.nextChapter.modules?.[0]
          if (firstMod) {
            onChapterSelect(response.nextChapter.id)
            onModuleSelect(firstMod.id)
          }
          return
        }
      }

      // Navigate to next module in same chapter
      if (nextModule) {
        onModuleSelect(nextModule.id)
      } else if (nextChapter) {
        const firstMod = nextChapter.modules?.[0]
        if (firstMod) {
          onChapterSelect(nextChapter.id)
          onModuleSelect(firstMod.id)
        }
      }
    } catch (err: any) {
      const msg = err?.payload?.error || err?.message || 'Cannot complete this module yet.'
      setError(msg)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return <p>Loading module...</p>
  }

  if (!module) {
    return <p>Module not found</p>
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase', fontWeight: 600 }}>
              {chapter.title}
            </p>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#333' }}>
              {module.title}
            </h2>
          </div>
          {isModuleCompleted && (
            <span style={{ background: '#d4edda', color: '#155724', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
              ✓ Completed
            </span>
          )}
        </div>

        {module.summary && (
          <p style={{ color: '#666', marginBottom: '0', fontSize: '14px' }}>
            {module.summary}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '32px' }}>
        {module.blocks && module.blocks.length > 0 ? (
          [...module.blocks]
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((block) => (
              <BlockRenderer key={block.id} block={block} courseId={courseId} />
            ))
        ) : (
          <p style={{ color: '#999' }}>No content in this module</p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {prevModule && (
            <button
              onClick={() => onModuleSelect(prevModule.id)}
              style={{
                padding: '10px 16px',
                background: '#f0f4ff',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              ← Previous
            </button>
          )}

          {(nextModule || nextChapter) && (
            <button
              onClick={handleNext}
              disabled={completing}
              style={{
                padding: '10px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: completing ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '14px',
                opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? 'Completing...' : nextModule ? 'Next Module →' : 'Next Chapter →'}
            </button>
          )}

          {!nextModule && !nextChapter && !isModuleCompleted && (
            <button
              onClick={handleNext}
              disabled={completing}
              style={{
                padding: '10px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: completing ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '14px',
                opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? 'Completing...' : '✓ Complete Module'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface BlockRendererProps {
  block: Block
  courseId: string
}

// Thin wrapper over the shared block registry renderer.
const BlockRenderer: React.FC<BlockRendererProps> = ({ block, courseId }) => (
  <div style={{ marginBottom: '20px' }}>
    <BlockDisplay block={block} context={{ surface: 'lms', courseId }} />
  </div>
)

export default CourseViewPage
