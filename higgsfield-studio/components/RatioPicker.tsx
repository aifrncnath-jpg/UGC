"use client";

import { Label } from "./ui";
import { ratioLabel } from "@/lib/models";
import type { ResolvedModel } from "@/lib/client-types";

/**
 * Aspect-ratio picker that draws each ratio to scale, so 9:16 versus 4:5 is
 * obvious at a glance. Only shows ratios the selected model actually accepts —
 * GPT Image 2 has no 4:5, 5:4 or 21:9, and sending one would fail the call.
 */
export function RatioPicker({
  model,
  value,
  onChange,
  fieldName,
}: {
  model: ResolvedModel | undefined;
  value: string;
  onChange: (ratio: string) => void;
  fieldName: string | null;
}) {
  const ratios = model?.aspectRatios ?? [];

  return (
    <div>
      <Label
        hint={
          fieldName
            ? `sent as "${fieldName}"${model ? ` · ${ratios.length} available for ${model.label}` : ""}`
            : "this tool takes no aspect ratio field"
        }
      >
        Aspect ratio
      </Label>
      <div className="flex flex-wrap gap-2">
        {ratios.map((r) => (
          <RatioTile
            key={r}
            ratio={r}
            active={value === r}
            onClick={() => onChange(r)}
          />
        ))}
      </div>
      {value && ratioLabel(value) && (
        <p className="mt-2 text-[11px] text-zinc-500">{ratioLabel(value)}</p>
      )}
      {!ratios.includes(value) && value && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-400">
          {model?.label ?? "This model"} does not support {value}. Pick one above
          before generating.
        </p>
      )}
    </div>
  );
}

/** Box drawn to the real proportions of the ratio, capped to fit the tile. */
function shape(ratio: string): { w: number; h: number } {
  if (ratio === "auto") return { w: 26, h: 26 };
  const [a, b] = ratio.split(":").map(Number);
  if (!a || !b) return { w: 26, h: 26 };
  const max = 30;
  return a >= b
    ? { w: max, h: Math.max(8, Math.round((max * b) / a)) }
    : { w: Math.max(8, Math.round((max * a) / b)), h: max };
}

function RatioTile({
  ratio,
  active,
  onClick,
}: {
  ratio: string;
  active: boolean;
  onClick: () => void;
}) {
  const { w, h } = shape(ratio);
  return (
    <button
      type="button"
      onClick={onClick}
      title={ratioLabel(ratio) ?? ratio}
      className={`flex w-[72px] flex-col items-center gap-2 rounded-xl border px-2 py-2.5 transition ${
        active
          ? "border-banana bg-banana/10"
          : "border-line bg-panel2 hover:border-zinc-600"
      }`}
    >
      <span className="flex h-[34px] w-[34px] items-center justify-center">
        <span
          style={{ width: w, height: h }}
          className={`rounded-[3px] border-2 ${
            active ? "border-banana bg-banana/20" : "border-zinc-600"
          }`}
        >
          {ratio === "auto" && (
            <span
              className={`flex h-full w-full items-center justify-center text-[9px] font-bold ${active ? "text-banana" : "text-zinc-500"}`}
            >
              A
            </span>
          )}
        </span>
      </span>
      <span
        className={`text-[11px] font-semibold ${active ? "text-banana" : "text-zinc-400"}`}
      >
        {ratio}
      </span>
    </button>
  );
}
