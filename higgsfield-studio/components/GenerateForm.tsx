"use client";

import React from "react";
import {
  Button,
  Collapse,
  Input,
  Label,
  Note,
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
  const [uploading, setUploading] = React.useState(false);
  const [uploadNote, setUploadNote] = React.useState<string | null>(null);
  const [refDraft, setRefDraft] = React.useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const model = findModel(tools, form.model);
  const preset = tools.presets.find((p) => p.id === form.presetId);
  const groups = [...new Set(tools.presets.map((p) => p.group))];

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

      if (model.aspectRatios.length && !model.aspectRatios.includes(f.aspectRatio)) {
        next.aspectRatio = nearestRatio(f.aspectRatio, model.aspectRatios);
      }
      if (f.resolution && !model.resolutions.includes(f.resolution)) {
        next.resolution = model.resolutions.includes(model.defaultResolution ?? "")
          ? (model.defaultResolution as string)
          : "";
      }
      if (f.quality && !model.qualities.includes(f.quality)) {
        next.quality = model.qualities.includes(model.defaultQuality ?? "")
          ? (model.defaultQuality as string)
          : "";
      }
      if (
        model.maxReferences >= 0 &&
        f.referenceImages.length > model.maxReferences
      ) {
        next.referenceImages = f.referenceImages.slice(0, model.maxReferences);
      }

      const changed =
        next.aspectRatio !== f.aspectRatio ||
        next.resolution !== f.resolution ||
        next.quality !== f.quality ||
        next.referenceImages.length !== f.referenceImages.length;
      return changed ? next : f;
    });
  }, [model, setForm]);

  const refsFull = Boolean(
    model && form.referenceImages.length >= model.maxReferences
  );
  const canUseReferences = Boolean(
    tools.mapping.referenceImages && (model?.maxReferences ?? 0) > 0
  );

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadNote(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Upload failed.");
      set("referenceImages", [...form.referenceImages, json.url]);
      if (!json.publiclyReachable) {
        setUploadNote(
          "Saved locally, but this app is on localhost. Higgsfield cannot fetch a localhost URL, so this reference will be skipped until you deploy or tunnel the app."
        );
      }
    } catch (err) {
      setUploadNote(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function addRefUrl() {
    const v = refDraft.trim();
    if (!v || refsFull) return;
    set("referenceImages", [...form.referenceImages, v]);
    setRefDraft("");
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Prompt"
        subtitle="Describe the subject. The style preset carries the look, so keep this about who and what."
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <TextArea
              id="subject"
              rows={4}
              value={form.subject}
              placeholder="A 38-year-old Filipina mom in a bright kitchen holding a supplement bottle, looking straight at camera, warm confident smile"
              onChange={(e) => set("subject", e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onGenerate();
              }}
            />
            <p className="mt-1.5 text-[11px] text-zinc-600">
              ⌘/Ctrl + Enter to generate.
            </p>
          </div>

          <div>
            <Label htmlFor="preset">Style preset</Label>
            <Select
              id="preset"
              value={form.presetId}
              onChange={(e) => set("presetId", e.target.value)}
            >
              <option value="">None — my prompt only</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {tools.presets
                    .filter((p) => p.group === g)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            {preset?.hint && (
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                {preset.hint}
              </p>
            )}
            {preset && (
              <div className="mt-2">
                <Collapse title="See what this preset appends">
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {preset.text}
                  </p>
                  {preset.negative && (
                    <p className="text-[11px] leading-relaxed text-zinc-500">
                      <span className="font-semibold text-zinc-400">
                        Default negative:
                      </span>{" "}
                      {preset.negative}
                    </p>
                  )}
                </Collapse>
              </div>
            )}
          </div>

          <Collapse title="Extra prompt & negative prompt">
            <div>
              <Label htmlFor="extra" hint="appended before the preset">
                Extra prompt
              </Label>
              <TextArea
                id="extra"
                rows={2}
                value={form.extraPrompt}
                placeholder="holding the bottle label toward camera, morning light"
                onChange={(e) => set("extraPrompt", e.target.value)}
              />
            </div>
            <div>
              <Label
                htmlFor="negative"
                hint={
                  tools.mapping.negativePrompt
                    ? `sent as "${tools.mapping.negativePrompt}"`
                    : "not supported by this tool"
                }
              >
                Negative prompt
              </Label>
              <TextArea
                id="negative"
                rows={2}
                disabled={!tools.mapping.negativePrompt}
                value={form.negativePrompt}
                placeholder={
                  preset?.negative ?? "text artifacts, extra fingers, watermark"
                }
                onChange={(e) => set("negativePrompt", e.target.value)}
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Leave blank to use the preset&apos;s default negative.
              </p>
            </div>
          </Collapse>
        </div>
      </Panel>

      <Panel title="Model">
        <ModelPicker
          tools={tools}
          value={form.model}
          onChange={(id) => set("model", id)}
        />
      </Panel>

      <Panel title="Output">
        <div className="space-y-5">
          <RatioPicker
            model={model}
            value={form.aspectRatio}
            onChange={(r) => set("aspectRatio", r)}
            fieldName={tools.mapping.aspectRatio}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            {model && model.resolutions.length > 0 && tools.mapping.resolution && (
              <div>
                <Label htmlFor="resolution">Resolution</Label>
                <Select
                  id="resolution"
                  value={form.resolution}
                  onChange={(e) => set("resolution", e.target.value)}
                >
                  <option value="">
                    Default
                    {model.defaultResolution ? ` (${model.defaultResolution})` : ""}
                  </option>
                  {model.resolutions.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {model && model.qualities.length > 0 && tools.mapping.quality && (
              <div>
                <Label htmlFor="quality">Quality</Label>
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

            {tools.mapping.batch && (
              <div>
                <Label htmlFor="batch">Images</Label>
                <Input
                  id="batch"
                  type="number"
                  min={1}
                  max={8}
                  value={form.batch}
                  placeholder="1"
                  onChange={(e) => set("batch", e.target.value)}
                />
              </div>
            )}

            {tools.mapping.seed && (
              <div>
                <Label htmlFor="seed" hint="reuse for consistency">
                  Seed
                </Label>
                <Input
                  id="seed"
                  value={form.seed}
                  placeholder="random"
                  onChange={(e) => set("seed", e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </Panel>

      {canUseReferences && (
        <Panel
          title="Reference images"
          subtitle={`${model?.label} accepts up to ${model?.maxReferences}. Great for character consistency across a batch.`}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={refDraft}
                placeholder={
                  refsFull
                    ? "Limit reached for this model"
                    : "https://... paste a hosted image URL"
                }
                disabled={refsFull}
                onChange={(e) => setRefDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRefUrl();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={addRefUrl}
                type="button"
                disabled={refsFull}
              >
                Add
              </Button>
            </div>

            {!refsFull && (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-ink px-4 py-3 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300">
                {uploading ? <Spinner /> : null}
                {uploading ? "Uploading…" : "or upload an image file"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            {uploadNote && <Note tone="warn">{uploadNote}</Note>}

            {form.referenceImages.length > 0 && (
              <ul className="space-y-1.5">
                {form.referenceImages.map((r, i) => (
                  <li
                    key={`${r}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-2.5 py-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-400">
                      {r}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        set(
                          "referenceImages",
                          form.referenceImages.filter((_, j) => j !== i)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}

      {tools.advancedFields.length > 0 && (
        <Collapse
          title="Advanced — every other field this tool declares"
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
          disabled={busy || !form.subject.trim()}
        >
          {busy ? (
            <>
              <Spinner /> Generating…
            </>
          ) : (
            <>
              Generate {form.aspectRatio} with {model?.label ?? "selected model"}
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
