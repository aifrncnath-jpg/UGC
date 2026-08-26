import { NextResponse } from "next/server";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { MCP_SERVER_URL, OAUTH_SCOPE } from "@/lib/config";
import { HiggsfieldOAuthProvider } from "@/lib/oauth";
import { getStore, updateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Higgsfield redirects here with ?code=... after you approve the connection. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const home = (qs: string) => NextResponse.redirect(new URL(`/${qs}`, url.origin));

  if (oauthError) {
    const desc = url.searchParams.get("error_description") ?? oauthError;
    return home(`?error=${encodeURIComponent(desc)}`);
  }
  if (!code) {
    return home("?error=" + encodeURIComponent("No authorization code returned."));
  }

  const store = await getStore();
  if (store.oauthState && state && store.oauthState !== state) {
    return home(
      "?error=" +
        encodeURIComponent(
          "OAuth state mismatch — the login attempt did not match this session. Try connecting again."
        )
    );
  }

  try {
    const provider = new HiggsfieldOAuthProvider();
    const result = await auth(provider, {
      serverUrl: MCP_SERVER_URL,
      authorizationCode: code,
      scope: OAUTH_SCOPE,
    });
    await updateStore((s) => {
      delete s.oauthState;
    });
    if (result !== "AUTHORIZED") {
      return home(
        "?error=" + encodeURIComponent("Token exchange did not complete.")
      );
    }
    return home("?connected=1");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return home(`?error=${encodeURIComponent(message)}`);
  }
}
