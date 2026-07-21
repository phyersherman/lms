import React, { useState, useEffect } from 'react'
import { BlockNode, parseConfig } from '../types'

export interface FormBlockConfig {
  formId?: string
  submitLabel?: string
  align?: 'left' | 'center'
}

export const DEFAULT_FORM_CONFIG: FormBlockConfig = { formId: '', submitLabel: 'Submit', align: 'left' }

interface FormField {
  key: string
  label: string
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'tel'
  required?: boolean
  options?: string[]
  placeholder?: string
}

interface PublicForm {
  id: string
  name: string
  fields: FormField[]
  success_message?: string | null
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: 15,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: 'white',
  color: '#1e293b',
}

// Renders a configured form on the public site and posts submissions to the
// public endpoint. In the editor it renders the same UI (submission disabled).
const FormDisplay: React.FC<{ block: BlockNode }> = ({ block }) => {
  const config = parseConfig(block, DEFAULT_FORM_CONFIG)
  const [form, setForm] = useState<PublicForm | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!config.formId) return
    let cancelled = false
    fetch(`/api/public/forms/${config.formId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Form not found'))))
      .then(f => { if (!cancelled) setForm(f) })
      .catch(e => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [config.formId])

  if (!config.formId) {
    return (
      <div style={{ padding: 24, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', textAlign: 'center', fontSize: 14 }}>
        Form block — choose a form in the settings panel
      </div>
    )
  }
  if (loadError) {
    return <div style={{ padding: 16, color: '#991b1b', fontSize: 14 }}>Could not load form.</div>
  }
  if (!form) return <div style={{ padding: 16, color: '#94a3b8', fontSize: 14 }}>Loading form…</div>

  if (state === 'done') {
    return (
      <div style={{ padding: 24, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontSize: 16, textAlign: 'center' }}>
        {message}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('submitting')
    try {
      const res = await fetch(`/api/public/forms/${form.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: values,
          pageSlug: typeof window !== 'undefined' ? window.location.pathname.replace(/^\//, '') : '',
          _hp: (values as any)._hp || '',
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Submission failed')
      setMessage(payload.message || form.success_message || 'Thanks!')
      setState('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: config.align === 'center' ? 520 : undefined, margin: config.align === 'center' ? '0 auto' : undefined }}>
      {(form.fields || []).map(f => (
        <div key={f.key} style={{ marginBottom: 14 }}>
          {f.type !== 'checkbox' && (
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 14 }}>
              {f.label}{f.required && ' *'}
            </label>
          )}
          {f.type === 'textarea' ? (
            <textarea
              rows={4}
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.key] || ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              style={inputStyle}
            />
          ) : f.type === 'select' ? (
            <select
              required={f.required}
              value={values[f.key] || ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— Select —</option>
              {(f.options || []).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : f.type === 'checkbox' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!values[f.key]}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.checked }))}
              />
              {f.label}{f.required && ' *'}
            </label>
          ) : (
            <input
              type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.key] || ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              style={inputStyle}
            />
          )}
        </div>
      ))}

      {/* Honeypot — hidden from real users, bots fill it */}
      <input
        type="text"
        name="_hp"
        value={(values as any)._hp || ''}
        onChange={e => setValues(v => ({ ...v, _hp: e.target.value }))}
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {state === 'error' && <p style={{ color: '#dc2626', fontSize: 14 }}>{message}</p>}

      <button
        type="submit"
        disabled={state === 'submitting'}
        style={{
          background: 'var(--color-primary, #0ea5a4)',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '12px 28px',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: state === 'submitting' ? 0.7 : 1,
          display: config.align === 'center' ? 'block' : undefined,
          margin: config.align === 'center' ? '0 auto' : undefined,
        }}
      >
        {state === 'submitting' ? 'Sending…' : config.submitLabel || 'Submit'}
      </button>
    </form>
  )
}

export default FormDisplay
