"use client";

import { Label, Note, Select } from "./ui";
import type { ResolvedModel, ToolsInfo } from "@/lib/client-types";

/**
 * Model chooser.
 *
 * Deliberate design choice: the raw slug is the primary label on each card, with
 * the friendly name underneath. Higgsfield's own naming is genuinely confusing —
 * `nano_banana_2` is the one they call "Nano Banana Pro", while
 * `nano_banana_flash` is the one they call "Nano Banana 2" — so showing a
 * friendly name alone would hide which model is actually being billed. The slug
 * is what gets sent, so the slug is what gets shown.
 */
export function ModelPicker({
  tools,
  value,
  onChange,
}: {
  tools: ToolsInfo;
  value: string;
  onChange: (id: string) => void;
}) {
  const featured = tools.models.filter((m) => m.tier === 1);
  const rest = tools.models.filter((m) => m.tier !== 1);
  const selected = tools.models.find((m) => m.id === value);
  const selectedIsFeatured = featured.some((m) => m.id === value);

  return (
    <div className="space-y-3">
      <Label
        hint={
          tools.mapping.model
            ? `sent as "${tools.mapping.model}"`
            : "this tool takes no model field"
        }
      >
        Model
      </Label>

      {featured.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {featured.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              active={m.id === value}
              onClick={() => onChange(m.id)}
            />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <Select
            value={selectedIsFeatured ? "" : value}
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
          >
            <option value="">
              {selectedIsFeatured
                ? `More models (${rest.length})…`
                : "Choose a model"}
            </option>
            {rest.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
                {m.known ? ` — ${m.label}` : "  (not in catalog)"}
              </option>
            ))}
          </Select>
          {selected && !selectedIsFeatured && (
            <div className="mt-2 rounded-xl border border-banana/40 bg-banana/5 px-3.5 py-2.5">
              <p className="font-mono text-xs font-semibold text-banana">
                {selected.id}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {selected.label}
                {selected.architecture ? ` · ${selected.architecture}` : ""}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                {selected.blurb}
              </p>
              <ModelFacts model={selected} />
            </div>
          )}
        </div>
      )}

      {tools.modelsFromSchema ? (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          These are the exact values the MCP server declared. Names come from
          Higgsfield&apos;s CLI reference and can be counter-intuitive — the slug
          is what gets sent, so trust the slug.
        </p>
      ) : (
        <Note tone="warn">
          The server did not list its model values in the tool schema, so this is
          the built-in catalog and the slugs may not match. Open the Inspector
          tab, copy the raw schema, and send it over so this can be corrected.
        </Note>
      )}
    </div>
  );
}

function ModelCard({
  model,
  active,
  onClick,
}: {
  model: ResolvedModel;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3.5 text-left transition ${
        active
          ? "border-banana bg-banana/10"
          : "border-line bg-panel2 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className={`block truncate font-mono text-sm font-semibold ${active ? "text-banana" : "text-zinc-200"}`}
          >
            {model.id}
          </span>
          <span className="mt-0.5 block text-[11px] text-zinc-400">
            {model.label}
          </span>
          {model.architecture && (
            <span className="block text-[10px] text-zinc-600">
              {model.architecture}
            </span>
          )}
        </div>
        {active && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="mt-0.5 shrink-0"
          >
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-banana"
            />
          </svg>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        {model.blurb}
      </p>
      <ModelFacts model={model} />
    </button>
  );
}

function ModelFacts({ model }: { model: ResolvedModel }) {
  const facts: string[] = [`${model.aspectRatios.length} ratios`];
  if (model.resolutions.length) {
    facts.push(
      `up to ${model.resolutions[model.resolutions.length - 1].toUpperCase()}`
    );
  }
  if (model.qualities.length) facts.push("quality dial");
  facts.push(
    model.maxReferences === 0
      ? "no refs"
      : `${model.maxReferences} ref${model.maxReferences === 1 ? "" : "s"}`
  );
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {facts.map((f) => (
        <span
          key={f}
          className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
        >
          {f}
        </span>
      ))}
    </div>
  );
}
