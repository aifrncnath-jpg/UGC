import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useStore } from '../store'
import CaptionOverlay from './CaptionOverlay'

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VideoStage() {
  const videoUrl = useStore((s) => s.videoUrl)
  const chunks = useStore((s) => s.chunks)
  const style = useStore((s) => s.style)
  const currentTime = useStore((s) => s.currentTime)
  const duration = useStore((s) => s.duration)
  const isPlaying = useStore((s) => s.isPlaying)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const setDuration = useStore((s) => s.setDuration)
  const setPlaying = useStore((s) => s.setPlaying)

  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [stageHeight, setStageHeight] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)

  // Measure the displayed video box so caption sizes scale with it.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageHeight(el.clientHeight))
    ro.observe(el)
    setStageHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [videoUrl])

  // Drive currentTime from a rAF loop for smooth caption sync.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v) setCurrentTime(v.currentTime)
      raf = requestAnimationFrame(tick)
    }
    if (isPlaying) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, setCurrentTime])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  const seek = (t: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = t
    setCurrentTime(t)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-black p-3">
        <div
          ref={wrapRef}
          className="relative inline-flex max-h-full max-w-full"
          style={{ lineHeight: 0 }}
        >
          <video
            ref={videoRef}
            src={videoUrl ?? undefined}
            className="max-h-[70vh] max-w-full rounded-md"
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration)
              setStageHeight(wrapRef.current?.clientHeight ?? 0)
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onClick={togglePlay}
            playsInline
          />
          <CaptionOverlay
            chunks={chunks}
            style={style}
            currentTime={currentTime}
            stageHeight={stageHeight}
            freeze={scrubbing}
          />
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-3 border-t border-white/5 bg-[#0d0d14] px-4 py-3">
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7c5cff] text-white transition hover:bg-[#6b4bef]"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button
          onClick={() => seek(0)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10"
          aria-label="Restart"
        >
          <RotateCcw size={16} />
        </button>
        <span className="w-11 shrink-0 text-right font-mono text-xs text-white/60">
          {fmt(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onMouseDown={() => setScrubbing(true)}
          onMouseUp={() => setScrubbing(false)}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10"
        />
        <span className="w-11 shrink-0 font-mono text-xs text-white/60">
          {fmt(duration)}
        </span>
      </div>
    </div>
  )
}
