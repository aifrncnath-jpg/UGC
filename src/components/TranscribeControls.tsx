import { Loader2, Wand2 } from 'lucide-react'
import { useStore } from '../store'

const MODELS = [
  { value: 'onnx-community/whisper-tiny_timestamped', label: 'Fast (tiny)' },
  { value: 'onnx-community/whisper-base_timestamped', label: 'Balanced (base)' },
  { value: 'onnx-community/whisper-small_timestamped', label: 'Accurate (small)' },
]

const LANGS = [
  ['auto', 'Auto-detect'],
  ['english', 'English'],
  ['spanish', 'Spanish'],
  ['french', 'French'],
  ['german', 'German'],
  ['portuguese', 'Portuguese'],
  ['italian', 'Italian'],
  ['hindi', 'Hindi'],
  ['arabic', 'Arabic'],
  ['japanese', 'Japanese'],
  ['korean', 'Korean'],
  ['chinese', 'Chinese'],
  ['tagalog', 'Tagalog (Filipino)'],
]

export default function TranscribeControls() {
  const status = useStore((s) => s.status)
  const model = useStore((s) => s.model)
  const language = useStore((s) => s.language)
  const setModel = useStore((s) => s.setModel)
  const setLanguage = useStore((s) => s.setLanguage)
  const transcribe = useStore((s) => s.transcribe)
  const progressLabel = useStore((s) => s.progressLabel)
  const progress = useStore((s) => s.progress)
  const chunks = useStore((s) => s.chunks)

  const busy =
    status === 'extracting-audio' ||
    status === 'loading-model' ||
    status === 'transcribing'

  const label = chunks.length ? 'Re-generate' : 'Generate captions'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={busy}
        className="rounded-lg border border-white/10 bg-[#0d0d14] px-2.5 py-2 text-xs text-white/80 outline-none focus:border-[#7c5cff] disabled:opacity-50"
      >
        {MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        disabled={busy}
        className="rounded-lg border border-white/10 bg-[#0d0d14] px-2.5 py-2 text-xs text-white/80 outline-none focus:border-[#7c5cff] disabled:opacity-50"
      >
        {LANGS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>

      <button
        onClick={() => void transcribe()}
        disabled={busy}
        className="flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Wand2 size={16} className="text-[#7c5cff]" />
        )}
        {busy ? 'Working…' : label}
      </button>

      {busy && progressLabel && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>{progressLabel}</span>
          {status === 'loading-model' && progress > 0 && (
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full bg-[#7c5cff] transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
