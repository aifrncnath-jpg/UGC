import { NextResponse } from "next/server";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { MCP_SERVER_URL, OAUTH_SCOPE } from "@/lib/config";
import { HiggsfieldOAuthProvider } from "@/lib/oauth";
import { resetAuth } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Kicks off the OAuth handshake.
 *
 * The MCP SDK's auth() orchestrator does the heavy lifting: RFC 9728 resource
 * discovery, RFC 8414 authorization-server metadata, dynamic client
 * registration against Higgsfield's open /oauth2/register endpoint, and PKCE
 * challenge generation. It then calls our provider's redirectToAuthorization(),
 * which just records the URL — and we 302 the browser there.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("reset") === "1") {
    await resetAuth();
  }

  const provider = new HiggsfieldOAuthProvider();
  try {
    const result = await auth(provider, {
      serverUrl: MCP_SERVER_URL,
      scope: OAUTH_SCOPE,
    });

    if (result === "AUTHORIZED") {
      return NextResponse.redirect(new URL("/?connected=already", url.origin));
    }
    if (!provider.capturedAuthorizationUrl) {
      throw new Error(
        "OAuth flow did not produce an authorization URL. Check that " +
          `${MCP_SERVER_URL} is reachable from this machine.`
      );
    }
    return NextResponse.redirect(provider.capturedAuthorizationUrl.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, url.origin)
    );
  }
}
