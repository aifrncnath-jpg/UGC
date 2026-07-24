import { useRef, useState } from 'react'
import { Clapperboard, Sparkles, Type, Wand2 } from 'lucide-react'
import { useStore } from '../store'

export default function Uploader() {
  const loadVideo = useStore((s) => s.loadVideo)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file && file.type.startsWith('video/')) loadVideo(file)
    else if (file) alert('Please choose a video file (MP4, MOV, WebM…).')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <Sparkles size={13} className="text-[#7c5cff]" />
          Runs 100% in your browser — your video never gets uploaded anywhere
        </div>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Caption Studio
        </h1>
        <p className="mt-3 text-base text-white/60">
          Auto-generate word-perfect captions, then style them with pro fonts and
          CapCut-style animations for UGC, VSLs and Ads.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 transition ${
          dragging
            ? 'border-[#7c5cff] bg-[#7c5cff]/10'
            : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
        }`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7c5cff]/15 text-[#7c5cff]">
          <Clapperboard size={30} />
        </div>
        <p className="text-lg font-semibold">Drop your video here</p>
        <p className="mt-1 text-sm text-white/50">
          or click to browse — MP4, MOV, WebM
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        <Feature icon={<Wand2 size={18} />} title="AI transcription" desc="Word-level timing, on-device" />
        <Feature icon={<Type size={18} />} title="Pro fonts" desc="Curated for UGC, VSL & Ads" />
        <Feature icon={<Sparkles size={18} />} title="Animations" desc="Pop, karaoke, bounce & more" />
      </div>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 text-[#7c5cff]">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-white/50">{desc}</p>
    </div>
  )
}
