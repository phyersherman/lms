import React, { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

// Click-to-edit plain text, used inside blocks on the editor canvas (hero
// headings, button labels, quotes…). Uncontrolled contentEditable so the
// caret survives re-renders; syncs from props only while unfocused (undo/redo).
const InlineText: React.FC<Props> = ({ value, onChange, placeholder, style }) => {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-inline-edit="true"
      spellCheck={false}
      data-placeholder={placeholder}
      style={{ outline: 'none', cursor: 'text', minWidth: 20, display: 'inline-block', ...style }}
      onInput={e => onChange(e.currentTarget.textContent || '')}
      onKeyDown={e => {
        // single-line fields: Enter commits instead of inserting a newline
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLElement).blur()
        }
        e.stopPropagation()
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

export default InlineText
