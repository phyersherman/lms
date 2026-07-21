import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { BlockNode, PageContent, PageSection } from '../blocks/types'
import { BLOCK_REGISTRY } from '../blocks/registry'
import { BLOCK_INSPECTORS, COLUMN_LAYOUTS, FieldDef } from './inspectorSchema'
import { DraftDispatch, Selection } from './usePageDraft'
import QuizBlock from '../BlockEditor/blocks/QuizBlock'
import styles from './PageEditor.module.css'

interface Props {
  content: PageContent
  selection: Selection
  dispatch: DraftDispatch
  tenantId?: string
}

const parseConfig = (block: BlockNode): Record<string, any> => {
  try {
    return block.config ? JSON.parse(block.config) : {}
  } catch {
    return {}
  }
}

const Field: React.FC<{
  def: FieldDef
  value: any
  onChange: (value: any) => void
}> = ({ def, value, onChange }) => {
  const id = `insp-${def.key}`
  switch (def.input) {
    case 'checkbox':
      return (
        <label className={styles.inspectorCheckbox} htmlFor={id}>
          <input id={id} type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
          {def.label}
        </label>
      )
    case 'select':
      return (
        <div className={styles.inspectorField}>
          <label htmlFor={id}>{def.label}</label>
          <select id={id} value={value ?? ''} onChange={e => onChange(e.target.value)}>
            {(def.options || []).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )
    case 'color':
      return (
        <div className={styles.inspectorField}>
          <label htmlFor={id}>{def.label}</label>
          <div className={styles.colorRow}>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#000000'}
              onChange={e => onChange(e.target.value)}
            />
            <input id={id} type="text" value={value ?? ''} placeholder="#000000 or css color" onChange={e => onChange(e.target.value)} />
          </div>
        </div>
      )
    case 'textarea':
      return (
        <div className={styles.inspectorField}>
          <label htmlFor={id}>{def.label}</label>
          <textarea id={id} rows={3} value={value ?? ''} placeholder={def.placeholder} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'number':
      return (
        <div className={styles.inspectorField}>
          <label htmlFor={id}>{def.label}</label>
          <input
            id={id}
            type="number"
            value={value ?? ''}
            min={def.min}
            max={def.max}
            step={def.max !== undefined && def.max <= 1 ? 0.05 : 1}
            onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
      )
    default:
      return (
        <div className={styles.inspectorField}>
          <label htmlFor={id}>{def.label}</label>
          <input id={id} type="text" value={value ?? ''} placeholder={def.placeholder} onChange={e => onChange(e.target.value)} />
          {def.help && <p className={styles.fieldHelp}>{def.help}</p>}
        </div>
      )
  }
}

// Hero call-to-action buttons get a bespoke list editor (label + url pairs).
const HeroButtonsEditor: React.FC<{ block: BlockNode; onConfig: (patch: object) => void }> = ({ block, onConfig }) => {
  const config = parseConfig(block)
  const buttons: { label: string; url: string; variant?: string }[] = config.buttons || []

  const update = (next: typeof buttons) => onConfig({ buttons: next })

  return (
    <div className={styles.inspectorField}>
      <label>Buttons</label>
      {buttons.map((b, i) => (
        <div key={i} className={styles.heroButtonRow}>
          <input type="text" value={b.label} placeholder="Label" onChange={e => update(buttons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input type="text" value={b.url} placeholder="/page or https://…" onChange={e => update(buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <select value={b.variant || 'solid'} onChange={e => update(buttons.map((x, j) => (j === i ? { ...x, variant: e.target.value } : x)))}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
          </select>
          <button type="button" onClick={() => update(buttons.filter((_, j) => j !== i))} title="Remove">✕</button>
        </div>
      ))}
      <button type="button" className={styles.smallButton} onClick={() => update([...buttons, { label: 'Button', url: '#' }])}>
        + Add button
      </button>
    </div>
  )
}

// Dropdown of the tenant's forms for the form block
const FormPicker: React.FC<{ value?: string; tenantId?: string; onChange: (formId: string) => void }> = ({ value, tenantId, onChange }) => {
  const [forms, setForms] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!tenantId) return
    api.getForms(tenantId).then((list: any) => setForms(Array.isArray(list) ? list : [])).catch(() => setForms([]))
  }, [tenantId])
  return (
    <div className={styles.inspectorField}>
      <label>Form</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— Choose a form —</option>
        {forms.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      {tenantId && (
        <p className={styles.fieldHelp}>
          Manage forms under the tenant&apos;s Website → Forms page.
        </p>
      )}
    </div>
  )
}

const ProductPicker: React.FC<{ value?: string; tenantId?: string; onChange: (productId: string) => void }> = ({ value, tenantId, onChange }) => {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!tenantId) return
    api.getProducts(tenantId).then((list: any) => setProducts(Array.isArray(list) ? list : [])).catch(() => setProducts([]))
  }, [tenantId])
  return (
    <div className={styles.inspectorField}>
      <label>Product</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— Choose a product —</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {tenantId && <p className={styles.fieldHelp}>Manage products under Website → Store.</p>}
    </div>
  )
}

const BlockInspector: React.FC<{ block: BlockNode; dispatch: DraftDispatch; tenantId?: string }> = ({ block, dispatch, tenantId }) => {
  const def = BLOCK_REGISTRY[block.type]
  const schema = BLOCK_INSPECTORS[block.type]
  const config = parseConfig(block)

  const patchConfig = (patch: object) =>
    dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: { config: JSON.stringify({ ...config, ...patch }) } })

  if (block.type === 'quiz') {
    // Reuse the existing full quiz builder UI
    return (
      <QuizBlock
        block={block as any}
        isExpanded
        onToggleExpand={() => {}}
        onUpdate={updates => dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: updates as Partial<BlockNode> })}
        onDelete={() => dispatch({ type: 'DELETE_BLOCK', blockId: block.id })}
      />
    )
  }

  return (
    <div>
      <div className={styles.inspectorTitle}>
        <span>{def?.icon} {def?.label || block.type}</span>
        <button
          type="button"
          className={styles.dangerLink}
          onClick={() => dispatch({ type: 'DELETE_BLOCK', blockId: block.id })}
        >
          Delete
        </button>
      </div>

      {schema?.content && (
        <div className={styles.inspectorField}>
          <label>{schema.content.label}</label>
          {schema.content.input === 'textarea' ? (
            <textarea
              rows={3}
              value={block.content ?? ''}
              onChange={e => dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: { content: e.target.value }, transient: true })}
            />
          ) : (
            <input
              type="text"
              value={block.content ?? ''}
              onChange={e => dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: { content: e.target.value }, transient: true })}
            />
          )}
        </div>
      )}

      {block.type === 'text' && (
        <p className={styles.fieldHelp}>Edit text directly in the canvas. Select the block and start typing.</p>
      )}

      {block.type === 'form' && (
        <FormPicker value={config.formId} tenantId={tenantId} onChange={formId => patchConfig({ formId })} />
      )}

      {block.type === 'product' && (
        <ProductPicker value={config.productId} tenantId={tenantId} onChange={productId => patchConfig({ productId })} />
      )}

      {(schema?.fields || []).map(f => (
        <Field key={f.key} def={f} value={config[f.key]} onChange={v => patchConfig({ [f.key]: v })} />
      ))}

      {block.placement && (
        <div className={styles.inspectorField}>
          <label>Position & size (grid cells)</label>
          <div className={styles.placementGrid}>
            {(['x', 'y', 'w', 'h'] as const).map(k => (
              <label key={k} className={styles.placementCell}>
                <span>{k.toUpperCase()}</span>
                <input
                  type="number"
                  min={k === 'w' || k === 'h' ? 1 : 0}
                  value={block.placement![k]}
                  onChange={e =>
                    dispatch({
                      type: 'SET_BLOCK_PLACEMENT',
                      blockId: block.id,
                      placement: { ...block.placement!, [k]: Math.max(Number(e.target.value) || 0, k === 'w' || k === 'h' ? 1 : 0) },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <p className={styles.fieldHelp}>Drag the block to move it; drag its edges to resize. 24 columns per row.</p>
        </div>
      )}

      {block.type === 'hero' && <HeroButtonsEditor block={block} onConfig={patchConfig} />}
    </div>
  )
}

const SectionInspector: React.FC<{ section: PageSection; dispatch: DraftDispatch }> = ({ section, dispatch }) => {
  const settings = section.settings || {}
  const currentLayout = section.columns.map(c => Math.round(c.widthFraction * 100)).join('/')

  return (
    <div>
      <div className={styles.inspectorTitle}>
        <span>Section</span>
        <button type="button" className={styles.dangerLink} onClick={() => dispatch({ type: 'DELETE_SECTION', sectionId: section.id })}>
          Delete
        </button>
      </div>

      <div className={styles.inspectorField}>
        <label>Layout mode</label>
        <select
          value={settings.layout === 'grid' ? 'grid' : 'columns'}
          onChange={e => dispatch({ type: 'SET_SECTION_LAYOUT', sectionId: section.id, layout: e.target.value as 'grid' | 'columns' })}
        >
          <option value="grid">Freeform grid (drag & resize anywhere)</option>
          <option value="columns">Stacked columns</option>
        </select>
      </div>

      {settings.layout === 'grid' ? (
        <Field
          def={{ key: 'minRows', label: 'Minimum canvas height (rows)', input: 'number', min: 1, max: 200 }}
          value={settings.minRows || 6}
          onChange={v => dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: section.id, settings: { minRows: Number(v) || 6 } })}
        />
      ) : (
        <div className={styles.inspectorField}>
          <label>Columns</label>
          <select
            value={COLUMN_LAYOUTS.find(l => l.widths.map(w => Math.round(w * 100)).join('/') === currentLayout) ? currentLayout : 'custom'}
            onChange={e => {
              const layout = COLUMN_LAYOUTS.find(l => l.widths.map(w => Math.round(w * 100)).join('/') === e.target.value)
              if (layout) dispatch({ type: 'SET_SECTION_COLUMNS', sectionId: section.id, widths: layout.widths })
            }}
          >
            {COLUMN_LAYOUTS.map(l => {
              const key = l.widths.map(w => Math.round(w * 100)).join('/')
              return (
                <option key={key} value={key}>{l.label}</option>
              )
            })}
            {!COLUMN_LAYOUTS.some(l => l.widths.map(w => Math.round(w * 100)).join('/') === currentLayout) && (
              <option value="custom">Custom</option>
            )}
          </select>
        </div>
      )}

      <Field
        def={{ key: 'paddingY', label: 'Vertical padding', input: 'select', options: [
          { value: 'none', label: 'None' },
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ] }}
        value={settings.paddingY || 'medium'}
        onChange={v => dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: section.id, settings: { paddingY: v } })}
      />
      <Field
        def={{ key: 'backgroundColor', label: 'Background color', input: 'color' }}
        value={settings.backgroundColor}
        onChange={v => dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: section.id, settings: { backgroundColor: v } })}
      />
      <Field
        def={{ key: 'backgroundImageUrl', label: 'Background image URL', input: 'url' }}
        value={settings.backgroundImageUrl}
        onChange={v => dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: section.id, settings: { backgroundImageUrl: v } })}
      />
      <Field
        def={{ key: 'fullWidth', label: 'Full width content', input: 'checkbox' }}
        value={settings.fullWidth}
        onChange={v => dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: section.id, settings: { fullWidth: v } })}
      />
    </div>
  )
}

const Inspector: React.FC<Props> = ({ content, selection, dispatch, tenantId }) => {
  let body: React.ReactNode = (
    <p className={styles.inspectorEmpty}>Select a block or section to edit its settings.</p>
  )

  if (selection?.kind === 'block') {
    for (const s of content.sections) {
      for (const c of s.columns) {
        const block = c.blocks.find(b => b.id === selection.id)
        if (block) body = <BlockInspector block={block} dispatch={dispatch} tenantId={tenantId} />
      }
    }
  } else if (selection?.kind === 'section') {
    const section = content.sections.find(s => s.id === selection.id)
    if (section) body = <SectionInspector section={section} dispatch={dispatch} />
  }

  return <aside className={styles.inspector}>{body}</aside>
}

export default Inspector
