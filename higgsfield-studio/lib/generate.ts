import crypto from "node:crypto";
import { callTool, NotConnectedError, type RawToolResult } from "./mcp";
import { coerceValue, getImageTool, type ImageToolInfo } from "./tools";
import { isPending, parseToolResult, type ParsedResult } from "./extract";
import { mirrorRemoteImage, saveBase64Image } from "./assets";
import { updateStore, type GalleryItem } from "./store";
import { findModelSpec } from "./models";

/** Hard ceiling on images per generation. Each one costs credits. */
export const MAX_COUNT = 3;

export interface GenerateRequest {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  /** 1 to MAX_COUNT. */
  count?: number;
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
 * burn credits rendering a square when 9:16 was asked for.
 */
function validateAgainstModel(body: GenerateRequest): void {
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

  // For a known model, an absent list means the parameter does not exist on that
  // model at all — not that anything goes. Nano Banana Pro has no quality dial,
  // so sending one is an error rather than a value to range-check.
  if (body.resolution) {
    if (!spec.resolutions?.length) {
      throw new InvalidComboError(
        `${spec.label} has no resolution parameter, so "${body.resolution}" cannot be sent.`
      );
    }
    if (!spec.resolutions.includes(body.resolution)) {
      throw new InvalidComboError(
        `${spec.label} does not support ${body.resolution}. It accepts: ${spec.resolutions.join(", ")}.`
      );
    }
  }

  if (body.quality) {
    if (!spec.qualities?.length) {
      throw new InvalidComboError(
        `${spec.label} has no quality parameter, so "${body.quality}" cannot be sent.`
      );
    }
    if (!spec.qualities.includes(body.quality)) {
      throw new InvalidComboError(
        `${spec.label} does not support "${body.quality}" quality. It accepts: ${spec.qualities.join(", ")}.`
      );
    }
  }
}

/**
 * Turns the browser form into a validated MCP tool-argument object.
 *
 * Every value is routed through the field name and type that the server's own
 * JSON Schema declares. Anything the schema doesn't declare is dropped rather
 * than sent, because MCP servers reject unexpected properties.
 */
export function buildArgs(
  info: ImageToolInfo,
  body: GenerateRequest,
  /** Written to the batch field when the tool has one. */
  batchCount?: number
): { args: Record<string, unknown>; warnings: string[] } {
  validateAgainstModel(body);

  const warnings: string[] = [];
  const args: Record<string, unknown> = {};
  const field = (name?: string) => info.fields.find((f) => f.name === name);

  if (info.promptField) {
    args[info.promptField] = body.prompt;
  } else {
    // Say what we actually saw. A bare "no prompt field" is useless for
    // diagnosis, and this is the one error that blocks the whole app.
    const seen = info.fields.length
      ? info.fields
          .map((f) => `${f.name} (${f.kind}${f.required ? ", required" : ""})`)
          .join(", ")
      : "none — the schema declared no properties at all";
    throw new Error(
      `Could not identify the prompt argument for "${info.tool.name}". ` +
        `Fields found: ${seen}. ` +
        `Open the Inspector tab, copy the raw input schema, and send it over so the field matcher can be corrected.`
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
    if (
      f.enumValues?.length &&
      typeof value === "string" &&
      !f.enumValues.includes(value)
    ) {
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

  if (batchCount && batchCount > 1 && info.batchField) {
    const f = field(info.batchField)!;
    const max = typeof f.schema.maximum === "number" ? f.schema.maximum : MAX_COUNT;
    args[f.name] = Math.min(batchCount, max);
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

  // If the server nests everything under a single object argument, put it back.
  if (info.wrapperKey) {
    return { args: { [info.wrapperKey]: args }, warnings };
  }

  return { args, warnings };
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

/** One tool call plus its polling, resolved to images. */
async function runOne(
  info: ImageToolInfo,
  args: Record<string, unknown>,
  statusToolName: string | undefined,
  label: string,
  budgetMs: number
): Promise<{
  images: string[];
  localImages: string[];
  jobId?: string;
  pending: boolean;
  error?: string;
  raw: RawToolResult;
}> {
  const started = Date.now();
  const raw = await callTool(info.tool.name, args);
  let parsed = parseToolResult(raw);
  let rawResult: RawToolResult = raw;

  if (raw.isError) {
    return {
      images: [],
      localImages: [],
      pending: false,
      error: parsed.text || "The MCP server returned an error.",
      raw,
    };
  }

  if (isPending(parsed) && parsed.jobId && statusToolName) {
    const remaining = Math.max(0, budgetMs - (Date.now() - started));
    const polled = await pollForResult(statusToolName, parsed.jobId, remaining);
    if (polled) {
      parsed = polled.parsed;
      rawResult = polled.raw;
    }
  }

  const localImages = await persistImages(parsed, label);
  return {
    images: parsed.images,
    localImages,
    jobId: parsed.jobId,
    pending: isPending(parsed) && !localImages.length,
    error:
      !localImages.length && !parsed.images.length && !isPending(parsed)
        ? parsed.text || undefined
        : undefined,
    raw: rawResult,
  };
}

export async function runGeneration(
  body: GenerateRequest,
  serverBudgetMs = 210_000
): Promise<GalleryItem & { warnings: string[] }> {
  const { info, statusToolName } = await getImageTool();

  const count = Math.min(Math.max(1, Math.trunc(body.count ?? 1)), MAX_COUNT);
  const id = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const started = Date.now();

  // Prefer the server's own batch parameter. Only a few Higgsfield image models
  // expose one, so when it's missing we fan out to concurrent calls instead —
  // otherwise asking for 3 images would silently return 1.
  const useNativeBatch = count > 1 && Boolean(info.batchField);
  const calls = useNativeBatch ? 1 : count;

  const { args, warnings } = buildArgs(
    info,
    body,
    useNativeBatch ? count : undefined
  );

  if (count > 1 && !useNativeBatch) {
    warnings.push(
      `This model has no batch parameter, so ${count} separate generations were run. That costs ${count}x the credits of one image.`
    );
  }

  const results = await Promise.allSettled(
    Array.from({ length: calls }, () =>
      runOne(info, args, statusToolName, id, serverBudgetMs)
    )
  );

  const images: string[] = [];
  const localImages: string[] = [];
  const errors: string[] = [];
  let jobId: string | undefined;
  let anyPending = false;
  let lastRaw: unknown;

  for (const r of results) {
    if (r.status === "rejected") {
      errors.push(
        r.reason instanceof Error ? r.reason.message : String(r.reason)
      );
      continue;
    }
    images.push(...r.value.images);
    localImages.push(...r.value.localImages);
    if (r.value.error) errors.push(r.value.error);
    if (r.value.pending) anyPending = true;
    jobId ??= r.value.jobId;
    lastRaw = r.value.raw;
  }

  // A partial success is still a success: keep whatever rendered and report the
  // rest, rather than throwing away images the user already paid for.
  const gotImages = localImages.length > 0 || images.length > 0;
  if (errors.length && gotImages) {
    warnings.push(
      `${errors.length} of ${calls} generation${calls === 1 ? "" : "s"} failed: ${[...new Set(errors)].join(" | ")}`
    );
  }

  const item: GalleryItem = {
    id,
    createdAt: started,
    prompt: body.prompt,
    model: String(body.model ?? "unknown"),
    params: args,
    images: [...new Set(images)],
    localImages,
    status: gotImages ? "done" : anyPending ? "pending" : "error",
    jobId,
    error: gotImages
      ? undefined
      : errors.length
        ? [...new Set(errors)].join(" | ")
        : anyPending
          ? undefined
          : "The call succeeded but no image URL was found in the response. Check the Inspector tab for the raw payload.",
    raw: lastRaw,
  };

  await saveGalleryItem(item);
  return { ...item, warnings };
}

export async function saveGalleryItem(item: GalleryItem): Promise<void> {
  await updateStore((s) => {
    s.gallery = [item, ...(s.gallery ?? []).filter((g) => g.id !== item.id)].slice(
      0,
      200
    );
  });
}
