import crypto from "node:crypto";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { CLIENT_NAME, OAUTH_SCOPE, redirectUri } from "./config";
import { getStore, updateStore, type StoredTokens } from "./store";

/**
 * OAuth provider for the Higgsfield MCP server.
 *
 * Higgsfield exposes an open Dynamic Client Registration endpoint
 * (/oauth2/register) and authorization-code + PKCE, so there is nothing to
 * pre-configure: on first connect we register this app on the fly, bounce the
 * user through Higgsfield's Clerk login, and store the resulting tokens.
 *
 * The MCP SDK's `auth()` orchestrator drives all of this. Our only job is to
 * persist state and to capture the authorization URL instead of performing a
 * real browser redirect (we're on the server, so the route handler does the
 * redirecting).
 */
export class HiggsfieldOAuthProvider implements OAuthClientProvider {
  /** Set by redirectToAuthorization() so the caller can send the user there. */
  capturedAuthorizationUrl?: URL;

  get redirectUrl(): string {
    return redirectUri();
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: CLIENT_NAME,
      redirect_uris: [redirectUri()],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: OAUTH_SCOPE,
      software_id: "higgsfield-studio",
    } as OAuthClientMetadata;
  }

  async state(): Promise<string> {
    const value = crypto.randomBytes(16).toString("hex");
    await updateStore((s) => {
      s.oauthState = value;
    });
    return value;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const s = await getStore();
    // If APP_URL changed, the old registration's redirect_uri no longer
    // matches, so drop it and let the SDK re-register.
    if (s.clientRedirectUri && s.clientRedirectUri !== redirectUri()) {
      return undefined;
    }
    return s.clientInfo as OAuthClientInformationMixed | undefined;
  }

  async saveClientInformation(info: OAuthClientInformationMixed): Promise<void> {
    await updateStore((s) => {
      s.clientInfo = info as never;
      s.clientRedirectUri = redirectUri();
    });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const s = await getStore();
    return s.tokens as OAuthTokens | undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await updateStore((s) => {
      const previous = s.tokens;
      s.tokens = {
        ...(tokens as unknown as StoredTokens),
        // Higgsfield sometimes omits refresh_token on refresh responses; keep
        // whatever we already had so the session survives.
        refresh_token:
          (tokens as { refresh_token?: string }).refresh_token ??
          previous?.refresh_token,
        obtained_at: Date.now(),
      };
      delete s.codeVerifier;
    });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    this.capturedAuthorizationUrl = authorizationUrl;
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await updateStore((s) => {
      s.codeVerifier = codeVerifier;
    });
  }

  async codeVerifier(): Promise<string> {
    const s = await getStore();
    if (!s.codeVerifier) {
      throw new Error(
        "No PKCE code verifier saved. Start the connect flow again from the home page."
      );
    }
    return s.codeVerifier;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await updateStore((s) => {
      s.discoveryState = state;
    });
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    const s = await getStore();
    return s.discoveryState as OAuthDiscoveryState | undefined;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery"
  ): Promise<void> {
    await updateStore((s) => {
      if (scope === "all" || scope === "tokens") delete s.tokens;
      if (scope === "all" || scope === "verifier") delete s.codeVerifier;
      if (scope === "all" || scope === "discovery") delete s.discoveryState;
      if (scope === "all" || scope === "client") {
        delete s.clientInfo;
        delete s.clientRedirectUri;
      }
    });
  }
}

export async function authStatus() {
  const s = await getStore();
  const t = s.tokens;
  if (!t?.access_token) {
    return { connected: false as const, redirectUri: redirectUri() };
  }
  const expiresAt =
    t.obtained_at && t.expires_in
      ? t.obtained_at + t.expires_in * 1000
      : undefined;
  return {
    connected: true as const,
    redirectUri: redirectUri(),
    scope: t.scope ?? OAUTH_SCOPE,
    hasRefreshToken: Boolean(t.refresh_token),
    expiresAt,
    expired: expiresAt ? Date.now() > expiresAt : false,
    clientId: s.clientInfo?.client_id,
  };
}
