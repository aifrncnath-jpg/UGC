import crypto from "node:crypto";
import { callTool, NotConnectedError, type RawToolResult } from "./mcp";
import { coerceValue, getImageTool, type ImageToolInfo } from "./tools";
import { isPending, parseToolResult, type ParsedResult } from "./extract";
import { mirrorRemoteImage, saveBase64Image } from "./assets";
import { updateStore, type GalleryItem } from "./store";
import { appUrl } from "./config";
import { composePrompt, presetById } from "./presets";
import { findModelSpec } from "./models";

export interface GenerateRequest {
  subject: string;
  presetId?: string;
  extraPrompt?: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  seed?: string | number;
  batch?: string | number;
  referenceImages?: string[];
  advanced?: Record<string, unknown>;
}

export class InvalidComboError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidComboError";
  }
}

/**
 * Backstop for per-model constraints.
 *
 * The UI already narrows the ratio and resolution pickers to what the chosen
 * model accepts, but a stale tab or a reused gallery item could still submit an
 * illegal pair. We'd rather fail loudly than silently drop the aspect ratio and
 * burn credits rendering a square when the user asked for 9:16.
 */
function validateAgainstModel(info: ImageToolInfo, body: GenerateRequest): void {
  if (!body.model) return;
  const spec = findModelSpec(body.model);
  if (!spec) return;

  if (
    body.aspectRatio &&
    spec.aspectRatios.length &&
    !spec.aspectRatios.includes(body.aspectRatio)
  ) {
    throw new InvalidComboError(
      `${spec.label} does not support ${body.aspectRatio}. It accepts: ${spec.aspectRatios.join(", ")}.`
    );
  }

  if (
    body.resolution &&
    spec.resolutions?.length &&
    !spec.resolutions.includes(body.resolution)
  ) {
    throw new InvalidComboError(
      `${spec.label} does not support ${body.resolution} resolution. It accepts: ${spec.resolutions.join(", ")}.`
    );
  }

  if (
    body.quality &&
    spec.qualities?.length &&
    !spec.qualities.includes(body.quality)
  ) {
    throw new InvalidComboError(
      `${spec.label} does not support "${body.quality}" quality. It accepts: ${spec.qualities.join(", ")}.`
    );
  }

  const refCount = (body.referenceImages ?? []).filter((r) => r.trim()).length;
  if (refCount > spec.maxReferences) {
    throw new InvalidComboError(
      spec.maxReferences === 0
        ? `${spec.label} does not accept reference images.`
        : `${spec.label} accepts at most ${spec.maxReferences} reference image${spec.maxReferences === 1 ? "" : "s"}, but ${refCount} were provided.`
    );
  }

  void info;
}

/**
 * Turns the browser form into a validated MCP tool-argument object.
 *
 * Every value is routed through the field name and type that the server's own
 * JSON Schema declares, and unknown-to-us keys from the Advanced panel are
 * coerced the same way. Anything the schema doesn't declare is dropped rather
 * than sent, because Higgsfield rejects unexpected properties.
 */
export function buildArgs(
  info: ImageToolInfo,
  body: GenerateRequest
): { args: Record<string, unknown>; prompt: string; warnings: string[] } {
  validateAgainstModel(info, body);

  const warnings: string[] = [];
  const args: Record<string, unknown> = {};
  const field = (name?: string) => info.fields.find((f) => f.name === name);

  const preset = body.presetId ? presetById(body.presetId) : undefined;
  const prompt = composePrompt(
    [body.subject, body.extraPrompt].filter(Boolean).join(" "),
    preset?.text
  );

  if (info.promptField) {
    args[info.promptField] = prompt;
  } else {
    throw new Error(
      `The tool "${info.tool.name}" has no field that looks like a prompt. Open the Inspector tab to see its schema.`
    );
  }

  const negative =
    body.negativePrompt?.trim() ||
    (body.presetId ? preset?.negative : undefined);
  if (negative && info.negativePromptField) {
    args[info.negativePromptField] = negative;
  } else if (negative && !info.negativePromptField) {
    warnings.push(
      "This model has no negative-prompt field, so the negative prompt was not sent."
    );
  }

  const setIfPossible = (
    fieldName: string | undefined,
    value: unknown,
    label: string
  ) => {
    if (value === undefined || value === null || value === "") return;
    const f = field(fieldName);
    if (!f) {
      warnings.push(`The tool has no ${label} field, so that value was skipped.`);
      return;
    }
    if (f.enumValues?.length && typeof value === "string" && !f.enumValues.includes(value)) {
      warnings.push(
        `"${value}" is not a valid ${label} for this model. Allowed: ${f.enumValues.join(", ")}.`
      );
      return;
    }
    const coerced = coerceValue(f, value);
    if (coerced !== undefined) args[f.name] = coerced;
  };

  setIfPossible(info.modelField, body.model, "model");
  setIfPossible(info.aspectRatioField, body.aspectRatio, "aspect ratio");
  setIfPossible(info.resolutionField, body.resolution, "resolution");
  setIfPossible(info.qualityField, body.quality, "quality");
  setIfPossible(info.seedField, body.seed, "seed");
  setIfPossible(info.batchField, body.batch, "batch size");

  const refs = (body.referenceImages ?? [])
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => (r.startsWith("/") ? `${appUrl()}${r}` : r));

  if (refs.length) {
    const f = field(info.referenceImageField);
    if (!f) {
      warnings.push(
        "This tool does not accept reference images, so they were skipped."
      );
    } else {
      const local = refs.filter((r) => /localhost|127\.0\.0\.1/i.test(r));
      if (local.length) {
        warnings.push(
          "Reference images must be on a publicly reachable URL. Higgsfield's servers cannot fetch localhost, so deploy the app or paste a hosted image URL."
        );
      }
      args[f.name] = info.referenceIsArray ? refs : refs[0];
    }
  }

  for (const [key, value] of Object.entries(body.advanced ?? {})) {
    const f = field(key);
    if (!f) continue;
    const coerced = coerceValue(f, value);
    if (coerced !== undefined) args[f.name] = coerced;
  }

  // Fill any remaining required field from its schema default so the server
  // doesn't reject the call on a technicality.
  for (const f of info.fields) {
    if (!f.required || f.name in args) continue;
    if (f.default !== undefined) {
      args[f.name] = f.default;
    } else if (f.enumValues?.length) {
      args[f.name] = f.enumValues[0];
      warnings.push(
        `Required field "${f.name}" had no value, so "${f.enumValues[0]}" was used.`
      );
    } else {
      warnings.push(
        `Required field "${f.name}" was left empty — the server may reject this call. Set it in the Advanced panel.`
      );
    }
  }

  return { args, prompt, warnings };
}

async function persistImages(
  parsed: ParsedResult,
  label: string
): Promise<string[]> {
  const local: string[] = [];
  for (const url of parsed.images) {
    const saved = await mirrorRemoteImage(url, label);
    if (saved) local.push(saved);
  }
  for (const img of parsed.base64Images) {
    const saved = await saveBase64Image(img.data, img.mimeType, label);
    if (saved) local.push(saved);
  }
  return local;
}

const POLL_DELAYS_MS = [
  3000, 3000, 4000, 5000, 6000, 8000, 8000, 10_000, 10_000, 12_000, 15_000,
  15_000, 20_000, 20_000, 25_000, 30_000,
];

/**
 * Higgsfield may answer synchronously with finished images, or hand back a job
 * id. We poll the status tool with a backing-off delay until images appear or we
 * run out of budget, then hand the job id to the client to keep polling.
 */
export async function pollForResult(
  statusToolName: string,
  jobId: string,
  budgetMs: number
): Promise<{ parsed: ParsedResult; raw: RawToolResult } | null> {
  const deadline = Date.now() + budgetMs;
  // Resolve the real argument name once, from the status tool's own schema.
  // Sending every alias at once would trip strict additionalProperties checks.
  const args = await statusArgsFor(statusToolName, jobId);
  for (const delay of POLL_DELAYS_MS) {
    if (Date.now() + delay > deadline) break;
    await new Promise((r) => setTimeout(r, delay));
    try {
      const raw = await callTool(statusToolName, args);
      const parsed = parseToolResult(raw);
      if (!isPending(parsed)) return { parsed, raw };
    } catch (err) {
      if (err instanceof NotConnectedError) throw err;
      // A transient status-tool failure shouldn't kill the generation.
    }
  }
  return null;
}

/** Argument names a status tool might use for the job identifier. */
const STATUS_ID_ALIASES = [
  "id",
  "job_id",
  "jobId",
  "generation_id",
  "generationId",
  "request_id",
  "requestId",
  "task_id",
  "taskId",
];

/**
 * Builds status-tool arguments using only the keys that tool actually declares.
 * Required fields win over optional ones, and we fall back to any `*id*` field
 * so a renamed parameter still resolves.
 */
export async function statusArgsFor(
  statusToolName: string,
  jobId: string
): Promise<Record<string, unknown>> {
  const { allTools } = await getImageTool();
  const tool = allTools.find((t) => t.name === statusToolName);
  const schema = tool?.inputSchema;
  const props = Object.keys(schema?.properties ?? {});
  if (!props.length) return { id: jobId };

  const required = new Set(schema?.required ?? []);
  const match =
    props.find((p) => required.has(p) && STATUS_ID_ALIASES.includes(p)) ??
    props.find((p) => STATUS_ID_ALIASES.includes(p)) ??
    props.find((p) => required.has(p) && /id$/i.test(p)) ??
    props.find((p) => /id$/i.test(p));

  return match ? { [match]: jobId } : { id: jobId };
}

export async function runGeneration(
  body: GenerateRequest,
  serverBudgetMs = 210_000
): Promise<GalleryItem & { warnings: string[]; rawText?: string }> {
  const { info, statusToolName } = await getImageTool();
  const { args, prompt, warnings } = buildArgs(info, body);

  const id = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const started = Date.now();

  const raw = await callTool(info.tool.name, args);
  let parsed = parseToolResult(raw);
  let rawResult: RawToolResult = raw;

  if (raw.isError) {
    const item: GalleryItem = {
      id,
      createdAt: started,
      prompt,
      model: String(body.model ?? info.nanoBananaProValue ?? "unknown"),
      params: args,
      images: [],
      localImages: [],
      status: "error",
      error: parsed.text || "The MCP server returned an error.",
      raw,
    };
    await saveGalleryItem(item);
    return { ...item, warnings, rawText: parsed.text };
  }

  if (isPending(parsed) && parsed.jobId && statusToolName) {
    const budget = Math.max(0, serverBudgetMs - (Date.now() - started));
    const polled = await pollForResult(statusToolName, parsed.jobId, budget);
    if (polled) {
      parsed = polled.parsed;
      rawResult = polled.raw;
    }
  }

  const localImages = await persistImages(parsed, id);
  const stillPending = isPending(parsed) && !localImages.length;

  const item: GalleryItem = {
    id,
    createdAt: started,
    prompt,
    model: String(body.model ?? info.nanoBananaProValue ?? "unknown"),
    params: args,
    images: parsed.images,
    localImages,
    status: stillPending ? "pending" : localImages.length || parsed.images.length ? "done" : "error",
    jobId: parsed.jobId,
    error:
      !stillPending && !localImages.length && !parsed.images.length
        ? parsed.text ||
          "The call succeeded but no image URL was found in the response. Check the Inspector tab for the raw payload."
        : undefined,
    raw: rawResult,
  };

  await saveGalleryItem(item);
  return { ...item, warnings, rawText: parsed.text };
}

export async function saveGalleryItem(item: GalleryItem): Promise<void> {
  await updateStore((s) => {
    s.gallery = [item, ...(s.gallery ?? []).filter((g) => g.id !== item.id)].slice(
      0,
      200
    );
  });
}
