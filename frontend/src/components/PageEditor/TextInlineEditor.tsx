import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { MenuBar } from '../BlockEditor/blocks/MenuBar'
import { BlockNode, parseFrame } from '../blocks/types'
import { FitText } from '../blocks/frame'

interface Props {
  block: BlockNode
  selected: boolean
  onChange: (html: string) => void
}

// Inline rich-text editing for text blocks directly in the canvas. The
// formatting toolbar floats above the block (absolutely positioned) so opening
// it never shifts the page layout, and blocks with "scale text to fill" keep
// their fitted size while being edited.
const TextInlineEditor: React.FC<Props> = ({ block, selected, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: block.content || '<p></p>',
    onUpdate: ({ editor }: { editor: any }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  } as any)

  // Keep the editor in sync when content changes externally (undo/redo)
  useEffect(() => {
    if (editor && block.content !== undefined && editor.getHTML() !== block.content) {
      editor.commands.setContent(block.content || '<p></p>', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.content, editor])

  const fillText = parseFrame(block).fillText

  const body = (
    <div style={{ fontSize: 16, lineHeight: 1.6 }}>
      <EditorContent editor={editor} />
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: fillText ? '100%' : undefined }}>
      {selected && editor && (
        <div
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 30, // clear the block label chip
            zIndex: 60,
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            padding: 2,
          }}
        >
          <MenuBar editor={editor} />
        </div>
      )}
      {fillText ? <FitText>{body}</FitText> : body}
    </div>
  )
}

export default TextInlineEditor
