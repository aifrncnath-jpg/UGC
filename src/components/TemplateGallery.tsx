import { useState } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '../store'
import { TEMPLATES } from '../lib/templates'

const TAGS = ['All', 'UGC', 'VSL', 'Ads'] as const

export default function TemplateGallery() {
  const activeId = useStore((s) => s.activeTemplateId)
  const applyTemplate = useStore((s) => s.applyTemplate)
  const [tag, setTag] = useState<(typeof TAGS)[number]>('All')

  const list = TEMPLATES.filter((t) => tag === 'All' || t.tag === tag)

  return (
    <div className="p-4">
      <div className="mb-3 flex gap-1.5">
        {TAGS.map((tg) => (
          <button
            key={tg}
            onClick={() => setTag(tg)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              tag === tg
                ? 'bg-[#7c5cff] text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {tg}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {list.map((t) => {
          const selected = activeId === t.id
          return (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-[#7c5cff] bg-[#7c5cff]/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              {/* Mini preview of the caption look */}
              <div className="mb-2 flex h-14 items-center justify-center rounded-lg bg-black/60">
                <span
                  style={{
                    fontFamily: `'${t.style.fontFamily}', sans-serif`,
                    fontWeight: t.style.fontWeight,
                    textTransform: t.style.uppercase ? 'uppercase' : 'none',
                    color: t.style.color,
                    WebkitTextStrokeWidth: t.style.outlineWidth > 0 ? '1px' : 0,
                    WebkitTextStrokeColor: t.style.outlineColor,
                    paintOrder: 'stroke fill',
                    fontSize: 18,
                  }}
                >
                  Aa{' '}
                  <span
                    style={{
                      color:
                        t.style.highlightMode === 'box'
                          ? t.style.highlightColor
                          : t.style.highlightColor,
                      background:
                        t.style.highlightMode === 'box'
                          ? t.style.highlightBg
                          : undefined,
                      borderRadius: 4,
                      padding: t.style.highlightMode === 'box' ? '0 4px' : 0,
                    }}
                  >
                    word
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{t.name}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                  {t.tag}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-snug text-white/45">
                {t.description}
              </p>
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#7c5cff] text-white">
                  <Check size={12} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
