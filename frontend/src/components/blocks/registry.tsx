import React from 'react'
import { BlockNode } from './types'
import TextDisplay from './display/TextDisplay'
import ImageDisplay, { DEFAULT_IMAGE_CONFIG } from './display/ImageDisplay'
import VideoDisplay, { DEFAULT_VIDEO_CONFIG } from './display/VideoDisplay'
import QuoteDisplay, { DEFAULT_QUOTE_CONFIG } from './display/QuoteDisplay'
import ButtonDisplay, { DEFAULT_BUTTON_CONFIG } from './display/ButtonDisplay'
import HeroDisplay, { DEFAULT_HERO_CONFIG } from './display/HeroDisplay'
import SpacerDisplay, { DEFAULT_SPACER_CONFIG } from './display/SpacerDisplay'
import DividerDisplay, { DEFAULT_DIVIDER_CONFIG } from './display/DividerDisplay'
import FormDisplay, { DEFAULT_FORM_CONFIG } from './display/FormDisplay'
import QuizBlockDisplay from '../BlockEditor/blocks/QuizBlockDisplay'

export interface BlockRenderContext {
  // 'site' = public website page, 'lms' = course player / module preview
  surface: 'site' | 'lms'
  courseId?: string
}

export interface BlockDefinition {
  label: string
  icon: string
  // Which editors offer this block type
  surfaces: ('site' | 'lms')[]
  defaults: { content?: string; config?: object }
  Display: React.ComponentType<{ block: BlockNode; context?: BlockRenderContext }>
}

const QuizAdapter: React.FC<{ block: BlockNode; context?: BlockRenderContext }> = ({ block, context }) => (
  <QuizBlockDisplay block={block as any} courseId={context?.courseId} />
)

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  text: {
    label: 'Text',
    icon: '📝',
    surfaces: ['site', 'lms'],
    defaults: { content: '', config: {} },
    Display: TextDisplay,
  },
  hero: {
    label: 'Hero',
    icon: '🌄',
    surfaces: ['site'],
    defaults: { content: 'Your headline here', config: DEFAULT_HERO_CONFIG },
    Display: HeroDisplay,
  },
  image: {
    label: 'Image',
    icon: '🖼️',
    surfaces: ['site', 'lms'],
    defaults: { content: '', config: DEFAULT_IMAGE_CONFIG },
    Display: ImageDisplay,
  },
  video: {
    label: 'Video',
    icon: '🎥',
    surfaces: ['site', 'lms'],
    defaults: { content: '', config: DEFAULT_VIDEO_CONFIG },
    Display: VideoDisplay,
  },
  quote: {
    label: 'Quote',
    icon: '💬',
    surfaces: ['site', 'lms'],
    defaults: { content: '', config: DEFAULT_QUOTE_CONFIG },
    Display: QuoteDisplay,
  },
  button: {
    label: 'Button',
    icon: '🔘',
    surfaces: ['site', 'lms'],
    defaults: { content: 'Click here', config: DEFAULT_BUTTON_CONFIG },
    Display: ButtonDisplay,
  },
  spacer: {
    label: 'Spacer',
    icon: '↕️',
    surfaces: ['site'],
    defaults: { config: DEFAULT_SPACER_CONFIG },
    Display: SpacerDisplay,
  },
  divider: {
    label: 'Divider',
    icon: '➖',
    surfaces: ['site'],
    defaults: { config: DEFAULT_DIVIDER_CONFIG },
    Display: DividerDisplay,
  },
  form: {
    label: 'Form',
    icon: '📋',
    surfaces: ['site'],
    defaults: { config: DEFAULT_FORM_CONFIG },
    Display: FormDisplay,
  },
  quiz: {
    label: 'Quiz',
    icon: '❓',
    surfaces: ['lms'],
    defaults: {
      config: { title: '', description: '', passingScore: 70, attemptsAllowed: 1, requiresPassToContinue: false, questions: [] },
    },
    Display: QuizAdapter,
  },
}

export const blockTypesForSurface = (surface: 'site' | 'lms') =>
  Object.entries(BLOCK_REGISTRY)
    .filter(([, def]) => def.surfaces.includes(surface))
    .map(([type, def]) => ({ type, ...def }))

export const createBlock = (type: string): BlockNode => {
  const def = BLOCK_REGISTRY[type]
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    content: def?.defaults.content ?? '',
    config: JSON.stringify(def?.defaults.config ?? {}),
  }
}
