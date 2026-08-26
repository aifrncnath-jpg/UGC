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
  "result",
  "output",
  "asset",
  "media",
  "file",
  "thumb",
  "preview",
  "src",
  "link",
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

function looksLikeImageUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  if (IMAGE_EXT.test(value)) return true;
  // Higgsfield CDN links frequently omit extensions.
  return /(higgsfield|cloudfront|amazonaws|storage\.googleapis|cdn|r2\.dev|blob\.core)/i.test(
    value
  );
}

interface Walked {
  imageUrls: string[];
  allUrls: string[];
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
      out.allUrls.push(url);
      if (looksLikeImageUrl(url)) out.imageUrls.push(url);
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
    // Bare base64 payload under an obvious key.
    if (
      (normKey === "data" || normKey.includes("base")) &&
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
    }

    for (const [k, v] of Object.entries(obj)) {
      walk(v, k, out, depth + 1);
    }
  }
}

export interface ParsedResult {
  images: string[];
  base64Images: { mimeType: string; data: string }[];
  jobId?: string;
  status?: string;
  text: string;
  otherUrls: string[];
}

export function parseToolResult(result: RawToolResult): ParsedResult {
  const out: Walked = {
    imageUrls: [],
    allUrls: [],
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

  const images = dedupe(out.imageUrls);
  const otherUrls = dedupe(out.allUrls).filter((u) => !images.includes(u));

  return {
    images,
    base64Images: out.base64Images,
    jobId: out.jobIds[0],
    status: normalizeStatus(out.statuses),
    text,
    otherUrls,
  };
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
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

/** True when a result clearly represents an unfinished async generation. */
export function isPending(parsed: ParsedResult): boolean {
  if (parsed.images.length || parsed.base64Images.length) return false;
  if (parsed.status === "done") return false;
  return Boolean(parsed.jobId) || parsed.status === "pending";
}
