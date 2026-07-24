// ============================================================
// Core data model for Caption Studio
// ============================================================

/** A single spoken word with its timing (seconds). */
export interface Word {
  text: string
  start: number
  end: number
}

/**
 * A caption "chunk" — the group of words shown on screen at once.
 * Corresponds roughly to one line/phrase in CapCut.
 */
export interface CaptionChunk {
  id: string
  start: number
  end: number
  words: Word[]
}

export type EntranceAnimation =
  | 'none'
  | 'pop'
  | 'fade'
  | 'slide-up'
  | 'bounce'
  | 'shake'

/** How the words within a chunk are revealed over time. */
export type WordReveal = 'chunk' | 'word'

/** How the currently-spoken word is emphasised. */
export type HighlightMode = 'none' | 'color' | 'scale' | 'box' | 'underline'

export interface CaptionStyle {
  fontFamily: string
  fontWeight: number
  /** Font size as a percentage of the video stage height. */
  fontSize: number
  uppercase: boolean
  letterSpacing: number
  lineHeight: number

  color: string
  /** Active/spoken word color when highlightMode uses color. */
  highlightColor: string
  highlightMode: HighlightMode
  highlightBg: string

  outlineWidth: number
  outlineColor: string
  shadow: boolean
  shadowColor: string

  bgEnabled: boolean
  bgColor: string
  bgOpacity: number
  bgPaddingX: number
  bgPaddingY: number
  bgRadius: number

  /** Vertical position of the caption block, 0 (top) – 100 (bottom). */
  positionY: number
  /** Max words shown per chunk (used when (re)grouping the transcript). */
  maxWords: number

  entrance: EntranceAnimation
  wordReveal: WordReveal
}

export interface Template {
  id: string
  name: string
  tag: 'UGC' | 'VSL' | 'Ads'
  description: string
  style: CaptionStyle
}

export type TranscriptionStatus =
  | 'idle'
  | 'loading-model'
  | 'extracting-audio'
  | 'transcribing'
  | 'done'
  | 'error'

export interface FontOption {
  label: string
  value: string
  /** Recommended weight for this display font. */
  weight: number
  category: 'UGC' | 'VSL' | 'Ads' | 'Universal'
}
