import type { CaptionChunk } from '../types'

function pad(n: number, len = 2) {
  return String(Math.floor(n)).padStart(len, '0')
}

function srtTime(sec: number) {
  const ms = Math.floor((sec % 1) * 1000)
  const s = Math.floor(sec) % 60
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600)
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`
}

function vttTime(sec: number) {
  return srtTime(sec).replace(',', '.')
}

export function chunkText(chunk: CaptionChunk) {
  return chunk.words.map((w) => w.text).join(' ')
}

export function toSRT(chunks: CaptionChunk[]): string {
  return chunks
    .map((c, i) => {
      return `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${chunkText(c)}\n`
    })
    .join('\n')
}

export function toVTT(chunks: CaptionChunk[]): string {
  const body = chunks
    .map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${chunkText(c)}\n`)
    .join('\n')
  return `WEBVTT\n\n${body}`
}

export function toPlainText(chunks: CaptionChunk[]): string {
  return chunks.map(chunkText).join(' ')
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
