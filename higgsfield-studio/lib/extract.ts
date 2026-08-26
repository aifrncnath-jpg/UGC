import type { RawToolResult } from "./mcp";

/**
 * Higgsfield's MCP tool responses are not a schema we control, and they have
 * changed shape before (sometimes a JSON blob in a text block, sometimes
 * structuredContent, sometimes just a markdown link). Rather than hardcode one
 * shape and break on the next deploy, we walk the whole response and pull out
 * anything that looks like an image, a job id, or a status.
 */

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)(\?|#|$)/i;
const URL_RE = /https?:\/\/[^\s"'<>)\]}]+/g;

const IMAGE_KEY_HINTS = [
  "image",
  "url",
  "uri", // MCP resource_link blocks carry the asset under `uri`
  "result",
  "output",
  "asset",
  "media",
  "file",
  "src",
  "link",
];

/**
 * Keys and URL fragments that mark a SMALLER copy of another image.
 *
 * These used to sit in IMAGE_KEY_HINTS as positive signals, which meant a
 * thumbnail of the first image could outrank the second image entirely — so a
 * request for two variants came back as one picture plus its own preview.
 */
const THUMBNAIL_HINTS = [
  "thumb",
  "thumbnail",
  "preview",
  "small",
  "icon",
  "poster",
];

const JOB_KEY_HINTS = [
  "jobid",
  "job_id",
  "id",
  "generationid",
  "generation_id",
  "requestid",
  "request_id",
  "taskid",
  "task_id",
];

const STATUS_KEY_HINTS = ["status", "state", "phase"];

/**
 * Keys that genuinely carry a raw base64 image, matched exactly.
 *
 * `blob` matters: MCP embedded-resource blocks are
 * `{ type: "resource", resource: { blob, mimeType, uri } }`, so leaving it out
 * meant any image returned as a resource was invisible to this app.
 */
const BASE64_KEYS = [
  "data",
  "blob",
  "bjson",
  "bformat",
  "base",
  "image",
  "imagebase",
];

/** URLs that are plainly not the generated asset. */
const NOT_AN_ASSET =
  /(^https?:\/\/(www\.)?(higgsfield\.ai|github\.com|docs\.|help\.|support\.)|\/(docs|help|pricing|terms|privacy|login|signup|status|health)(\/|$|\?))/i;

/**
 * How likely a URL is to be the generated image.
 *
 * Deliberately a RANKING, not a filter. An earlier version gated on a hardcoded
 * list of CDN domains, so when Higgsfield served the result from a host that
 * wasn't on the list the image was silently discarded — the generation succeeded
 * on their side while this app showed nothing and polled forever. Guessing an
 * asset host is unwinnable, so every plausible URL is now kept as a candidate and
 * the real test happens on download: if the response is `image/*`, it's an image.
 */
function imageUrlScore(value: string, key: string): number {
  if (!/^https?:\/\//i.test(value)) return -1;
  if (NOT_AN_ASSET.test(value)) return -1;

  const lowerKey = key.toLowerCase();
  let score = 0;
  if (IMAGE_EXT.test(value)) score += 100;
  if (/(cdn|media|asset|storage|bucket|output|generation|result)/i.test(value)) {
    score += 25;
  }
  if (IMAGE_KEY_HINTS.some((h) => lowerKey.includes(h))) score += 20;
  if (/\.(mp4|webm|mov|mp3|wav|json|txt|pdf|zip)(\?|#|$)/i.test(value)) {
    score -= 200;
  }
  // A thumbnail is still a real image, so keep it as a fallback — just never
  // ahead of a full-size asset.
  if (
    THUMBNAIL_HINTS.some((h) => lowerKey.includes(h)) ||
    THUMBNAIL_HINTS.some((h) => value.toLowerCase().includes(h))
  ) {
    score -= 60;
  }
  return score;
}

/**
 * Identity of the underlying asset, ignoring how it was encoded or sized.
 *
 * Higgsfield can return one image in more than one format, and byte-level
 * deduping cannot catch that — a WebP and a PNG of the same picture have
 * different bytes. Grouping by this key collapses them, which is what turned a
 * request for two variants into "one image with two extensions".
 *
 * Kept deliberately conservative: only the file extension and known
 * format/size query parameters are stripped. Everything else, including any
 * other query string, stays in the key, so two genuinely different variants that
 * differ only by `?variant=2` are never merged.
 */
function assetIdentity(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const path = u.pathname.replace(IMAGE_EXT, "");
    const stem = path.replace(
      /[-_](thumb|thumbnail|preview|small|icon|\d{2,4}x\d{2,4}|\d{2,4}w)$/i,
      ""
    );
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !/^(format|fm|ext|w|h|width|height|size|q|quality|dpr)$/i.test(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${u.host}${stem}${params ? `?${params}` : ""}`;
  } catch {
    return rawUrl;
  }
}

interface Walked {
  /** url -> best score seen, so the same link found twice keeps its best rank. */
  scoredUrls: Map<string, number>;
  jobIds: string[];
  statuses: string[];
  base64Images: { mimeType: string; data: string }[];
}

function walk(node: unknown, key: string, out: Walked, depth = 0): void {
  if (depth > 12 || node == null) return;
  const normKey = key.toLowerCase().replace(/[^a-z_]/g, "");

  if (typeof node === "string") {
    const trimmed = node.trim();

    // A tool may hand back a JSON document as a plain string.
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        walk(JSON.parse(trimmed), key, out, depth + 1);
        return;
      } catch {
        /* not JSON, fall through to text handling */
      }
    }

    for (const match of trimmed.match(URL_RE) ?? []) {
      const url = match.replace(/[.,;:]+$/, "");
      const score = imageUrlScore(url, key);
      if (score < 0) continue;
      const previous = out.scoredUrls.get(url);
      if (previous === undefined || score > previous) {
        out.scoredUrls.set(url, score);
      }
    }

    if (STATUS_KEY_HINTS.some((h) => normKey.includes(h)) && trimmed.length < 60) {
      out.statuses.push(trimmed);
    }
    if (
      JOB_KEY_HINTS.includes(normKey) &&
      /^[A-Za-z0-9_-]{6,}$/.test(trimmed) &&
      !/^https?:/.test(trimmed)
    ) {
      out.jobIds.push(trimmed);
    }
    // Bare base64 payload under an explicitly named key.
    //
    // Kept narrow on purpose. A loose `key.includes("base")` match also fired on
    // the `data` field of an MCP image block that had ALREADY been captured by
    // the object branch below, which saved the same image twice under two
    // different mime types and made one result look like two.
    if (
      BASE64_KEYS.includes(normKey) &&
      trimmed.length > 512 &&
      /^[A-Za-z0-9+/=\s]+$/.test(trimmed.slice(0, 256))
    ) {
      out.base64Images.push({ mimeType: "image/png", data: trimmed });
    }
    return;
  }

  if (typeof node === "number" || typeof node === "boolean") return;

  if (Array.isArray(node)) {
    for (const item of node) walk(item, key, out, depth + 1);
    return;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const consumed = new Set<string>();

    // MCP image content block: { type: "image", data, mimeType }
    if (
      obj.type === "image" &&
      typeof obj.data === "string" &&
      obj.data.length > 100
    ) {
      out.base64Images.push({
        mimeType: typeof obj.mimeType === "string" ? obj.mimeType : "image/png",
        data: obj.data,
      });
      // Claim `data` so the string branch cannot capture the very same payload a
      // second time under a default mime type.
      consumed.add("data");
    }

    /**
     * MCP embedded resource: { type: "resource", resource: { blob, mimeType, uri } }
     *
     * A generic walk reaches `blob` eventually, but only if `blob` is a
     * recognised base64 key — it wasn't — so images returned this way were
     * invisible. Handling the block directly also lets the declared mimeType be
     * used instead of defaulting to PNG.
     */
    const resource = obj.resource;
    if (
      (obj.type === "resource" || obj.type === "resource_link") &&
      resource &&
      typeof resource === "object"
    ) {
      const r = resource as Record<string, unknown>;
      const mime = typeof r.mimeType === "string" ? r.mimeType : "image/png";
      if (typeof r.blob === "string" && r.blob.length > 100) {
        out.base64Images.push({ mimeType: mime, data: r.blob });
        consumed.add("resource");
      }
    }

    for (const [k, v] of Object.entries(obj)) {
      if (consumed.has(k)) continue;
      walk(v, k, out, depth + 1);
    }
  }
}

export interface ParsedResult {
  /**
   * Every plausible asset URL, best-ranked first. These are CANDIDATES: the
   * caller confirms which are really images by checking the content type when it
   * downloads them.
   */
  images: string[];
  base64Images: { mimeType: string; data: string }[];
  jobId?: string;
  status?: string;
  text: string;
}

export function parseToolResult(result: RawToolResult): ParsedResult {
  const out: Walked = {
    scoredUrls: new Map(),
    jobIds: [],
    statuses: [],
    base64Images: [],
  };

  walk(result.structuredContent, "structuredContent", out);
  walk(result.content, "content", out);

  const text = (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n\n");

  // Best-ranked first, so an obvious .png beats a bare CDN link, but nothing is
  // thrown away just because its host is unfamiliar.
  const ranked = [...out.scoredUrls.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([url]) => url);

  // Collapse re-encodings of one asset, keeping the best-ranked form of each.
  // Distinct assets keep distinct identities, so two real variants both survive.
  const bestPerAsset = new Map<string, string>();
  for (const url of ranked) {
    const identity = assetIdentity(url);
    if (!bestPerAsset.has(identity)) bestPerAsset.set(identity, url);
  }
  const images = [...bestPerAsset.values()];

  // The same payload can legitimately be reached by more than one path through
  // the response, so collapse identical base64 blocks.
  const seenData = new Set<string>();
  const base64Images = out.base64Images.filter((img) => {
    const key = img.data.replace(/\s+/g, "");
    if (seenData.has(key)) return false;
    seenData.add(key);
    return true;
  });

  return {
    images,
    base64Images,
    jobId: out.jobIds[0],
    status: normalizeStatus(out.statuses),
    text,
  };
}

function normalizeStatus(statuses: string[]): string | undefined {
  if (!statuses.length) return undefined;
  const lower = statuses.map((s) => s.toLowerCase());
  const done = ["completed", "complete", "succeeded", "success", "done", "ready"];
  const failed = ["failed", "error", "cancelled", "canceled", "rejected"];
  if (lower.some((s) => failed.some((f) => s.includes(f)))) return "error";
  if (lower.some((s) => done.some((d) => s.includes(d)))) return "done";
  return "pending";
}

/**
 * Detects the `unlim_choice` reply.
 *
 * Per the schema, when `use_unlim` is omitted the server submits nothing and
 * returns this question instead. That is indistinguishable from a generation that
 * started and stalled unless it is recognised explicitly.
 */
export function unlimChoice(result: RawToolResult): string | undefined {
  const text = JSON.stringify(result ?? {});
  if (!/unlim_choice/i.test(text)) return undefined;

  const parsed = parseToolResult(result);
  return (
    parsed.text ||
    "Higgsfield asked which balance should pay for this generation, and submitted nothing. Set the Unlimited toggle explicitly and generate again."
  );
}

/**
 * True when a result clearly represents an unfinished async generation.
 *
 * Note this is only consulted AFTER download has been attempted. A response can
 * carry both a job id and a finished asset URL, and treating it as pending
 * because a job id exists is how a completed generation ends up spinning
 * forever.
 */
export function isPending(parsed: ParsedResult): boolean {
  if (parsed.base64Images.length) return false;
  if (parsed.status === "done") return false;
  return Boolean(parsed.jobId) || parsed.status === "pending";
}
