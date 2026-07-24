import type { CaptionChunk, CaptionStyle } from '../types'
import { activeChunkIndex } from '../components/CaptionOverlay'

interface ExportOptions {
  file: File
  chunks: CaptionChunk[]
  style: CaptionStyle
  onProgress?: (ratio: number) => void
}

interface LaidOutWord {
  text: string
  x: number
  width: number
  active: boolean
}

/**
 * Burn captions into the video and return a WebM blob.
 * Renders each frame to a canvas (video + styled captions) and records the
 * canvas stream combined with the original audio.
 */
export async function exportBurnedVideo({
  file,
  chunks,
  style,
  onProgress,
}: ExportOptions): Promise<Blob> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url
  video.crossOrigin = 'anonymous'
  video.playsInline = true

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res()
    video.onerror = () => rej(new Error('Failed to load video for export'))
  })

  const width = video.videoWidth
  const height = video.videoHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Route audio through Web Audio so it records but stays silent on speakers.
  const audioCtx = new AudioContext()
  const srcNode = audioCtx.createMediaElementSource(video)
  const destNode = audioCtx.createMediaStreamDestination()
  srcNode.connect(destNode)

  const canvasStream = canvas.captureStream(30)
  const audioTrack = destNode.stream.getAudioTracks()[0]
  if (audioTrack) canvasStream.addTrack(audioTrack)

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  })
  const parts: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size > 0 && parts.push(e.data)

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(parts, { type: mimeType }))
  })

  recorder.start()
  await video.play()

  let raf = 0
  const draw = () => {
    ctx.drawImage(video, 0, 0, width, height)
    drawCaptions(ctx, chunks, style, video.currentTime, width, height)
    onProgress?.(Math.min(1, video.currentTime / (video.duration || 1)))
    raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)

  await new Promise<void>((res) => {
    video.onended = () => res()
  })

  cancelAnimationFrame(raf)
  recorder.stop()
  const blob = await done

  void audioCtx.close()
  URL.revokeObjectURL(url)
  return blob
}

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? 'video/webm'
}

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  chunks: CaptionChunk[],
  style: CaptionStyle,
  t: number,
  width: number,
  height: number,
) {
  const idx = activeChunkIndex(chunks, t)
  if (idx === -1) return
  const chunk = chunks[idx]

  const fontPx = (height * style.fontSize) / 100
  const outlinePx = (fontPx * style.outlineWidth) / 100
  const spacing = fontPx * 0.22
  const maxWidth = width * 0.86

  const fontStr = `${style.fontWeight} ${fontPx}px '${style.fontFamily}', sans-serif`
  ctx.font = fontStr
  ctx.textBaseline = 'middle'

  const transform = (s: string) => (style.uppercase ? s.toUpperCase() : s)

  const visibleWords = chunk.words
    .map((w) => ({ ...w, display: transform(w.text) }))
    .filter((w) => style.wordReveal === 'chunk' || t >= w.start - 0.02)
  if (visibleWords.length === 0) return

  // Greedy word-wrap into lines.
  const lines: LaidOutWord[][] = []
  let line: LaidOutWord[] = []
  let lineWidth = 0
  for (const w of visibleWords) {
    const wWidth = ctx.measureText(w.display).width
    const add = (line.length ? spacing : 0) + wWidth
    if (line.length && lineWidth + add > maxWidth) {
      lines.push(line)
      line = []
      lineWidth = 0
    }
    line.push({
      text: w.display,
      x: 0,
      width: wWidth,
      active: t >= w.start && t < w.end,
    })
    lineWidth += (line.length > 1 ? spacing : 0) + wWidth
  }
  if (line.length) lines.push(line)

  const lineHeight = fontPx * style.lineHeight
  const blockHeight = lines.length * lineHeight
  const centerY = (height * style.positionY) / 100
  let y = centerY - blockHeight / 2 + lineHeight / 2

  for (const ln of lines) {
    const total =
      ln.reduce((a, w) => a + w.width, 0) + spacing * (ln.length - 1)
    let x = (width - total) / 2

    // Optional background box behind the whole line.
    if (style.bgEnabled) {
      const padX = style.bgPaddingX * fontPx * 0.5
      const padY = style.bgPaddingY * fontPx * 0.5
      ctx.fillStyle = hexA(style.bgColor, style.bgOpacity)
      roundRect(
        ctx,
        x - padX,
        y - lineHeight / 2 - padY / 2,
        total + padX * 2,
        lineHeight + padY,
        style.bgRadius * fontPx * 0.5,
      )
      ctx.fill()
    }

    for (const w of ln) {
      const active = w.active && style.highlightMode !== 'none'

      // Active-word box highlight.
      if (active && style.highlightMode === 'box') {
        ctx.fillStyle = style.highlightBg
        roundRect(
          ctx,
          x - fontPx * 0.12,
          y - lineHeight / 2,
          w.width + fontPx * 0.24,
          lineHeight,
          fontPx * 0.14,
        )
        ctx.fill()
      }

      ctx.save()
      // Scale highlight.
      if (active && style.highlightMode === 'scale') {
        ctx.translate(x + w.width / 2, y)
        ctx.scale(1.14, 1.14)
        ctx.translate(-(x + w.width / 2), -y)
      }

      if (style.shadow) {
        ctx.shadowColor = style.shadowColor
        ctx.shadowBlur = fontPx * 0.08
        ctx.shadowOffsetY = fontPx * 0.04
      }

      // Outline.
      if (outlinePx > 0 && !(active && style.highlightMode === 'box')) {
        ctx.lineWidth = outlinePx * 2
        ctx.strokeStyle = style.outlineColor
        ctx.lineJoin = 'round'
        ctx.strokeText(w.text, x, y)
      }
      ctx.shadowColor = 'transparent'

      ctx.fillStyle = active ? style.highlightColor : style.color
      ctx.fillText(w.text, x, y)

      // Underline highlight.
      if (active && style.highlightMode === 'underline') {
        ctx.fillRect(x, y + fontPx * 0.42, w.width, fontPx * 0.08)
      }
      ctx.restore()

      x += w.width + spacing
    }
    y += lineHeight
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function hexA(hex: string, opacity: number) {
  const a = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}
