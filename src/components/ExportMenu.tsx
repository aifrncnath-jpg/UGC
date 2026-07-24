import { useState } from 'react'
import { Download, FileText, Film, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { download, toSRT, toVTT, toPlainText } from '../lib/subtitles'
import { exportBurnedVideo } from '../lib/exportVideo'

export default function ExportMenu() {
  const chunks = useStore((s) => s.chunks)
  const style = useStore((s) => s.style)
  const file = useStore((s) => s.file)
  const [open, setOpen] = useState(false)
  const [burning, setBurning] = useState(false)
  const [progress, setProgress] = useState(0)

  const baseName = (file?.name ?? 'captions').replace(/\.[^.]+$/, '')
  const disabled = chunks.length === 0

  const burn = async () => {
    if (!file) return
    setOpen(false)
    setBurning(true)
    setProgress(0)
    try {
      const blob = await exportBurnedVideo({
        file,
        chunks,
        style,
        onProgress: setProgress,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}-captioned.webm`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBurning(false)
    }
  }

  return (
    <div className="relative">
      <button
        disabled={disabled || burning}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-[#7c5cff] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#6b4bef] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {burning ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Rendering {Math.round(progress * 100)}%
          </>
        ) : (
          <>
            <Download size={16} />
            Export
          </>
        )}
      </button>

      {open && !burning && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#14141c] shadow-2xl">
            <MenuItem
              icon={<Film size={16} />}
              title="Burn into video"
              sub=".webm with captions baked in"
              onClick={burn}
            />
            <div className="h-px bg-white/5" />
            <MenuItem
              icon={<FileText size={16} />}
              title="Subtitles (.srt)"
              sub="For YouTube, editors, players"
              onClick={() => {
                download(`${baseName}.srt`, toSRT(chunks))
                setOpen(false)
              }}
            />
            <MenuItem
              icon={<FileText size={16} />}
              title="Web captions (.vtt)"
              sub="For web video / HTML5"
              onClick={() => {
                download(`${baseName}.vtt`, toVTT(chunks))
                setOpen(false)
              }}
            />
            <MenuItem
              icon={<FileText size={16} />}
              title="Plain text (.txt)"
              sub="Full transcript"
              onClick={() => {
                download(`${baseName}.txt`, toPlainText(chunks))
                setOpen(false)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/5"
    >
      <span className="text-[#7c5cff]">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-white/90">{title}</span>
        <span className="block text-xs text-white/45">{sub}</span>
      </span>
    </button>
  )
}
