"use client";

import React from "react";
import {
  Button,
  Chip,
  Collapse,
  Input,
  Label,
  Panel,
  Select,
  Spinner,
  TextArea,
} from "./ui";
import { ModelPicker } from "./ModelPicker";
import { RatioPicker } from "./RatioPicker";
import { findModel, type FormState, type ToolsInfo } from "@/lib/client-types";

export function GenerateForm({
  tools,
  form,
  setForm,
  onGenerate,
  busy,
}: {
  tools: ToolsInfo;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onGenerate: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const model = findModel(tools, form.model);

  /**
   * Keep the form legal for the selected model. Switching from Nano Banana Pro
   * (which does 4:5) to GPT Image 2 (which doesn't) has to move the ratio to
   * something valid, and it should preserve the orientation the user wanted
   * rather than dumping them on 1:1.
   */
  React.useEffect(() => {
    if (!model) return;
    setForm((f) => {
      const next = { ...f };

      if (
        model.aspectRatios.length &&
        !model.aspectRatios.includes(f.aspectRatio)
      ) {
        next.aspectRatio = nearestRatio(f.aspectRatio, model.aspectRatios);
      }
      if (f.resolution && !model.resolutions.includes(f.resolution)) {
        next.resolution = "";
      }
      if (f.quality && !model.qualities.includes(f.quality)) {
        next.quality = "";
      }

      const changed =
        next.aspectRatio !== f.aspectRatio ||
        next.resolution !== f.resolution ||
        next.quality !== f.quality;
      return changed ? next : f;
    });
  }, [model, setForm]);

  const counts = Array.from({ length: tools.maxCount }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <Panel title="Model">
        <ModelPicker
          tools={tools}
          value={form.model}
          onChange={(id) => set("model", id)}
        />
      </Panel>

      <Panel title="Prompt">
        <TextArea
          id="prompt"
          rows={7}
          value={form.prompt}
          placeholder="Describe the image you want…"
          onChange={(e) => set("prompt", e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onGenerate();
          }}
        />
        <p className="mt-1.5 text-[11px] text-zinc-600">
          ⌘/Ctrl + Enter to generate.
          {tools.mapping.prompt && (
            <span className="ml-1.5 font-mono">
              sent as &quot;{tools.mapping.prompt}&quot;
            </span>
          )}
        </p>
      </Panel>

      <Panel title="Output">
        <div className="space-y-5">
          <RatioPicker
            model={model}
            value={form.aspectRatio}
            onChange={(r) => set("aspectRatio", r)}
            fieldName={tools.mapping.aspectRatio}
          />

          {model && model.resolutions.length > 0 && tools.mapping.resolution && (
            <div>
              <Label
                hint={`sent as "${tools.mapping.resolution}"${model.defaultResolution ? ` · default ${model.defaultResolution}` : ""}`}
              >
                Resolution
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  active={form.resolution === ""}
                  onClick={() => set("resolution", "")}
                >
                  Default
                </Chip>
                {model.resolutions.map((r) => (
                  <Chip
                    key={r}
                    active={form.resolution === r}
                    onClick={() => set("resolution", r)}
                  >
                    {r.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label
              hint={
                form.count > 1
                  ? `${form.count}x the credits of one image`
                  : undefined
              }
            >
              Number of images
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {counts.map((n) => (
                <Chip
                  key={n}
                  active={form.count === n}
                  onClick={() => set("count", n)}
                >
                  {n}
                </Chip>
              ))}
            </div>
            {form.count > 1 && !tools.hasNativeBatch && (
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                This tool has no batch parameter, so {form.count} separate
                generations run at once. Each is billed individually.
              </p>
            )}
          </div>

          {model && model.qualities.length > 0 && tools.mapping.quality && (
            <div>
              <Label htmlFor="quality" hint={`sent as "${tools.mapping.quality}"`}>
                Quality
              </Label>
              <Select
                id="quality"
                value={form.quality}
                onChange={(e) => set("quality", e.target.value)}
              >
                <option value="">
                  Default
                  {model.defaultQuality ? ` (${model.defaultQuality})` : ""}
                </option>
                {model.qualities.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Panel>

      {tools.advancedFields.length > 0 && (
        <Collapse
          title="Advanced — other fields this tool declares"
          count={tools.advancedFields.length}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {tools.advancedFields.map((f) => (
              <div key={f.name}>
                <Label
                  htmlFor={`adv-${f.name}`}
                  hint={f.required ? "required" : undefined}
                >
                  {f.name}
                </Label>
                {f.enumValues?.length ? (
                  <Select
                    id={`adv-${f.name}`}
                    value={form.advanced[f.name] ?? ""}
                    onChange={(e) =>
                      set("advanced", {
                        ...form.advanced,
                        [f.name]: e.target.value,
                      })
                    }
                  >
                    <option value="">Default</option>
                    {f.enumValues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                ) : f.kind === "boolean" ? (
                  <Select
                    id={`adv-${f.name}`}
                    value={form.advanced[f.name] ?? ""}
                    onChange={(e) =>
                      set("advanced", {
                        ...form.advanced,
                        [f.name]: e.target.value,
                      })
                    }
                  >
                    <option value="">Default</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </Select>
                ) : (
                  <Input
                    id={`adv-${f.name}`}
                    type={
                      f.kind === "number" || f.kind === "integer"
                        ? "number"
                        : "text"
                    }
                    value={form.advanced[f.name] ?? ""}
                    placeholder={
                      f.default !== null && f.default !== undefined
                        ? String(f.default)
                        : f.kind === "array"
                          ? "comma separated"
                          : f.kind
                    }
                    onChange={(e) =>
                      set("advanced", {
                        ...form.advanced,
                        [f.name]: e.target.value,
                      })
                    }
                  />
                )}
                {f.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                    {f.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Collapse>
      )}

      <div className="sticky bottom-4 z-10">
        <Button
          size="lg"
          className="w-full shadow-lg shadow-black/40"
          onClick={onGenerate}
          disabled={busy || !form.prompt.trim()}
        >
          {busy ? (
            <>
              <Spinner /> Generating…
            </>
          ) : (
            <>
              Generate {form.count > 1 ? `${form.count} images` : "image"} ·{" "}
              {form.aspectRatio}
              {form.resolution ? ` · ${form.resolution.toUpperCase()}` : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Pick the closest legal ratio, preserving orientation and getting as near to
 * the original proportion as possible.
 */
function nearestRatio(current: string, allowed: string[]): string {
  const parse = (r: string): number | null => {
    const [a, b] = r.split(":").map(Number);
    return a && b ? a / b : null;
  };
  const target = parse(current);
  const candidates = allowed.filter((r) => parse(r) !== null);
  if (target === null || !candidates.length) return allowed[0];

  const sameOrientation = candidates.filter((r) => {
    const v = parse(r)!;
    return target === 1 ? v === 1 : target < 1 ? v < 1 : v > 1;
  });
  const pool = sameOrientation.length ? sameOrientation : candidates;

  return pool.reduce((best, r) =>
    Math.abs(parse(r)! - target) < Math.abs(parse(best)! - target) ? r : best
  );
}
