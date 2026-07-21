import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { MenuBar } from '../BlockEditor/blocks/MenuBar'
import { BlockNode } from '../blocks/types'

interface Props {
  block: BlockNode
  selected: boolean
  onChange: (html: string) => void
}

// Inline rich-text editing for text blocks directly in the canvas.
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

  return (
    <div>
      {selected && editor && (
        <div style={{ marginBottom: 8 }} onMouseDown={e => e.preventDefault()}>
          <MenuBar editor={editor} />
        </div>
      )}
      <div style={{ fontSize: 16, lineHeight: 1.6 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TextInlineEditor
