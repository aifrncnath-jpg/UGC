import type { CaptionChunk, Word } from '../types'

let idCounter = 0
const nextId = () => `c${idCounter++}`

interface RawChunk {
  text: string
  timestamp: [number, number | null]
}

/** Convert Whisper word chunks into a clean Word[] with valid timings. */
export function normalizeWords(raw: RawChunk[]): Word[] {
  const words: Word[] = []
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    const text = c.text.trim()
    if (!text) continue
    const start = c.timestamp[0] ?? words.at(-1)?.end ?? 0
    let end = c.timestamp[1] ?? raw[i + 1]?.timestamp[0] ?? start + 0.3
    if (end <= start) end = start + 0.2
    words.push({ text, start, end })
  }
  return words
}

const SENTENCE_END = /[.!?]$/

/**
 * Group words into on-screen chunks. Breaks on: reaching maxWords,
 * a long pause between words, or sentence-ending punctuation.
 */
export function groupWords(words: Word[], maxWords: number): CaptionChunk[] {
  const chunks: CaptionChunk[] = []
  let current: Word[] = []

  const flush = () => {
    if (current.length === 0) return
    chunks.push({
      id: nextId(),
      start: current[0].start,
      end: current.at(-1)!.end,
      words: current,
    })
    current = []
  }

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const prev = current.at(-1)
    const gap = prev ? w.start - prev.end : 0
    if (prev && gap > 0.7) flush()

    current.push(w)

    const hitMax = current.length >= maxWords
    const endsSentence = SENTENCE_END.test(w.text)
    if (hitMax || endsSentence) flush()
  }
  flush()
  return chunks
}

/** Recompute chunks from words with a new max-words setting. */
export function regroup(words: Word[], maxWords: number): CaptionChunk[] {
  return groupWords(words, Math.max(1, maxWords))
}
