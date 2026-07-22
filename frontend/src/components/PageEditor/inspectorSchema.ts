// Declarative config-form schemas for the Inspector panel. Each block type
// lists the fields shown when the block is selected; values are read from /
// written to the block's JSON config string. `content` describes how the
// block's content column is edited (text blocks edit inline in the canvas).

export interface FieldDef {
  key: string
  label: string
  input: 'text' | 'textarea' | 'url' | 'number' | 'color' | 'select' | 'checkbox' | 'image'
  options?: { value: string; label: string }[]
  placeholder?: string
  min?: number
  max?: number
  help?: string
}

export interface BlockInspectorSchema {
  content?: { label: string; input: 'text' | 'textarea' | 'url' } // omitted => content not edited in inspector
  fields: FieldDef[]
}

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

export const BLOCK_INSPECTORS: Record<string, BlockInspectorSchema> = {
  text: {
    fields: [], // edited inline with the rich-text editor
  },
  hero: {
    content: { label: 'Heading', input: 'textarea' },
    fields: [
      { key: 'kicker', label: 'Kicker (small text above)', input: 'text' },
      { key: 'subheading', label: 'Subheading', input: 'textarea' },
      { key: 'alignment', label: 'Alignment', input: 'select', options: ALIGNMENT_OPTIONS },
      {
        key: 'height', label: 'Height', input: 'select',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
      },
      { key: 'backgroundColor', label: 'Background color', input: 'color' },
      { key: 'backgroundImageUrl', label: 'Background image', input: 'image' },
      { key: 'overlayOpacity', label: 'Image overlay (0–1)', input: 'number', min: 0, max: 1 },
      { key: 'textColor', label: 'Text color', input: 'color' },
    ],
  },
  image: {
    content: { label: 'Image URL', input: 'url' },
    fields: [
      { key: 'altText', label: 'Alt text', input: 'text', help: 'Describes the image for screen readers and SEO' },
      { key: 'caption', label: 'Caption', input: 'text' },
      { key: 'alignment', label: 'Alignment', input: 'select', options: ALIGNMENT_OPTIONS },
      { key: 'maxWidth', label: 'Max width (e.g. 400px)', input: 'text' },
      { key: 'rounded', label: 'Rounded corners', input: 'checkbox' },
      { key: 'shadow', label: 'Drop shadow', input: 'checkbox' },
    ],
  },
  video: {
    content: { label: 'Video URL (YouTube / Vimeo / file)', input: 'url' },
    fields: [
      { key: 'title', label: 'Title', input: 'text' },
      {
        key: 'aspectRatio', label: 'Aspect ratio', input: 'select',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '4:3', label: '4:3' },
        ],
      },
    ],
  },
  quote: {
    content: { label: 'Quote text', input: 'textarea' },
    fields: [
      { key: 'attribution', label: 'Attribution', input: 'text' },
      { key: 'textColor', label: 'Text color', input: 'color' },
      { key: 'borderColor', label: 'Border color', input: 'color' },
      { key: 'backgroundColor', label: 'Background color', input: 'color' },
    ],
  },
  button: {
    content: { label: 'Button label', input: 'text' },
    fields: [
      { key: 'url', label: 'Link URL', input: 'url' },
      { key: 'alignment', label: 'Alignment', input: 'select', options: ALIGNMENT_OPTIONS },
      {
        key: 'size', label: 'Size', input: 'select',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
      },
      { key: 'backgroundColor', label: 'Background color', input: 'color' },
      { key: 'textColor', label: 'Text color', input: 'color' },
      { key: 'outline', label: 'Outline style (transparent fill)', input: 'checkbox' },
      { key: 'openInNewTab', label: 'Open in new tab', input: 'checkbox' },
    ],
  },
  form: {
    fields: [
      { key: 'submitLabel', label: 'Submit button label', input: 'text' },
      {
        key: 'align', label: 'Layout', input: 'select',
        options: [
          { value: 'left', label: 'Full width' },
          { value: 'center', label: 'Centered (narrow)' },
        ],
      },
    ],
  },
  product: {
    fields: [{ key: 'buttonLabel', label: 'Buy button label', input: 'text' }],
  },
  blogListing: {
    fields: [
      { key: 'heading', label: 'Heading', input: 'text' },
      { key: 'limit', label: 'Number of posts', input: 'number', min: 1, max: 12 },
    ],
  },
  spacer: {
    fields: [{ key: 'height', label: 'Height (px)', input: 'number', min: 4, max: 400 }],
  },
  divider: {
    fields: [
      { key: 'color', label: 'Color', input: 'color' },
      { key: 'thickness', label: 'Thickness (px)', input: 'number', min: 1, max: 12 },
      {
        key: 'width', label: 'Width', input: 'select',
        options: [
          { value: 'full', label: 'Full' },
          { value: 'half', label: 'Half' },
          { value: 'quarter', label: 'Quarter' },
        ],
      },
    ],
  },
}

// Column layout presets for sections
export const COLUMN_LAYOUTS: { label: string; widths: number[] }[] = [
  { label: '1 column', widths: [1] },
  { label: '2 columns', widths: [0.5, 0.5] },
  { label: '2 columns (⅓ + ⅔)', widths: [1 / 3, 2 / 3] },
  { label: '2 columns (⅔ + ⅓)', widths: [2 / 3, 1 / 3] },
  { label: '3 columns', widths: [1 / 3, 1 / 3, 1 / 3] },
]
