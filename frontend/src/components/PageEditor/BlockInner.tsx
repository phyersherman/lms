import React from 'react'
import { BlockNode, parseFrame } from '../blocks/types'
import { BlockRenderContext } from '../blocks/registry'
import BlockDisplay from '../blocks/BlockDisplay'
import TextDisplay from '../blocks/display/TextDisplay'
import HeroDisplay from '../blocks/display/HeroDisplay'
import ButtonDisplay from '../blocks/display/ButtonDisplay'
import QuoteDisplay from '../blocks/display/QuoteDisplay'
import TextInlineEditor from './TextInlineEditor'
import { DraftDispatch } from './usePageDraft'

interface Props {
  block: BlockNode
  selected: boolean
  context: BlockRenderContext
  dispatch: DraftDispatch
}

const parseConfig = (block: BlockNode) => {
  try {
    return block.config ? JSON.parse(block.config) : {}
  } catch {
    return {}
  }
}

// Canvas rendering of a block with in-place editing where supported: rich
// text for text blocks; click-to-edit headings/labels/quotes for hero,
// button and quote blocks. Everything else renders its real Display.
const BlockInner: React.FC<Props> = ({ block, selected, context, dispatch }) => {
  const editable = {
    onContent: (value: string) =>
      dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: { content: value }, transient: true }),
    onConfigPatch: (patch: object) =>
      dispatch({
        type: 'UPDATE_BLOCK',
        blockId: block.id,
        updates: { config: JSON.stringify({ ...parseConfig(block), ...patch }) },
        transient: true,
      }),
  }

  switch (block.type) {
    case 'text':
      // "scale to fill" text shows its fitted size until selected for editing
      if (parseFrame(block).fillText && !selected) {
        return <TextDisplay block={block} />
      }
      return (
        <TextInlineEditor
          block={block}
          selected={selected}
          onChange={html => dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates: { content: html }, transient: true })}
        />
      )
    case 'hero':
      return <HeroDisplay block={block} editable={editable} />
    case 'button':
      return <ButtonDisplay block={block} editable={editable} />
    case 'quote':
      return <QuoteDisplay block={block} editable={editable} />
    default:
      return (
        <div style={block.type === 'quiz' ? { pointerEvents: 'none', opacity: 0.9 } : undefined}>
          <BlockDisplay block={block} context={context} />
        </div>
      )
  }
}

export default BlockInner
