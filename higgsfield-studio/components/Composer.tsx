"use client";

import React from "react";
import { Button, MenuItem, Note, Pill, Spinner } from "./ui";
import { ratioLabel } from "@/lib/models";
import { findModel, type FormState, type ToolsInfo } from "@/lib/client-types";

/**
 * Higgsfield-style prompt bar: a `+` for reference images, one prompt field, and
 * a row of pills for model, quality, resolution, ratio and count.
 *
 * Reference images can be added three ways, because people reach for whichever
 * is nearest: the `+` button, dragging files onto the bar, or pasting an image
 * straight from the clipboard.
 */
export function Composer({
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
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(0);
  const [uploadNote, setUploadNote] = React.useState<string | null>(null);
  const [reach, setReach] = React.useState<{
    appUrl: string;
    uploadsUsable: boolean;
    reason: string | null;
  } | null>(null);
  const [urlDraft, setUrlDraft] = React.useState("");
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  // Ask once whether uploads can work at all from this origin.
  React.useEffect(() => {
    fetch("/api/reachability")
      .then((r) => r.json())
      .then(setReach)
      .catch(() => setReach(null));
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const model = findModel(tools, form.model);
  const maxRefs = model?.maxReferences ?? 0;
  const refsFull = form.referenceImages.length >= maxRefs;

  /**
   * Keep the form legal for the selected model: ratios, resolutions, qualities
   * and reference counts all differ between models.
   */
  React.useEffect(() => {
    if (!model) return;
    setForm((f) => {
      const next = { ...f };
      if (model.aspectRatios.length && !model.aspectRatios.includes(f.aspectRatio)) {
        next.aspectRatio = nearestRatio(f.aspectRatio, model.aspectRatios);
      }
      if (f.resolution && !model.resolutions.includes(f.resolution)) next.resolution = "";
      if (f.quality && !model.qualities.includes(f.quality)) next.quality = "";
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

  function addUrlRef() {
    const v = urlDraft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) {
      setUploadNote("A reference must be a full http:// or https:// URL.");
      return;
    }
    if (refsFull) {
      setUploadNote(`${model?.id} accepts at most ${maxRefs}.`);
      return;
    }
    setUploadNote(null);
    set("referenceImages", [...form.referenceImages, v]);
    setUrlDraft("");
    setShowUrlInput(false);
  }

  async function uploadFiles(files: File[]) {
    if (uploadsBlocked) {
      setUploadNote(
        reach?.reason ??
          "Uploads are not usable from this address. Add a reference by URL instead."
      );
      return;
    }
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) {
      setUploadNote("Only image files can be used as references.");
      return;
    }

    const room = maxRefs - form.referenceImages.length;
    if (room <= 0) {
      setUploadNote(
        `${model?.id} accepts at most ${maxRefs} reference image${maxRefs === 1 ? "" : "s"}.`
      );
      return;
    }
    const batch = images.slice(0, room);
    if (images.length > room) {
      setUploadNote(
        `Only ${room} more reference${room === 1 ? "" : "s"} fit for ${model?.id}, so the rest were skipped.`
      );
    } else {
      setUploadNote(null);
    }

    setUploading((n) => n + batch.length);
    try {
      const results = await Promise.all(
        batch.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const json = await res.json();
          if (!json.ok) throw new Error(json.error ?? "Upload failed.");
          return json as { url: string; publiclyReachable: boolean };
        })
      );
      setForm((f) => ({
        ...f,
        referenceImages: [...f.referenceImages, ...results.map((r) => r.url)].slice(
          0,
          maxRefs
        ),
      }));
      if (results.some((r) => !r.publiclyReachable)) {
        setUploadNote(
          "Uploaded, but this app is on localhost. Higgsfield fetches references from its own servers, so it cannot read a localhost address and these will be ignored until the app is deployed. Pasting an already-hosted image URL works right now."
        );
      }
    } catch (err) {
      setUploadNote(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading((n) => Math.max(0, n - batch.length));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!canUseRefs) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void uploadFiles(files);
  }

  /** Catch images pasted straight from the clipboard into the prompt. */
  function onPaste(e: React.ClipboardEvent) {
    if (!canUseRefs) return;
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) {
      e.preventDefault();
      void uploadFiles(files);
    }
  }

  const canUseRefs = maxRefs > 0;
  const refFieldMissing = canUseRefs && !tools.mapping.referenceImages;
  const uploadsBlocked = reach !== null && !reach.uploadsUsable;

  return (
    <div className="space-y-2">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          if (canUseRefs && !uploadsBlocked) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
        onDrop={onDrop}
        className={`relative rounded-3xl border bg-panel/80 p-3 backdrop-blur transition ${
          dragging ? "border-banana bg-banana/5" : "border-line"
        }`}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-ink/85">
            <p className="text-sm font-semibold text-banana">
              Drop image{maxRefs > 1 ? "s" : ""} to use as reference
            </p>
          </div>
        )}

        {(form.referenceImages.length > 0 || uploading > 0) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {form.referenceImages.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="group relative h-16 w-16 overflow-hidden rounded-xl border border-line bg-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Reference ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "referenceImages",
                      form.referenceImages.filter((_, j) => j !== i)
                    )
                  }
                  title="Remove"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[11px] font-bold text-zinc-300 opacity-0 transition hover:text-white group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div
                key={`up-${i}`}
                className="shimmer flex h-16 w-16 items-center justify-center rounded-xl border border-line"
              >
                <Spinner className="h-4 w-4 text-zinc-500" />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => {
              // On a local origin an upload can never be fetched by Higgsfield,
              // so offer the URL field instead of a file dialog that leads
              // nowhere.
              if (uploadsBlocked) setShowUrlInput((s) => !s);
              else fileInput.current?.click();
            }}
            disabled={!canUseRefs || refsFull}
            title={
              !canUseRefs
                ? `${model?.id ?? "This model"} does not accept reference images`
                : refsFull
                  ? `Limit of ${maxRefs} reached`
                  : uploadsBlocked
                    ? "Add a reference image by URL"
                    : "Add reference image"
            }
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel2 text-lg leading-none text-zinc-300 transition enabled:hover:border-zinc-500 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            +
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple={maxRefs > 1}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void uploadFiles(files);
              e.target.value = "";
            }}
          />

          <textarea
            rows={2}
            value={form.prompt}
            onChange={(e) => set("prompt", e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onGenerate();
            }}
            placeholder="Describe the scene you imagine"
            className="min-h-[2.5rem] w-full resize-y bg-transparent px-1 py-2 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill
            label="Model"
            value={model?.id ?? "Select model"}
            disabled={!tools.mapping.model}
          >
            {(close) => (
              <div className="max-h-80 overflow-auto">
                {tools.models.map((m) => (
                  <MenuItem
                    key={m.id}
                    active={m.id === form.model}
                    onClick={() => {
                      set("model", m.id);
                      close();
                    }}
                    sub={
                      m.known
                        ? `${m.label}${m.architecture ? ` · ${m.architecture}` : ""}`
                        : "not in catalog"
                    }
                  >
                    {m.id}
                  </MenuItem>
                ))}
              </div>
            )}
          </Pill>

          {model && model.qualities.length > 0 && (
            <Pill
              label="Quality"
              value={form.quality || model.defaultQuality || "Quality"}
              disabled={!tools.mapping.quality}
            >
              {(close) => (
                <>
                  <MenuItem
                    active={form.quality === ""}
                    onClick={() => {
                      set("quality", "");
                      close();
                    }}
                  >
                    Default
                    {model.defaultQuality ? ` (${model.defaultQuality})` : ""}
                  </MenuItem>
                  {model.qualities.map((q) => (
                    <MenuItem
                      key={q}
                      active={form.quality === q}
                      onClick={() => {
                        set("quality", q);
                        close();
                      }}
                    >
                      {q}
                    </MenuItem>
                  ))}
                </>
              )}
            </Pill>
          )}

          {model && model.resolutions.length > 0 && (
            <Pill
              label="Resolution"
              value={(form.resolution || model.defaultResolution || "res").toUpperCase()}
              disabled={!tools.mapping.resolution}
            >
              {(close) => (
                <>
                  <MenuItem
                    active={form.resolution === ""}
                    onClick={() => {
                      set("resolution", "");
                      close();
                    }}
                  >
                    Default
                    {model.defaultResolution
                      ? ` (${model.defaultResolution.toUpperCase()})`
                      : ""}
                  </MenuItem>
                  {model.resolutions.map((r) => (
                    <MenuItem
                      key={r}
                      active={form.resolution === r}
                      onClick={() => {
                        set("resolution", r);
                        close();
                      }}
                    >
                      {r.toUpperCase()}
                    </MenuItem>
                  ))}
                </>
              )}
            </Pill>
          )}

          <Pill
            label="Aspect ratio"
            value={form.aspectRatio}
            disabled={!tools.mapping.aspectRatio}
          >
            {(close) => (
              <div className="grid max-h-80 grid-cols-3 gap-1 overflow-auto">
                {(model?.aspectRatios ?? []).map((r) => (
                  <button
                    key={r}
                    type="button"
                    title={ratioLabel(r) ?? r}
                    onClick={() => {
                      set("aspectRatio", r);
                      close();
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2 transition ${
                      form.aspectRatio === r
                        ? "border-banana bg-banana/10"
                        : "border-transparent hover:bg-zinc-800"
                    }`}
                  >
                    <RatioGlyph ratio={r} active={form.aspectRatio === r} />
                    <span
                      className={`text-[10px] font-semibold ${form.aspectRatio === r ? "text-banana" : "text-zinc-400"}`}
                    >
                      {r}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Pill>

          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-panel2 px-1.5 py-1">
            <button
              type="button"
              onClick={() => set("count", Math.max(1, form.count - 1))}
              disabled={form.count <= 1}
              title="Fewer images"
              className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition enabled:hover:bg-zinc-700 enabled:hover:text-white disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-[2.2rem] text-center text-xs font-medium text-zinc-300">
              {form.count}/{tools.maxCount}
            </span>
            <button
              type="button"
              onClick={() => set("count", Math.min(tools.maxCount, form.count + 1))}
              disabled={form.count >= tools.maxCount}
              title="More images"
              className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition enabled:hover:bg-zinc-700 enabled:hover:text-white disabled:opacity-30"
            >
              +
            </button>
          </div>

          {tools.hasUnlim && (
            <button
              type="button"
              onClick={() => set("useUnlim", !form.useUnlim)}
              title={
                form.useUnlim
                  ? "Paying from your free unlimited allowance. Always one image."
                  : "Paying with credits."
              }
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                form.useUnlim
                  ? "border-banana bg-banana/10 text-banana"
                  : "border-line bg-panel2 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Unlimited
              <span
                className={`relative h-4 w-7 rounded-full transition ${form.useUnlim ? "bg-banana" : "bg-zinc-700"}`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-ink transition-all ${form.useUnlim ? "left-3.5" : "left-0.5"}`}
                />
              </span>
            </button>
          )}

          <div className="ml-auto">
            <Button
              onClick={onGenerate}
              disabled={busy || !form.prompt.trim()}
              className="rounded-full"
            >
              {busy ? (
                <>
                  <Spinner /> Generating
                </>
              ) : (
                <>Generate{form.count > 1 ? ` ${form.count}` : ""}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {showUrlInput && canUseRefs && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrlRef();
              }
              if (e.key === "Escape") setShowUrlInput(false);
            }}
            placeholder="https://... public image URL"
            className="w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-banana/60"
          />
          <Button variant="outline" onClick={addUrlRef} disabled={refsFull}>
            Add
          </Button>
        </div>
      )}

      {uploadsBlocked && canUseRefs && (
        <Note tone="warn">
          <strong>Uploads cannot work from {reach?.appUrl}.</strong>{" "}
          {reach?.reason} Click <span className="font-semibold">+</span> to add one
          by URL — that works right now.
        </Note>
      )}

      {uploadNote && <Note tone="warn">{uploadNote}</Note>}

      {refFieldMissing && (
        <Note tone="warn">
          {model?.id} accepts up to {maxRefs} reference image
          {maxRefs === 1 ? "" : "s"}, but no matching field was recognised on this
          tool, so references cannot be sent yet. Open the Inspector tab, copy the
          raw schema, and send it over so this can be wired up.
        </Note>
      )}

      {canUseRefs && !refFieldMissing && form.referenceImages.length === 0 && (
        <p className="px-2 text-[11px] leading-relaxed text-zinc-600">
          Click <span className="font-semibold text-zinc-500">+</span>, drag images
          onto the bar, or paste one from your clipboard to use up to {maxRefs} as
          references. Higgsfield loads references from its own servers, so a
          hosted URL always works while uploads need the app deployed.
        </p>
      )}
    </div>
  );
}

/** Box drawn to the real proportions of the ratio. */
function RatioGlyph({ ratio, active }: { ratio: string; active: boolean }) {
  const [a, b] = ratio.split(":").map(Number);
  const max = 22;
  const { w, h } =
    !a || !b
      ? { w: 18, h: 18 }
      : a >= b
        ? { w: max, h: Math.max(6, Math.round((max * b) / a)) }
        : { w: Math.max(6, Math.round((max * a) / b)), h: max };

  return (
    <span className="flex h-6 w-6 items-center justify-center">
      <span
        style={{ width: w, height: h }}
        className={`rounded-[2px] border-2 ${active ? "border-banana bg-banana/20" : "border-zinc-600"}`}
      />
    </span>
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
