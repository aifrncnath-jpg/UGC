import { callTool, listTools, type McpTool } from "./mcp";
import { parseToolResult } from "./extract";

/**
 * Reference media handling.
 *
 * The real `generate_image` schema is explicit about this and it is the opposite
 * of what this app used to do:
 *
 *   medias[].value — "UUID from media_upload/media_import_url or job_id from a
 *                     prior generation. Do not pass https:// URLs here."
 *
 * So references must be registered with Higgsfield FIRST, and only the resulting
 * UUID goes into the generate call. Passing a URL is not an error the server
 * rejects — `additionalProperties` is open, so a wrong shape is accepted and then
 * silently ignored, which is exactly why uploaded references appeared to work but
 * had no effect on the output.
 */

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export interface MediaTools {
  /** Registers a publicly reachable URL with Higgsfield. */
  importUrl?: McpTool;
  /** Uploads bytes directly, if the server supports it. */
  upload?: McpTool;
}

export async function findMediaTools(): Promise<MediaTools> {
  const { tools } = await listTools();
  return {
    importUrl: tools.find((t) => /media.*import|import.*url/i.test(t.name)),
    upload: tools.find(
      (t) => /media.*upload|upload.*media/i.test(t.name) && !/import/i.test(t.name)
    ),
  };
}

/** Pick the argument on a media tool that should receive the URL. */
function urlArgFor(tool: McpTool): string | undefined {
  const props = Object.keys(tool.inputSchema?.properties ?? {});
  // The generate tool nests everything under `params`, so these may too.
  if (props.length === 1 && props[0] === "params") return "params";
  return (
    props.find((p) => /^(url|source_url|image_url|src|uri|link)$/i.test(p)) ??
    props.find((p) => /url|uri|link/i.test(p)) ??
    props[0]
  );
}

/** A media tool may or may not nest its arguments the way generate_image does. */
function wrapArgs(
  tool: McpTool,
  inner: Record<string, unknown>
): Record<string, unknown> {
  const props = Object.keys(tool.inputSchema?.properties ?? {});
  return props.length === 1 && props[0] === "params" ? { params: inner } : inner;
}

export function extractMediaId(result: unknown): string | undefined {
  const asText = JSON.stringify(result ?? {});
  const uuid = asText.match(UUID_RE);
  if (uuid) return uuid[0];

  // Fall back to any id-ish field, since a job_id is also a legal medias value.
  const parsed = parseToolResult(result as never);
  if (parsed.jobId) return parsed.jobId;

  const idMatch = asText.match(
    /"(?:id|media_id|mediaId|upload_id|uploadId|job_id|jobId)"\s*:\s*"([^"]{6,})"/
  );
  return idMatch?.[1];
}

export interface ResolvedMedia {
  /** UUID or job id to place in medias[].value. */
  value: string;
  /** What the user gave us, for reporting. */
  source: string;
}

export interface MediaResolution {
  medias: ResolvedMedia[];
  warnings: string[];
}

/**
 * Turns whatever the user supplied into `medias[].value` identifiers.
 *
 * Accepts three kinds of input:
 *   - a bare UUID or job id, used as-is
 *   - an http(s) URL, registered via the media import tool
 *   - anything else, reported rather than silently dropped
 */
export async function resolveMedia(
  references: string[]
): Promise<MediaResolution> {
  const warnings: string[] = [];
  const medias: ResolvedMedia[] = [];
  const inputs = references.map((r) => r.trim()).filter(Boolean);
  if (!inputs.length) return { medias, warnings };

  /**
   * Classify everything first, and only reach for the media tools if something
   * actually needs importing. An input that is already a UUID, or a local address
   * that can never work, is resolved without a round trip.
   */
  const needsImport: string[] = [];
  for (const input of inputs) {
    if (UUID_RE.test(input) && !/^https?:\/\//i.test(input)) {
      medias.push({ value: input.match(UUID_RE)![0], source: input });
      continue;
    }
    if (!/^https?:\/\//i.test(input)) {
      warnings.push(
        `"${input}" is neither a URL nor a media UUID, so it was skipped.`
      );
      continue;
    }
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(input)) {
      warnings.push(
        `${input} is a local address. Higgsfield has to fetch reference images from its own servers, so this was skipped. Use a publicly hosted image URL.`
      );
      continue;
    }
    needsImport.push(input);
  }

  if (!needsImport.length) return { medias, warnings };

  let importUrl: McpTool | undefined;
  try {
    importUrl = (await findMediaTools()).importUrl;
  } catch (err) {
    warnings.push(
      `Could not look up the media import tool: ${err instanceof Error ? err.message : String(err)}`
    );
    return { medias, warnings };
  }

  for (const input of needsImport) {
    if (!importUrl) {
      warnings.push(
        "This server exposes no media import tool, so reference images cannot be registered. The reference was skipped rather than sent as a raw URL, which the server would accept and then ignore."
      );
      break;
    }

    try {
      const arg = urlArgFor(importUrl);
      const inner = arg === "params" ? { url: input } : { [arg ?? "url"]: input };
      const raw = await callTool(importUrl.name, wrapArgs(importUrl, inner));
      const value = extractMediaId(raw);
      if (value) {
        medias.push({ value, source: input });
      } else {
        warnings.push(
          `${importUrl.name} accepted ${input} but returned no media id, so that reference was skipped.`
        );
      }
    } catch (err) {
      warnings.push(
        `Could not register ${input}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { medias, warnings };
}
