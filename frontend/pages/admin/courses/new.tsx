import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../src/auth/AuthProvider'
import AdminLayout from '../../../src/components/AdminLayout'
import api from '../../../src/lib/api'
import { CourseEditor, CourseData, Chapter } from '../../../src/components/CourseEditor'
import { IBlock } from '../../../src/components/BlockEditor/types'

interface Tenant {
  id: string
  name: string
}

interface Course {
  id: string
  title: string
  description?: string
  chapters?: Chapter[]
}

const NewCoursePage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { tenantId: queryTenantId } = router.query
  
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [selectedSourceCourseId, setSelectedSourceCourseId] = useState<string>('')
  const [initialData, setInitialData] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load tenants and courses on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tenantsData, coursesData] = await Promise.all([
          api.getTenants(),
          api.getGlobalCourses(),
        ])
        setTenants(Array.isArray(tenantsData) ? tenantsData : [])
        setCourses(Array.isArray(coursesData) ? coursesData : [])
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle query param for tenant
  useEffect(() => {
    if (queryTenantId && typeof queryTenantId === 'string') {
      setSelectedTenantId(queryTenantId)
      const loadTenant = async () => {
        try {
          const t = await api.getTenant(queryTenantId)
          setTenant(t)
        } catch (err) {
          setTenant(null)
        }
      }
      loadTenant()
      updateInitialData('', queryTenantId, '')
    }
  }, [queryTenantId])

  const updateInitialData = (sourceCourseId: string, tenantId: string, clearSource = '') => {
    if (sourceCourseId) {
      // Copy from existing course
      const source = courses.find(c => c.id === sourceCourseId)
      if (source) {
        setInitialData({
          title: `${source.title} (Copy)`,
          description: source.description || '',
          chapters: source.chapters || [],
          tenantId: tenantId || null,
        } as any)
      }
    } else {
      // Blank course
      setInitialData({
        title: '',
        description: '',
        chapters: [],
        tenantId: tenantId || null,
      })
    }
  }

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tenantId = e.target.value
    setSelectedTenantId(tenantId)
    updateInitialData(selectedSourceCourseId, tenantId)
  }

  const handleSourceCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value
    setSelectedSourceCourseId(courseId)
    updateInitialData(courseId, selectedTenantId)
  }

  if (!user) return <AdminLayout title="New Course"><div>Loading...</div></AdminLayout>
  if (user.role !== 'admin') return <AdminLayout title="New Course"><div>Unauthorized</div></AdminLayout>
  if (loading) return <AdminLayout title="New Course"><div>Loading...</div></AdminLayout>
  if (!initialData) return <AdminLayout title="New Course"><div>Loading...</div></AdminLayout>

  const backUrl = selectedTenantId ? `/admin/tenants/${selectedTenantId}` : '/admin/courses'

  const handleSave = async (data: CourseData) => {
    if (!selectedTenantId) {
      alert('Please select a tenant for this course')
      return
    }

    setSaving(true)
    try {
      const isCreating = !courseId
      
      if (isCreating) {
        const result = await api.createCourse(data.title, data.description, selectedTenantId)
        setCourseId(result.id)
        // persist the full structure (chapters/modules/blocks) built before first save
        if (data.chapters && data.chapters.length > 0) {
          await api.updateCourse(result.id, data.title, data.description, data.chapters)
        }
        alert('Course created successfully')
      } else {
        await api.updateCourse(courseId, data.title, data.description, data.chapters)
        alert('Course saved successfully')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert(`Save failed: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  // Show selectors only if no tenant context provided
  const isContextAware = !!queryTenantId
  const pageTitle = tenant ? `New Course - ${tenant.name}` : 'New Course'

  const TenantAndSourceSelector = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
      {/* Tenant Selection */}
      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: 8, 
        padding: 20
      }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
          Select Tenant *
        </label>
        <select
          value={selectedTenantId}
          onChange={handleTenantChange}
          style={{ 
            width: '100%', 
            padding: '8px 12px', 
            border: '1px solid #e2e8f0', 
            borderRadius: 6, 
            fontSize: 14,
            background: 'white'
          }}
        >
          <option value="">-- Select Tenant --</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Copy From Selection */}
      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: 8, 
        padding: 20
      }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
          Copy From (Optional)
        </label>
        <select
          value={selectedSourceCourseId}
          onChange={handleSourceCourseChange}
          style={{ 
            width: '100%', 
            padding: '8px 12px', 
            border: '1px solid #e2e8f0', 
            borderRadius: 6, 
            fontSize: 14,
            background: 'white'
          }}
        >
          <option value="">-- Start from Blank --</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
    </div>
  )

  return (
    <AdminLayout title={pageTitle}>
      <div style={{ maxWidth: 1400 }}>
        {!isContextAware && <TenantAndSourceSelector />}
        <CourseEditor
          mode={courseId ? 'edit' : 'create'}
          entityType="course"
          initialData={initialData}
          onSave={handleSave}
          saving={saving}
          backUrl={backUrl}
          backLabel={selectedTenantId ? 'Back to Tenant' : 'Back to Courses'}
        />
      </div>
    </AdminLayout>
  )
}

export default NewCoursePage
