import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { OUTPUTS_DIR, UPLOADS_DIR } from "./config";

/**
 * Higgsfield CDN links are signed and eventually expire, so every generated
 * image is mirrored to disk the moment it comes back. The gallery then serves
 * the local copy and keeps the remote URL only as a fallback.
 */

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function safeExt(fromUrl: string, contentType?: string | null): string {
  if (contentType && EXT_BY_MIME[contentType.split(";")[0].trim()]) {
    return EXT_BY_MIME[contentType.split(";")[0].trim()];
  }
  const m = fromUrl.match(/\.(png|jpe?g|webp|gif|avif)(?:\?|#|$)/i);
  return m ? `.${m[1].toLowerCase().replace("jpeg", "jpg")}` : ".png";
}

/**
 * Tracks which image bytes have already been written for one generation.
 *
 * This is the last line of defence against duplicate results. The same image can
 * arrive by more than one route in a single response — a CDN URL *and* an inline
 * base64 block, say — and those are indistinguishable until the bytes are in
 * hand. Comparing content hashes is the only reliable way to tell that "two"
 * images are actually one, which otherwise shows up as a single render appearing
 * twice under two different file extensions.
 */
export class ImageDedupe {
  private readonly seen = new Set<string>();
  skipped = 0;

  /** Returns false when these exact bytes were already kept. */
  accept(buf: Buffer): boolean {
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    if (this.seen.has(hash)) {
      this.skipped += 1;
      return false;
    }
    this.seen.add(hash);
    return true;
  }

  get count(): number {
    return this.seen.size;
  }
}

async function writeImage(
  buf: Buffer,
  ext: string,
  jobLabel: string
): Promise<string> {
  const name = `${jobLabel}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUTS_DIR, name), buf);
  return `/api/asset/${name}`;
}

/** Magic-byte signatures, the ground truth when a server sends a vague type. */
function sniffImageExt(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return ".webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return ".gif";
  // AVIF / HEIF share an ISO-BMFF 'ftyp' box.
  if (buf.toString("ascii", 4, 8) === "ftyp") return ".avif";
  return null;
}

export interface MirrorOutcome {
  /** Local URL when the download really was an image. */
  path: string | null;
  /** Why it wasn't kept, for surfacing in the UI instead of failing silently. */
  reason?: string;
}

/**
 * Downloads a candidate URL and keeps it only if it is genuinely an image.
 *
 * This is where a candidate becomes a confirmed image. The content type is
 * checked first, and magic bytes are used as a fallback because some CDNs serve
 * images as `application/octet-stream` or `binary/octet-stream`. Deciding by
 * hostname instead of content is what previously caused finished generations to
 * be discarded.
 */
export async function mirrorRemoteImage(
  url: string,
  jobLabel: string,
  dedupe?: ImageDedupe
): Promise<MirrorOutcome> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return { path: null, reason: `HTTP ${res.status} fetching ${short(url)}` };
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.startsWith("text/") || contentType.includes("json")) {
      return { path: null, reason: `${short(url)} returned ${contentType}` };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 128) {
      return { path: null, reason: `${short(url)} was empty` };
    }

    const sniffed = sniffImageExt(buf);
    const declaredImage = contentType.startsWith("image/");
    if (!declaredImage && !sniffed) {
      return {
        path: null,
        reason: `${short(url)} is not an image (${contentType || "no content type"})`,
      };
    }

    if (dedupe && !dedupe.accept(buf)) return { path: null };

    const ext = sniffed ?? safeExt(url, contentType);
    return { path: await writeImage(buf, ext, jobLabel) };
  } catch (err) {
    return {
      path: null,
      reason: `${short(url)} could not be fetched: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function short(url: string): string {
  return url.length > 70 ? `${url.slice(0, 67)}…` : url;
}

export async function saveBase64Image(
  data: string,
  mimeType: string,
  jobLabel: string,
  dedupe?: ImageDedupe
): Promise<string | null> {
  try {
    const buf = Buffer.from(data.replace(/\s+/g, ""), "base64");
    if (buf.byteLength < 128) return null;
    if (dedupe && !dedupe.accept(buf)) return null;
    return writeImage(buf, EXT_BY_MIME[mimeType] ?? ".png", jobLabel);
  } catch {
    return null;
  }
}

const NAME_RE = /^[A-Za-z0-9._-]+$/;

/** Resolve a served asset name to a real path, refusing traversal attempts. */
export async function resolveAsset(
  name: string
): Promise<{ file: string; mime: string } | null> {
  if (!NAME_RE.test(name) || name.includes("..")) return null;
  for (const dir of [OUTPUTS_DIR, UPLOADS_DIR]) {
    const file = path.join(dir, name);
    // Belt and braces: even with the name pattern above, confirm the resolved
    // path stays inside the intended directory before reading it.
    if (!path.resolve(file).startsWith(path.resolve(dir))) continue;
    try {
      await fs.access(file);
    } catch {
      continue;
    }
    const ext = path.extname(file).toLowerCase();
    const mime =
      Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)?.[0] ??
      "application/octet-stream";
    return { file, mime };
  }
  return null;
}

export async function saveUpload(
  file: File
): Promise<{ name: string; url: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = safeExt(file.name, file.type);
  const name = `up-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), buf);
  return { name, url: `/api/asset/${name}` };
}
