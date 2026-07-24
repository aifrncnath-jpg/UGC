import { useStore } from '../store'
import { FONTS } from '../lib/fonts'
import type {
  CaptionStyle,
  EntranceAnimation,
  HighlightMode,
  WordReveal,
} from '../types'
import { ColorField, Field, Segmented, Slider, Toggle } from './controls'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/5 px-4 py-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export default function StylePanel() {
  const style = useStore((s) => s.style)
  const update = useStore((s) => s.updateStyle)
  const setMaxWords = useStore((s) => s.setMaxWords)

  const set = <K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K]) =>
    update({ [key]: value } as Partial<CaptionStyle>)

  const cats = ['UGC', 'VSL', 'Ads'] as const

  return (
    <div className="pb-6">
      <Section title="Font">
        <Field label="Typeface">
          <select
            value={`${style.fontFamily}|${style.fontWeight}`}
            onChange={(e) => {
              const [family, weight] = e.target.value.split('|')
              update({ fontFamily: family, fontWeight: Number(weight) })
            }}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#7c5cff]"
          >
            {cats.map((cat) => (
              <optgroup key={cat} label={`${cat} fonts`}>
                {FONTS.filter((f) => f.category === cat).map((f) => (
                  <option key={f.label} value={`${f.value}|${f.weight}`}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Size" hint={`${style.fontSize.toFixed(1)}%`}>
          <Slider
            value={style.fontSize}
            min={2}
            max={14}
            step={0.1}
            onChange={(v) => set('fontSize', v)}
          />
        </Field>
        <Field label="Letter spacing" hint={style.letterSpacing.toFixed(1)}>
          <Slider
            value={style.letterSpacing}
            min={-2}
            max={6}
            step={0.1}
            onChange={(v) => set('letterSpacing', v)}
          />
        </Field>
        <Toggle
          label="UPPERCASE"
          checked={style.uppercase}
          onChange={(v) => set('uppercase', v)}
        />
      </Section>

      <Section title="Colors & highlight">
        <ColorField
          label="Text color"
          value={style.color}
          onChange={(v) => set('color', v)}
        />
        <Field label="Active word style">
          <Segmented<HighlightMode>
            value={style.highlightMode}
            onChange={(v) => set('highlightMode', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'color', label: 'Color' },
              { value: 'scale', label: 'Scale' },
              { value: 'box', label: 'Box' },
              { value: 'underline', label: 'Line' },
            ]}
          />
        </Field>
        {style.highlightMode !== 'none' && (
          <ColorField
            label="Highlight color"
            value={style.highlightColor}
            onChange={(v) => set('highlightColor', v)}
          />
        )}
        {style.highlightMode === 'box' && (
          <ColorField
            label="Highlight box color"
            value={style.highlightBg}
            onChange={(v) => set('highlightBg', v)}
          />
        )}
      </Section>

      <Section title="Outline & shadow">
        <Field label="Outline width" hint={`${style.outlineWidth}`}>
          <Slider
            value={style.outlineWidth}
            min={0}
            max={16}
            step={0.5}
            onChange={(v) => set('outlineWidth', v)}
          />
        </Field>
        {style.outlineWidth > 0 && (
          <ColorField
            label="Outline color"
            value={style.outlineColor}
            onChange={(v) => set('outlineColor', v)}
          />
        )}
        <Toggle
          label="Drop shadow"
          checked={style.shadow}
          onChange={(v) => set('shadow', v)}
        />
      </Section>

      <Section title="Background box">
        <Toggle
          label="Enable background"
          checked={style.bgEnabled}
          onChange={(v) => set('bgEnabled', v)}
        />
        {style.bgEnabled && (
          <>
            <ColorField
              label="Background color"
              value={style.bgColor}
              onChange={(v) => set('bgColor', v)}
            />
            <Field label="Opacity" hint={`${Math.round(style.bgOpacity * 100)}%`}>
              <Slider
                value={style.bgOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set('bgOpacity', v)}
              />
            </Field>
            <Field label="Corner radius" hint={style.bgRadius.toFixed(1)}>
              <Slider
                value={style.bgRadius}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => set('bgRadius', v)}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Animation & layout">
        <Field label="Entrance animation">
          <select
            value={style.entrance}
            onChange={(e) => set('entrance', e.target.value as EntranceAnimation)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#7c5cff]"
          >
            <option value="none">None</option>
            <option value="pop">Pop</option>
            <option value="fade">Fade</option>
            <option value="slide-up">Slide up</option>
            <option value="bounce">Bounce</option>
            <option value="shake">Shake</option>
          </select>
        </Field>
        <Field label="Reveal">
          <Segmented<WordReveal>
            value={style.wordReveal}
            onChange={(v) => set('wordReveal', v)}
            options={[
              { value: 'chunk', label: 'Whole line' },
              { value: 'word', label: 'Word by word' },
            ]}
          />
        </Field>
        <Field label="Words per line" hint={`${style.maxWords}`}>
          <Slider
            value={style.maxWords}
            min={1}
            max={10}
            step={1}
            onChange={(v) => setMaxWords(v)}
          />
        </Field>
        <Field label="Vertical position" hint={`${style.positionY}%`}>
          <Slider
            value={style.positionY}
            min={5}
            max={95}
            step={1}
            onChange={(v) => set('positionY', v)}
          />
        </Field>
      </Section>
    </div>
  )
}
