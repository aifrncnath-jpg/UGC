import crypto from "node:crypto";
import { callTool, NotConnectedError, type RawToolResult } from "./mcp";
import { coerceValue, getImageTool, type ImageToolInfo } from "./tools";
import {
  isPending,
  parseToolResult,
  unlimChoice,
  type ParsedResult,
} from "./extract";
import { ImageDedupe, mirrorRemoteImage, saveBase64Image } from "./assets";
import { updateStore, type GalleryItem } from "./store";
import { findModelSpec } from "./models";
import { appUrl } from "./config";
import { resolveMedia } from "./media";

/**
 * Ceiling on images per generation.
 *
 * The real schema declares `count` with `minimum: 1, maximum: 4`, and it is a
 * native parameter, so there is no need to fan out to concurrent calls. Note the
 * schema also states that `use_unlim: true` caps count to 1.
 */
export const MAX_COUNT = 4;

export interface GenerateRequest {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  /** 1 to MAX_COUNT. */
  count?: number;
  /** Public image URLs, or media UUIDs. Registered before use, never sent raw. */
  referenceImages?: string[];
  /** Role for each reference, when the model requires one. */
  referenceRole?: string;
  /**
   * Which balance pays. `true` uses the free allowance and caps count to 1,
   * `false` spends credits. Omitting it makes the server ask instead of
   * generating, so this app always sends an explicit value.
   */
  useUnlim?: boolean;
  /** Preflight the credit cost without submitting a job. */
  getCost?: boolean;
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

  const refCount = (body.referenceImages ?? []).filter((r) => r.trim()).length;
  if (refCount > spec.maxReferences) {
    throw new InvalidComboError(
      spec.maxReferences === 0
        ? `${spec.id} does not accept reference images.`
        : `${spec.id} accepts at most ${spec.maxReferences} reference image${spec.maxReferences === 1 ? "" : "s"}, but ${refCount} were provided.`
    );
  }
}

/**
 * Turns the browser form into a validated MCP tool-argument object.
 *
 * Every value is routed through the field name and type that the server's own
 * JSON Schema declares. Anything the schema doesn't declare is dropped rather
 * than sent, because MCP servers reject unexpected properties.
 */
export async function buildArgs(
  info: ImageToolInfo,
  body: GenerateRequest,
  /** Written to the batch field when the tool has one. */
  batchCount?: number
): Promise<{ args: Record<string, unknown>; warnings: string[] }> {
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

  /**
   * Resolution and quality are real Higgsfield parameters but are not declared
   * in the tool schema — they vary per model. Since the schema accepts extra
   * properties, pass them through under their documented names rather than
   * dropping a setting the model genuinely supports.
   */
  const passThrough = (
    declared: string | undefined,
    name: string,
    value: string | undefined,
    label: string
  ) => {
    if (!value) return;
    if (declared) {
      setIfPossible(declared, value, label);
    } else if (info.allowsExtraProperties) {
      args[name] = value;
    } else {
      warnings.push(`The tool has no ${label} field, so that value was skipped.`);
    }
  };

  passThrough(info.resolutionField, "resolution", body.resolution, "resolution");
  passThrough(info.qualityField, "quality", body.quality, "quality");

  const refs = (body.referenceImages ?? [])
    .map((r) => r.trim())
    .filter(Boolean)
    // Relative paths come from our own /api/upload, so make them absolute before
    // handing them to the media importer.
    .map((r) => (r.startsWith("/") ? `${appUrl()}${r}` : r));

  if (refs.length) {
    const f = field(info.referenceImageField);
    if (!f) {
      warnings.push(
        "This tool does not accept reference images, so they were skipped."
      );
    } else if (info.referenceIsObjectArray) {
      /**
       * The schema is explicit: medias[].value takes a UUID from the media
       * import/upload tools, and "Do not pass https:// URLs here". Because
       * additionalProperties is open, a URL would be accepted and then silently
       * ignored — which is precisely why references seemed to upload fine but had
       * no effect on the output. So register each reference first, then send ids.
       */
      const { medias, warnings: mediaWarnings } = await resolveMedia(refs);
      warnings.push(...mediaWarnings);

      if (medias.length) {
        const valueKey = info.referenceValueKey ?? "value";
        const roleKey = info.referenceRoleKey;
        const role = body.referenceRole?.trim() || "image";
        args[f.name] = medias.map((m) => ({
          [valueKey]: m.value,
          ...(roleKey ? { [roleKey]: role } : {}),
        }));
      }
    } else {
      args[f.name] = info.referenceIsArray ? refs : refs[0];
      if (!info.referenceIsArray && refs.length > 1) {
        warnings.push(
          `This tool takes a single reference image, so only the first of ${refs.length} was sent.`
        );
      }
    }
  }

  /**
   * Always send an explicit balance choice.
   *
   * Per the schema, omitting `use_unlim` makes the server submit NOTHING and
   * return an `unlim_choice` question instead. That looks identical to a
   * generation that started and never finished, so the choice is never left open.
   */
  if (info.unlimField) {
    args[info.unlimField] = body.useUnlim === true;
  }

  if (info.costField && body.getCost) {
    args[info.costField] = true;
  }

  if (batchCount && batchCount > 1 && info.batchField) {
    const f = field(info.batchField)!;
    const max = typeof f.schema.maximum === "number" ? f.schema.maximum : MAX_COUNT;
    const wanted = Math.min(batchCount, max);
    // use_unlim caps count to 1 server-side; say so rather than let it surprise.
    if (body.useUnlim === true && wanted > 1) {
      args[f.name] = 1;
      warnings.push(
        `Unlimited mode always generates a single image, so ${wanted} was capped to 1.`
      );
    } else {
      args[f.name] = wanted;
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

  // If the server nests everything under a single object argument, put it back.
  if (info.wrapperKey) {
    return { args: { [info.wrapperKey]: args }, warnings };
  }

  return { args, warnings };
}

/**
 * Writes every image in a result to disk, skipping any whose bytes we've already
 * kept for this generation.
 *
 * URLs are handled before base64 so that when a response carries both
 * representations of one image, the copy we keep is the one with a trustworthy
 * extension from the CDN's content type.
 */
/** Never download more than this many candidate URLs from one response. */
const MAX_CANDIDATE_DOWNLOADS = 10;

const PNG_URL = /\.png(\?|#|$)/i;

/**
 * Keeps only PNG sources when any PNG is available.
 *
 * Higgsfield commonly returns each generated image in more than one encoding —
 * a PNG plus a WebP of the same picture. Those have different bytes and often
 * different paths, so neither content hashing nor path grouping reliably catches
 * them, and the result was one image saved twice under two extensions instead of
 * the two distinct variants that were actually generated.
 *
 * PNG is the original, lossless form, so it is the one to keep. Other formats are
 * only used when the response contains no PNG at all, so a WebP-only model still
 * works rather than returning nothing.
 */
export function preferPng(
  urls: string[],
  base64: { mimeType: string; data: string }[]
): {
  urls: string[];
  base64: { mimeType: string; data: string }[];
  droppedNonPng: number;
} {
  const pngUrls = urls.filter((u) => PNG_URL.test(u));
  const pngBase64 = base64.filter((b) => /png/i.test(b.mimeType));
  const havePng = pngUrls.length > 0 || pngBase64.length > 0;

  if (!havePng) return { urls, base64, droppedNonPng: 0 };

  return {
    urls: pngUrls,
    base64: pngBase64,
    droppedNonPng:
      urls.length - pngUrls.length + (base64.length - pngBase64.length),
  };
}

/**
 * Turns candidate URLs into confirmed local images.
 *
 * `parsed.images` is a ranked list of plausible URLs, not a verified one, so each
 * is downloaded and kept only if it really is an image. Rejections are collected
 * and reported: when a generation succeeds on Higgsfield but nothing appears
 * here, the reason a URL was skipped is the single most useful thing to know.
 */
async function persistImages(
  parsed: ParsedResult,
  label: string,
  dedupe: ImageDedupe
): Promise<{ localImages: string[]; reasons: string[]; note?: string }> {
  const localImages: string[] = [];
  const reasons: string[] = [];

  // Take the PNG originals and ignore alternate encodings of the same picture.
  const picked = preferPng(parsed.images, parsed.base64Images);

  // base64 blocks first: they need no network and are unambiguous.
  for (const img of picked.base64) {
    const saved = await saveBase64Image(img.data, img.mimeType, label, dedupe);
    if (saved) localImages.push(saved);
  }

  for (const url of picked.urls.slice(0, MAX_CANDIDATE_DOWNLOADS)) {
    const outcome = await mirrorRemoteImage(url, label, dedupe);
    if (outcome.path) localImages.push(outcome.path);
    else if (outcome.reason) reasons.push(outcome.reason);
  }

  // If nothing usable came out of the PNG-only pass, fall back to the rest
  // rather than showing an empty result when an image really was returned.
  if (!localImages.length && picked.droppedNonPng > 0) {
    for (const img of parsed.base64Images) {
      const saved = await saveBase64Image(img.data, img.mimeType, label, dedupe);
      if (saved) localImages.push(saved);
    }
    for (const url of parsed.images.slice(0, MAX_CANDIDATE_DOWNLOADS)) {
      const outcome = await mirrorRemoteImage(url, label, dedupe);
      if (outcome.path) localImages.push(outcome.path);
      else if (outcome.reason) reasons.push(outcome.reason);
    }
  }

  return { localImages, reasons };
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
  budgetMs: number,
  label: string,
  dedupe: ImageDedupe
): Promise<{
  parsed: ParsedResult;
  raw: RawToolResult;
  localImages: string[];
  reasons: string[];
} | null> {
  const deadline = Date.now() + budgetMs;
  // Resolve the real argument name once, from the status tool's own schema.
  // Sending every alias at once would trip strict additionalProperties checks.
  const args = await statusArgsFor(statusToolName, jobId);
  const reasons: string[] = [];

  for (const delay of POLL_DELAYS_MS) {
    if (Date.now() + delay > deadline) break;
    await new Promise((r) => setTimeout(r, delay));
    try {
      const raw = await callTool(statusToolName, args);
      const parsed = parseToolResult(raw);

      // Attempt the download on every poll. Waiting for isPending() to flip
      // means a status payload that already contains the asset is ignored.
      const attempt = await persistImages(parsed, label, dedupe);
      if (attempt.localImages.length) {
        return { parsed, raw, localImages: attempt.localImages, reasons };
      }
      reasons.push(...attempt.reasons);

      if (!isPending(parsed)) {
        return { parsed, raw, localImages: [], reasons };
      }
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
  budgetMs: number,
  dedupe: ImageDedupe
): Promise<{
  images: string[];
  localImages: string[];
  jobId?: string;
  pending: boolean;
  error?: string;
  raw: RawToolResult;
  /** Why candidate URLs were rejected, for diagnostics. */
  reasons: string[];
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
      reasons: [],
    };
  }

  // The server can answer with a question instead of a job. Surface it as a
  // finished-with-error result, never as something still running.
  const question = unlimChoice(raw);
  if (question) {
    return {
      images: [],
      localImages: [],
      pending: false,
      error: question,
      raw,
      reasons: [],
    };
  }

  // Try to download whatever came back BEFORE concluding anything is pending. A
  // response often carries a job id alongside a finished asset URL, and treating
  // the job id as proof of incompleteness is how a done generation spins forever.
  let { localImages, reasons } = await persistImages(parsed, label, dedupe);

  if (!localImages.length && isPending(parsed) && parsed.jobId && statusToolName) {
    const remaining = Math.max(0, budgetMs - (Date.now() - started));
    const polled = await pollForResult(
      statusToolName,
      parsed.jobId,
      remaining,
      label,
      dedupe
    );
    if (polled) {
      parsed = polled.parsed;
      rawResult = polled.raw;
      localImages = polled.localImages;
      reasons = [...reasons, ...polled.reasons];
    }
  }

  const stillPending = !localImages.length && isPending(parsed);
  return {
    images: parsed.images,
    localImages,
    jobId: parsed.jobId,
    pending: stillPending,
    error:
      !localImages.length && !stillPending
        ? parsed.text || undefined
        : undefined,
    raw: rawResult,
    reasons,
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

  // Higgsfield declares a native `count` (1-4), so one call returns all variants.
  // The fan-out is only a fallback for a tool that has no batch parameter, where
  // asking for several images would otherwise quietly return one.
  const useNativeBatch = count > 1 && Boolean(info.batchField);
  const calls = useNativeBatch ? 1 : count;

  const { args, warnings } = await buildArgs(
    info,
    body,
    useNativeBatch ? count : undefined
  );

  if (count > 1 && !useNativeBatch) {
    warnings.push(
      `This model has no batch parameter, so ${count} separate generations were run. That costs ${count}x the credits of one image.`
    );
  }

  // One deduper shared across the whole fan-out, so an identical render coming
  // back from two calls is counted once rather than presented as two images.
  const dedupe = new ImageDedupe();

  const results = await Promise.allSettled(
    Array.from({ length: calls }, () =>
      runOne(info, args, statusToolName, id, serverBudgetMs, dedupe)
    )
  );

  const images: string[] = [];
  const localImages: string[] = [];
  const errors: string[] = [];
  const reasons: string[] = [];
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
    reasons.push(...r.value.reasons);
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

  /**
   * Always account for a shortfall.
   *
   * Asking for 2 and quietly showing 1 is how the duplicate bug hid for so long,
   * so the count is reconciled out loud: how many were requested, how many
   * distinct images were recovered, and how many copies were discarded.
   */
  const expected = body.useUnlim === true ? 1 : count;
  if (gotImages && localImages.length < expected) {
    const discarded = dedupe.skipped
      ? ` ${dedupe.skipped} duplicate cop${dedupe.skipped === 1 ? "y was" : "ies were"} discarded rather than shown as separate images.`
      : "";
    warnings.push(
      `Asked for ${expected} image${expected === 1 ? "" : "s"} but only ${localImages.length} distinct one${localImages.length === 1 ? "" : "s"} could be recovered from the response.${discarded} If more appeared on higgsfield.ai, open the raw response below and send it over.`
    );
  }

  const uniqueReasons = [...new Set(reasons)];
  if (!gotImages && uniqueReasons.length) {
    warnings.push(
      `Candidate URLs were found but none was a usable image: ${uniqueReasons.join(" | ")}`
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
          : "No image could be recovered from the response. The generation may still have succeeded on higgsfield.ai — open the raw response below and send it over so the parser can be corrected.",
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
