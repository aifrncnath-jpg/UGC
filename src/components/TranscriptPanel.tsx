import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { activeChunkIndex } from './CaptionOverlay'
import { chunkText } from '../lib/subtitles'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TranscriptPanel() {
  const chunks = useStore((s) => s.chunks)
  const currentTime = useStore((s) => s.currentTime)
  const updateChunkText = useStore((s) => s.updateChunkText)
  const activeIdx = activeChunkIndex(chunks, currentTime)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the active line in view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx])

  const seek = (t: number) => {
    // Find the shared <video> and seek it.
    const v = document.querySelector('video')
    if (v) {
      v.currentTime = t
      useStore.getState().setCurrentTime(t)
    }
  }

  if (chunks.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-white/40">
        No captions yet. Click <span className="text-white/70">Generate captions</span>{' '}
        to transcribe your video, then edit any line here.
      </div>
    )
  }

  return (
    <div ref={listRef} className="space-y-1.5 p-3">
      {chunks.map((c, i) => (
        <div
          key={c.id}
          data-idx={i}
          className={`rounded-lg border px-3 py-2 transition ${
            i === activeIdx
              ? 'border-[#7c5cff]/60 bg-[#7c5cff]/10'
              : 'border-transparent bg-white/[0.02] hover:bg-white/[0.05]'
          }`}
        >
          <button
            onClick={() => seek(c.start)}
            className="mb-1 font-mono text-[10px] text-[#7c5cff] hover:underline"
          >
            {fmt(c.start)} → {fmt(c.end)}
          </button>
          <input
            defaultValue={chunkText(c)}
            key={chunkText(c)}
            onBlur={(e) => updateChunkText(c.id, e.target.value)}
            className="w-full bg-transparent text-sm text-white/90 outline-none focus:text-white"
          />
        </div>
      ))}
    </div>
  )
}
