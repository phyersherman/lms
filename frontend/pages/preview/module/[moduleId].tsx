import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import api from '../../../src/lib/api'
import BlockDisplay from '../../../src/components/blocks/BlockDisplay'

const ModulePreview: React.FC = () => {
  const router = useRouter()
  const { moduleId } = router.query
  const [module, setModule] = useState<any>(null)

  useEffect(() => {
    if (moduleId && typeof moduleId === 'string') {
      const loadModule = async () => {
        try {
          const data = await api.getModule(moduleId)
          setModule(data)
        } catch (err) {
          setModule(null)
        }
      }
      loadModule()
    }
  }, [moduleId])

  if (!module) return <div>Loading...</div>

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1>{module.title}</h1>
      <p>{module.summary}</p>
      {module.blocks
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((block: any) => (
          <div key={block.id} style={{ marginBottom: 20 }}>
            <BlockDisplay block={block} context={{ surface: 'lms' }} />
          </div>
        ))}
    </div>
  )
}

export default ModulePreview
