"use client";

import React from "react";
import { Button, Code, Collapse, Note, Panel } from "./ui";
import type { ToolsInfo } from "@/lib/client-types";

/**
 * The escape hatch. Higgsfield owns the MCP schema and can change it, so this
 * tab shows exactly what the server declared, how this app mapped its form onto
 * that schema, and which per-model constraints it applies on top.
 *
 * The copy buttons matter: if the field matcher ever fails to spot the prompt
 * argument, the raw schema is the only thing that explains why, and it needs to
 * be easy to hand over.
 */
export function InspectorView({
  tools,
  onRefresh,
  busy,
}: {
  tools: ToolsInfo;
  onRefresh: () => void;
  busy: boolean;
}) {
  const mapRows = Object.entries(tools.mapping);
  const unmapped = mapRows.filter(([, v]) => v === null).map(([k]) => k);

  return (
    <div className="space-y-4">
      {tools.mapping.prompt === null && (
        <Note tone="error">
          <strong>The prompt field was not identified.</strong> Generation cannot
          work until it is. Use <em>Copy raw schema</em> below and send it over so
          the matcher can be fixed — that JSON is exactly what&apos;s needed to
          diagnose it.
        </Note>
      )}

      <Panel
        title="Field mapping"
        subtitle="Left is this app's control, right is the argument name the server actually declared."
        right={
          <div className="flex gap-1.5">
            <CopyButton
              label="Copy raw schema"
              value={() =>
                JSON.stringify(
                  {
                    toolName: tools.toolName,
                    toolDescription: tools.toolDescription,
                    statusToolName: tools.statusToolName,
                    allTools: tools.allTools,
                    detectedMapping: tools.mapping,
                    modelsFromSchema: tools.modelsFromSchema,
                    rawInputSchema: tools.rawInputSchema,
                  },
                  null,
                  2
                )
              }
            />
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy}>
              Refresh
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <tbody>
              {mapRows.map(([key, value], i) => (
                <tr key={key} className={i % 2 ? "bg-panel2/40" : undefined}>
                  <td className="px-3.5 py-2 font-medium text-zinc-300">{key}</td>
                  <td className="px-3.5 py-2 font-mono text-zinc-500">
                    {value === null ? (
                      <span className="text-amber-500/80">not found</span>
                    ) : (
                      String(value)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Calling <code className="font-mono text-zinc-400">{tools.toolName}</code>
          {tools.statusToolName && (
            <>
              , polling{" "}
              <code className="font-mono text-zinc-400">
                {tools.statusToolName}
              </code>
            </>
          )}
          .
          {unmapped.length > 0 && (
            <>
              {" "}
              Not found on this tool: {unmapped.join(", ")} — those controls are
              hidden rather than sent.
            </>
          )}
        </p>
      </Panel>

      <Panel
        title="Per-model constraints"
        subtitle="The tool has one aspect_ratio enum shared by every model, so these narrow it to what each model really accepts."
      >
        {!tools.modelsFromSchema && (
          <div className="mb-3">
            <Note tone="warn">
              The server did not enumerate model values, so this table comes from
              the built-in catalog rather than the live schema.
            </Note>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-panel2/60 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Value sent</th>
                <th className="px-3 py-2 font-semibold">Aspect ratios</th>
                <th className="px-3 py-2 font-semibold">Resolution</th>
                <th className="px-3 py-2 font-semibold">Quality</th>
              </tr>
            </thead>
            <tbody>
              {tools.models.map((m, i) => (
                <tr key={m.id} className={i % 2 ? "bg-panel2/30" : undefined}>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={
                        m.tier === 1
                          ? "font-semibold text-banana"
                          : "text-zinc-300"
                      }
                    >
                      {m.label}
                    </span>
                    {!m.known && (
                      <span className="ml-1.5 text-[10px] text-amber-500/80">
                        uncatalogued
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-[11px] text-zinc-500">
                    {m.id}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-zinc-400">
                    {m.aspectRatios.join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-zinc-400">
                    {m.resolutions.join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-zinc-400">
                    {m.qualities.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tools.schemaAspectRatios.length > 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            Full schema enum:{" "}
            <span className="font-mono text-zinc-400">
              {tools.schemaAspectRatios.join(", ")}
            </span>
          </p>
        )}
      </Panel>

      <Panel
        title="All MCP tools"
        subtitle={`${tools.allTools.length} exposed by the server — this app only calls the image one`}
      >
        <ul className="space-y-2">
          {tools.allTools.map((t) => (
            <li
              key={t.name}
              className="rounded-xl border border-line bg-panel2 px-3.5 py-2.5"
            >
              <p className="font-mono text-xs text-zinc-200">{t.name}</p>
              {t.description && (
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {t.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Raw input schema"
        right={
          <CopyButton
            label="Copy"
            value={() => JSON.stringify(tools.rawInputSchema, null, 2)}
          />
        }
      >
        <Collapse title={`${tools.toolName} inputSchema`} defaultOpen>
          <Code value={tools.rawInputSchema} />
        </Collapse>
      </Panel>
    </div>
  );
}

function CopyButton({
  label,
  value,
}: {
  label: string;
  value: () => string;
}) {
  const [state, setState] = React.useState<"idle" | "ok" | "fail">("idle");

  async function copy() {
    const text = value();
    try {
      // navigator.clipboard needs a secure context, which plain http://localhost
      // does satisfy — but not http:// on a LAN IP, so keep a fallback.
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy rejected");
      }
      setState("ok");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {state === "ok" ? "Copied ✓" : state === "fail" ? "Select manually" : label}
    </Button>
  );
}
