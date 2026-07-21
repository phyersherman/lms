import React, { useState, useRef, useEffect } from 'react'
import { blockTypesForSurface } from '../blocks/registry'
import styles from './PageEditor.module.css'

interface Props {
  surface: 'site' | 'lms'
  onAdd: (blockType: string) => void
  label?: string
}

const AddBlockMenu: React.FC<Props> = ({ surface, onAdd, label = '+ Add block' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className={styles.addBlockWrap} ref={ref}>
      <button type="button" className={styles.addBlockButton} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div className={styles.addBlockMenu}>
          {blockTypesForSurface(surface).map(t => (
            <button
              key={t.type}
              type="button"
              className={styles.addBlockItem}
              onClick={() => {
                onAdd(t.type)
                setOpen(false)
              }}
            >
              <span className={styles.addBlockIcon}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AddBlockMenu
