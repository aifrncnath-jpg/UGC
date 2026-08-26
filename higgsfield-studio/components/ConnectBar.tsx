"use client";

import { Button, Note } from "./ui";
import type { AuthStatus, ToolsInfo } from "@/lib/client-types";

export function ConnectBar({
  auth,
  tools,
  onDisconnect,
  busy,
}: {
  auth: AuthStatus | null;
  tools: ToolsInfo | null;
  onDisconnect: () => void;
  busy: boolean;
}) {
  const connected = Boolean(auth?.connected);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/80 px-5 py-3.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            connected
              ? "bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60"
              : "bg-zinc-600"
          }`}
        />
        <div className="text-sm">
          <span className="font-semibold text-zinc-100">
            {connected ? "Connected to Higgsfield MCP" : "Not connected"}
          </span>
          <span className="ml-2 font-mono text-xs text-zinc-500">
            {auth?.serverUrl ?? "https://mcp.higgsfield.ai/mcp"}
          </span>
        </div>
        {tools && (
          <span className="hidden rounded-lg border border-line bg-panel2 px-2 py-1 font-mono text-[11px] text-zinc-400 sm:inline">
            {tools.toolName}
            {tools.statusToolName ? ` + ${tools.statusToolName}` : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <a href="/api/auth/start?reset=1">
              <Button variant="outline" size="sm" disabled={busy}>
                Reconnect
              </Button>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              disabled={busy}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <a href="/api/auth/start">
            <Button size="sm">Connect Higgsfield</Button>
          </a>
        )}
      </div>
    </div>
  );
}

export function ConnectSplash({ auth }: { auth: AuthStatus | null }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-line bg-panel/80 p-8 text-center backdrop-blur">
      <div className="text-5xl">🍌</div>
      <h2 className="text-xl font-semibold text-zinc-100">
        Connect your Higgsfield account
      </h2>
      <p className="text-sm leading-relaxed text-zinc-400">
        This studio talks to Higgsfield&apos;s official MCP server over
        Streamable HTTP. There is no API key: it registers itself with
        Higgsfield&apos;s Dynamic Client Registration endpoint, then sends you
        through the normal Higgsfield login. Generations bill to your existing
        plan credits.
      </p>
      <a href="/api/auth/start" className="inline-block">
        <Button size="lg">Connect Higgsfield →</Button>
      </a>
      <div className="space-y-2 pt-2 text-left">
        <Note tone="warn">
          <strong>Credits note:</strong> everything generated through MCP deducts
          credits at standard rates, even on plans with Unlimited web access.
          Unlimited and free generations only apply on higgsfield.ai itself.
        </Note>
        <Note tone="info">
          Higgsfield will redirect back to{" "}
          <code className="font-mono">
            {auth?.redirectUri ?? "http://localhost:3000/api/auth/callback"}
          </code>
          . If you deploy this app, set <code className="font-mono">APP_URL</code>{" "}
          to its public origin so that redirect stays correct.
        </Note>
      </div>
    </div>
  );
}
