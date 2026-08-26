import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./config";

/**
 * Dead-simple JSON file store. This app is single-tenant by design: it holds
 * YOUR Higgsfield session, so there is no user table and no database.
 *
 * Everything lives in .data/store.json, which is gitignored. Treat that file
 * like a password: it contains a live OAuth access token for your account.
 */

export interface StoredClientInfo {
  client_id: string;
  client_secret?: string;
  redirect_uris?: string[];
  [key: string]: unknown;
}

export interface StoredTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  /** Epoch ms when we saved these, used to estimate expiry for the UI. */
  obtained_at?: number;
  [key: string]: unknown;
}

export interface GalleryItem {
  id: string;
  createdAt: number;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  /** Remote image URLs returned by Higgsfield. */
  images: string[];
  /** Local mirrored copies under /api/asset/<file>, so links never rot. */
  localImages: string[];
  status: "pending" | "done" | "error";
  jobId?: string;
  error?: string;
  /** Raw MCP tool result, kept for debugging. */
  raw?: unknown;
}

export interface Shape {
  clientInfo?: StoredClientInfo;
  /** Keyed so a changed APP_URL forces re-registration. */
  clientRedirectUri?: string;
  tokens?: StoredTokens;
  codeVerifier?: string;
  oauthState?: string;
  discoveryState?: unknown;
  toolCache?: { fetchedAt: number; tools: unknown[] };
  gallery?: GalleryItem[];
  customPresets?: { id: string; name: string; text: string }[];
}

const FILE = path.join(DATA_DIR, "store.json");

let cache: Shape | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function readFile(): Promise<Shape> {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    return JSON.parse(txt) as Shape;
  } catch {
    return {};
  }
}

export async function getStore(): Promise<Shape> {
  if (!cache) cache = await readFile();
  return cache;
}

/**
 * Mutate + persist. Writes are serialized through a promise chain so two
 * concurrent route handlers can't clobber each other's changes.
 */
export async function updateStore(
  fn: (s: Shape) => void | Promise<void>
): Promise<Shape> {
  const run = async () => {
    const s = await getStore();
    await fn(s);
    cache = s;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(s, null, 2), "utf8");
  };
  writeChain = writeChain.then(run, run);
  await writeChain;
  return cache!;
}

export async function resetAuth(): Promise<void> {
  await updateStore((s) => {
    delete s.tokens;
    delete s.codeVerifier;
    delete s.oauthState;
    delete s.discoveryState;
    delete s.toolCache;
  });
}
