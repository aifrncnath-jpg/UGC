import { useMemo } from 'react'
import type { CaptionChunk, CaptionStyle } from '../types'

const ENTRANCE_KEYFRAME: Record<string, string> = {
  none: 'none',
  pop: 'cap-pop',
  fade: 'cap-fade',
  'slide-up': 'cap-slide-up',
  bounce: 'cap-bounce',
  shake: 'cap-shake',
}

/** Index of the chunk that should be visible at time t (continuous captions). */
export function activeChunkIndex(chunks: CaptionChunk[], t: number): number {
  let idx = -1
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].start <= t) idx = i
    else break
  }
  if (idx === -1) return -1
  const chunk = chunks[idx]
  const next = chunks[idx + 1]
  const visibleUntil = next ? next.start : chunk.end + 1
  return t < visibleUntil ? idx : -1
}

interface Props {
  chunks: CaptionChunk[]
  style: CaptionStyle
  currentTime: number
  stageHeight: number
  /** Disable entrance animations (e.g. while scrubbing) for a stable preview. */
  freeze?: boolean
}

export default function CaptionOverlay({
  chunks,
  style,
  currentTime,
  stageHeight,
  freeze,
}: Props) {
  const idx = useMemo(
    () => activeChunkIndex(chunks, currentTime),
    [chunks, currentTime],
  )
  if (idx === -1 || stageHeight === 0) return null
  const chunk = chunks[idx]

  const fontPx = (stageHeight * style.fontSize) / 100
  const outlinePx = (fontPx * style.outlineWidth) / 100
  const t = currentTime

  const shadow = style.shadow
    ? `0 ${Math.max(2, fontPx * 0.04)}px ${Math.max(2, fontPx * 0.08)}px ${style.shadowColor}cc`
    : 'none'

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: `${style.positionY}%`,
    transform: 'translate(-50%, -50%)',
    width: '86%',
    textAlign: 'center',
    fontFamily: `'${style.fontFamily}', sans-serif`,
    fontWeight: style.fontWeight,
    fontSize: `${fontPx}px`,
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing * (fontPx / 100)}em`,
    textTransform: style.uppercase ? 'uppercase' : 'none',
    pointerEvents: 'none',
    userSelect: 'none',
  }

  const bgWrapStyle: React.CSSProperties = style.bgEnabled
    ? {
        display: 'inline-block',
        background: hexWithOpacity(style.bgColor, style.bgOpacity),
        padding: `${style.bgPaddingY * fontPx * 0.5}px ${style.bgPaddingX * fontPx * 0.5}px`,
        borderRadius: `${style.bgRadius * fontPx * 0.5}px`,
      }
    : { display: 'inline' }

  const chunkAnim =
    style.wordReveal === 'chunk' && !freeze && style.entrance !== 'none'
      ? `${ENTRANCE_KEYFRAME[style.entrance]} 0.35s cubic-bezier(.2,.9,.3,1.2) both`
      : undefined

  return (
    <div style={containerStyle}>
      <span
        // Key on chunk id so the entrance animation retriggers per chunk.
        key={chunk.id}
        style={{ ...bgWrapStyle, animation: chunkAnim }}
      >
        {chunk.words.map((w, i) => {
          const appeared = style.wordReveal === 'chunk' || t >= w.start - 0.02
          const active = t >= w.start && t < w.end
          if (!appeared) {
            // Reserve nothing; word simply hasn't been spoken yet.
            return null
          }

          const wordAnim =
            style.wordReveal === 'word' && !freeze && style.entrance !== 'none'
              ? `${ENTRANCE_KEYFRAME[style.entrance]} 0.28s cubic-bezier(.2,.9,.3,1.2) both`
              : undefined

          return (
            <span
              key={`${i}-${appeared}`}
              style={{
                display: 'inline-block',
                margin: '0 0.22em 0.1em 0',
                animation: wordAnim,
                ...wordVisual(style, active, fontPx, outlinePx, shadow),
              }}
            >
              {w.text}
            </span>
          )
        })}
      </span>
    </div>
  )
}

function wordVisual(
  style: CaptionStyle,
  active: boolean,
  fontPx: number,
  outlinePx: number,
  shadow: string,
): React.CSSProperties {
  const base: React.CSSProperties = {
    color: style.color,
    WebkitTextStrokeWidth: outlinePx > 0 ? `${outlinePx}px` : undefined,
    WebkitTextStrokeColor: outlinePx > 0 ? style.outlineColor : undefined,
    paintOrder: 'stroke fill',
    textShadow: shadow,
    transition: 'color 0.08s linear',
  }

  if (!active || style.highlightMode === 'none') return base

  switch (style.highlightMode) {
    case 'color':
      return { ...base, color: style.highlightColor }
    case 'scale':
      return {
        ...base,
        color: style.highlightColor,
        transform: 'scale(1.14)',
      }
    case 'box':
      return {
        ...base,
        color: style.highlightColor,
        background: style.highlightBg,
        borderRadius: `${fontPx * 0.14}px`,
        padding: `0 ${fontPx * 0.12}px`,
        WebkitTextStrokeWidth: 0,
      }
    case 'underline':
      return {
        ...base,
        color: style.highlightColor,
        boxShadow: `inset 0 -0.14em 0 ${style.highlightColor}`,
      }
    default:
      return base
  }
}

function hexWithOpacity(hex: string, opacity: number) {
  const a = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}
