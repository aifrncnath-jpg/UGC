import { create } from 'zustand'
import type {
  CaptionChunk,
  CaptionStyle,
  TranscriptionStatus,
  Word,
} from './types'
import { DEFAULT_STYLE, TEMPLATES } from './lib/templates'
import { extractAudio } from './lib/audio'
import { normalizeWords, regroup } from './lib/captions'

interface State {
  file: File | null
  videoUrl: string | null
  duration: number
  currentTime: number
  isPlaying: boolean

  status: TranscriptionStatus
  progress: number
  progressLabel: string
  device: string | null
  errorMsg: string | null

  model: string
  language: string

  words: Word[]
  chunks: CaptionChunk[]
  style: CaptionStyle
  activeTemplateId: string | null

  // actions
  loadVideo: (file: File) => void
  resetVideo: () => void
  setDuration: (d: number) => void
  setCurrentTime: (t: number) => void
  setPlaying: (p: boolean) => void
  setModel: (m: string) => void
  setLanguage: (l: string) => void
  transcribe: () => Promise<void>
  applyTemplate: (id: string) => void
  updateStyle: (patch: Partial<CaptionStyle>) => void
  setMaxWords: (n: number) => void
  updateWordText: (chunkId: string, index: number, text: string) => void
  updateChunkText: (chunkId: string, text: string) => void
  splitOrMerge: () => void
}

let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./workers/transcribe.worker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return worker
}

export const useStore = create<State>((set, get) => ({
  file: null,
  videoUrl: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,

  status: 'idle',
  progress: 0,
  progressLabel: '',
  device: null,
  errorMsg: null,

  model: 'onnx-community/whisper-base',
  language: 'auto',

  words: [],
  chunks: [],
  style: DEFAULT_STYLE,
  activeTemplateId: 'ugc-pop',

  loadVideo: (file) => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      file,
      videoUrl: URL.createObjectURL(file),
      words: [],
      chunks: [],
      status: 'idle',
      errorMsg: null,
      currentTime: 0,
      isPlaying: false,
    })
  },

  resetVideo: () => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      file: null,
      videoUrl: null,
      words: [],
      chunks: [],
      status: 'idle',
      errorMsg: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
    })
  },

  setDuration: (d) => set({ duration: d }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setPlaying: (p) => set({ isPlaying: p }),
  setModel: (m) => set({ model: m }),
  setLanguage: (l) => set({ language: l }),

  transcribe: async () => {
    const { file, model, language } = get()
    if (!file) return
    set({ status: 'extracting-audio', errorMsg: null, progress: 0, progressLabel: 'Reading audio…' })

    let audio: Float32Array
    try {
      audio = await extractAudio(file)
    } catch {
      set({
        status: 'error',
        errorMsg:
          'Could not read audio from this file. Try an MP4/MOV/WebM with an audio track.',
      })
      return
    }

    const w = getWorker()

    return new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        const data = event.data
        switch (data.status) {
          case 'loading-model': {
            const p = data.data
            if (p && p.status === 'fallback') {
              set({
                status: 'loading-model',
                progress: 0,
                progressLabel: 'GPU unavailable — switching to CPU mode…',
              })
            } else if (p && typeof p.progress === 'number') {
              set({
                status: 'loading-model',
                progress: p.progress / 100,
                progressLabel: `Downloading AI model… ${Math.round(p.progress)}%`,
              })
            } else {
              set({ status: 'loading-model', progressLabel: 'Loading AI model…' })
            }
            break
          }
          case 'model-ready':
            set({ device: data.device })
            break
          case 'transcribing':
            set({ status: 'transcribing', progressLabel: 'Transcribing speech…' })
            break
          case 'done': {
            const words = normalizeWords(data.chunks)
            const chunks = regroup(words, get().style.maxWords)
            set({ words, chunks, status: 'done', progressLabel: '' })
            w.removeEventListener('message', onMessage)
            resolve()
            break
          }
          case 'error':
            set({ status: 'error', errorMsg: data.message })
            w.removeEventListener('message', onMessage)
            resolve()
            break
        }
      }
      w.addEventListener('message', onMessage)
      w.postMessage({ type: 'transcribe', audio, model, language }, [audio.buffer])
    })
  },

  applyTemplate: (id) => {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    const words = get().words
    const style = { ...t.style }
    set({
      style,
      activeTemplateId: id,
      chunks: words.length ? regroup(words, style.maxWords) : get().chunks,
    })
  },

  updateStyle: (patch) =>
    set((s) => ({ style: { ...s.style, ...patch }, activeTemplateId: null })),

  setMaxWords: (n) =>
    set((s) => ({
      style: { ...s.style, maxWords: n },
      chunks: s.words.length ? regroup(s.words, n) : s.chunks,
    })),

  updateWordText: (chunkId, index, text) =>
    set((s) => ({
      chunks: s.chunks.map((c) =>
        c.id === chunkId
          ? {
              ...c,
              words: c.words.map((w, i) => (i === index ? { ...w, text } : w)),
            }
          : c,
      ),
    })),

  updateChunkText: (chunkId, text) =>
    set((s) => ({
      chunks: s.chunks.map((c) => {
        if (c.id !== chunkId) return c
        const tokens = text.trim().split(/\s+/).filter(Boolean)
        if (tokens.length === 0) return c
        // Same word count → keep original per-word timing (typo fix case).
        if (tokens.length === c.words.length) {
          return {
            ...c,
            words: c.words.map((w, i) => ({ ...w, text: tokens[i] })),
          }
        }
        // Different count → distribute the chunk's duration evenly.
        const span = (c.end - c.start) / tokens.length
        return {
          ...c,
          words: tokens.map((t, i) => ({
            text: t,
            start: c.start + span * i,
            end: c.start + span * (i + 1),
          })),
        }
      }),
    })),

  splitOrMerge: () => {
    const { words, style } = get()
    if (words.length) set({ chunks: regroup(words, style.maxWords) })
  },
}))
