import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { OUTPUTS_DIR } from "./config";

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

export async function mirrorRemoteImage(
  url: string,
  jobLabel: string
): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 128) return null;
    const ext = safeExt(url, res.headers.get("content-type"));
    const name = `${jobLabel}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    await fs.writeFile(path.join(OUTPUTS_DIR, name), buf);
    return `/api/asset/${name}`;
  } catch {
    return null;
  }
}

export async function saveBase64Image(
  data: string,
  mimeType: string,
  jobLabel: string
): Promise<string | null> {
  try {
    const buf = Buffer.from(data.replace(/\s+/g, ""), "base64");
    if (buf.byteLength < 128) return null;
    const ext = EXT_BY_MIME[mimeType] ?? ".png";
    const name = `${jobLabel}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    await fs.writeFile(path.join(OUTPUTS_DIR, name), buf);
    return `/api/asset/${name}`;
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
  const file = path.join(OUTPUTS_DIR, name);
  // Belt and braces: even with the name pattern above, confirm the resolved path
  // stays inside the outputs directory before reading it.
  if (!path.resolve(file).startsWith(path.resolve(OUTPUTS_DIR))) return null;
  try {
    await fs.access(file);
  } catch {
    return null;
  }
  const ext = path.extname(file).toLowerCase();
  const mime =
    Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)?.[0] ??
    "application/octet-stream";
  return { file, mime };
}
