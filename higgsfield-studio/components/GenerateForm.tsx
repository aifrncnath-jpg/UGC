"use client";

import React from "react";
import {
  Button,
  Chip,
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

  const canUseReferences = Boolean(
    tools.mapping.referenceImages && (model?.maxReferences ?? 0) > 0
  );
  const refsFull = Boolean(
    model && form.referenceImages.length >= model.maxReferences
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
          "Saved, but this app is running on localhost. Higgsfield cannot fetch a localhost URL, so this reference will be ignored until the app is deployed. A pasted hosted URL works right now."
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
      // Trim references down if the newly chosen model accepts fewer.
      if (f.referenceImages.length > model.maxReferences) {
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

          {/*
            Rendered whenever the selected model HAS resolutions, even if the
            tool schema didn't declare a matching field. Hiding the control in
            that case makes it look like the app forgot 1K/2K/4K entirely, when
            the real problem is a field name we failed to recognise — so say so
            instead of vanishing.
          */}
          {model && model.resolutions.length > 0 && (
            <div>
              <Label
                hint={
                  tools.mapping.resolution
                    ? `sent as "${tools.mapping.resolution}"${model.defaultResolution ? ` · default ${model.defaultResolution}` : ""}`
                    : "no matching field found on this tool"
                }
              >
                Resolution
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  active={form.resolution === ""}
                  disabled={!tools.mapping.resolution}
                  onClick={() => set("resolution", "")}
                >
                  Default
                </Chip>
                {model.resolutions.map((r) => (
                  <Chip
                    key={r}
                    active={form.resolution === r}
                    disabled={!tools.mapping.resolution}
                    onClick={() => set("resolution", r)}
                  >
                    {r.toUpperCase()}
                  </Chip>
                ))}
              </div>
              {!tools.mapping.resolution && (
                <div className="mt-2">
                  <Note tone="warn">
                    {model.id} supports {model.resolutions.map((r) => r.toUpperCase()).join(" / ")}
                    , but no resolution field was recognised on this tool, so the
                    server default will be used. Open the Inspector tab and send
                    over the raw schema and this can be wired up.
                  </Note>
                </div>
              )}
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

      {canUseReferences && (
        <Panel
          title="Reference images"
          subtitle={`${model?.id} accepts up to ${model?.maxReferences}. Use these for character or product consistency.`}
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
                      className="h-9 w-9 shrink-0 rounded bg-ink object-cover"
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

            <p className="text-[11px] leading-relaxed text-zinc-600">
              Higgsfield fetches reference images from its own servers, so the URL
              has to be reachable from the internet. A pasted hosted URL always
              works. Uploads only work once this app is deployed, since nothing
              outside your machine can read a localhost address.
            </p>
          </div>
        </Panel>
      )}

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
