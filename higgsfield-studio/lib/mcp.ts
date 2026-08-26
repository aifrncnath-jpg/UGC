import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { MCP_SERVER_URL } from "./config";
import { HiggsfieldOAuthProvider } from "./oauth";
import { getStore, updateStore } from "./store";

export class NotConnectedError extends Error {
  constructor(message = "Not connected to Higgsfield. Click Connect first.") {
    super(message);
    this.name = "NotConnectedError";
  }
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
}

export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  enum?: unknown[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  default?: unknown;
  description?: string;
  title?: string;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}

/**
 * Opens an authenticated MCP session, runs `fn`, and always tears the session
 * down afterwards. Short-lived sessions keep this serverless-friendly and avoid
 * stale-session bugs; the handshake is a single round trip.
 */
export async function withMcp<T>(
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const store = await getStore();
  if (!store.tokens?.access_token) throw new NotConnectedError();

  const provider = new HiggsfieldOAuthProvider();
  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL), {
    authProvider: provider,
  });
  const client = new Client(
    { name: "higgsfield-studio", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    return await fn(client);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      // The SDK already tried a refresh and gave up. Force a reconnect.
      throw new NotConnectedError(
        "Higgsfield session expired. Click Reconnect to log in again."
      );
    }
    throw err;
  } finally {
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
  }
}

const TOOL_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listTools(
  force = false
): Promise<{ tools: McpTool[]; cached: boolean }> {
  const store = await getStore();
  const cached = store.toolCache;
  if (
    !force &&
    cached &&
    Date.now() - cached.fetchedAt < TOOL_CACHE_TTL_MS &&
    cached.tools.length
  ) {
    return { tools: cached.tools as McpTool[], cached: true };
  }

  const tools = await withMcp(async (client) => {
    const all: McpTool[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : {});
      all.push(...(page.tools as unknown as McpTool[]));
      cursor = page.nextCursor;
    } while (cursor);
    return all;
  });

  await updateStore((s) => {
    s.toolCache = { fetchedAt: Date.now(), tools };
  });
  return { tools, cached: false };
}

export interface RawToolResult {
  content?: Array<Record<string, unknown>>;
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  timeoutMs = 15 * 60 * 1000
): Promise<RawToolResult> {
  return withMcp(async (client) => {
    const result = await client.callTool(
      { name, arguments: args },
      undefined,
      // Image generation can legitimately take minutes; keep the request alive
      // and let progress notifications reset the clock.
      { timeout: 120_000, maxTotalTimeout: timeoutMs, resetTimeoutOnProgress: true }
    );
    return result as RawToolResult;
  });
}
