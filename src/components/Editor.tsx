import { useState } from 'react'
import { LayoutTemplate, ListPlus, Palette, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import VideoStage from './VideoStage'
import TemplateGallery from './TemplateGallery'
import StylePanel from './StylePanel'
import TranscriptPanel from './TranscriptPanel'
import TranscribeControls from './TranscribeControls'
import ExportMenu from './ExportMenu'

type Tab = 'templates' | 'style' | 'captions'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={15} /> },
  { id: 'style', label: 'Style', icon: <Palette size={15} /> },
  { id: 'captions', label: 'Captions', icon: <ListPlus size={15} /> },
]

export default function Editor() {
  const resetVideo = useStore((s) => s.resetVideo)
  const status = useStore((s) => s.status)
  const errorMsg = useStore((s) => s.errorMsg)
  const [tab, setTab] = useState<Tab>('templates')

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-white/5 bg-[#0d0d14] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7c5cff]">
            <Sparkles size={16} className="text-white" />
          </span>
          <span className="text-sm font-bold tracking-tight">Caption Studio</span>
        </div>
        <button
          onClick={resetVideo}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10"
        >
          New video
        </button>

        <div className="mx-auto">
          <TranscribeControls />
        </div>

        <ExportMenu />
      </header>

      {errorMsg && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          <VideoStage />
        </main>

        <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/5 bg-[#0b0b11]">
          <div className="flex gap-1 border-b border-white/5 p-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                  tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'templates' && <TemplateGallery />}
            {tab === 'style' && <StylePanel />}
            {tab === 'captions' && <TranscriptPanel />}
          </div>
          {status === 'done' && (
            <div className="border-t border-white/5 px-4 py-2 text-center text-[11px] text-white/40">
              Tip: switch to the <span className="text-white/70">Captions</span> tab to
              fix any wording.
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
