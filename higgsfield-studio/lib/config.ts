import path from "node:path";

/** The official Higgsfield remote MCP server (Streamable HTTP transport). */
export const MCP_SERVER_URL =
  process.env.HIGGSFIELD_MCP_URL ?? "https://mcp.higgsfield.ai/mcp";

/** Scopes advertised by the Higgsfield protected-resource metadata. */
export const OAUTH_SCOPE =
  process.env.HIGGSFIELD_OAUTH_SCOPE ?? "openid email offline_access";

/**
 * Public base URL of THIS app. Must be reachable by your browser, because the
 * OAuth authorization code is redirected back here. Set APP_URL when you deploy
 * (e.g. https://studio.yourdomain.com) so the redirect_uri matches.
 */
export function appUrl(): string {
  const raw =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

export function redirectUri(): string {
  return `${appUrl()}/api/auth/callback`;
}

/** Where tokens, the registered OAuth client, and the gallery index live. */
export const DATA_DIR =
  process.env.DATA_DIR ?? path.join(process.cwd(), ".data");

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const OUTPUTS_DIR = path.join(DATA_DIR, "outputs");

export const CLIENT_NAME = process.env.OAUTH_CLIENT_NAME ?? "Higgsfield Studio";
