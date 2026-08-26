"use client";

import { Button, Code, Collapse, Note, Panel } from "./ui";
import type { ToolsInfo } from "@/lib/client-types";

/**
 * The escape hatch. Higgsfield owns the MCP schema and can change it, so this
 * tab shows exactly what the server declared, how this app mapped its form onto
 * that schema, and which per-model constraints it is applying on top.
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
  const mapRows = Object.entries(tools.mapping).filter(
    ([k]) => k !== "referenceIsArray"
  );

  return (
    <div className="space-y-4">
      <Panel
        title="Field mapping"
        subtitle="Left is this app's control, right is the argument name the server actually declared."
        right={
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy}>
            Refresh schema
          </Button>
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
                      <span className="text-amber-500/80">not available</span>
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
        </p>
      </Panel>

      <Panel
        title="Per-model constraints"
        subtitle="The tool has one aspect_ratio enum shared by every model, so these narrow it down to what each model really accepts."
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
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-panel2/60 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Value sent</th>
                <th className="px-3 py-2 font-semibold">Aspect ratios</th>
                <th className="px-3 py-2 font-semibold">Resolution</th>
                <th className="px-3 py-2 font-semibold">Quality</th>
                <th className="px-3 py-2 font-semibold">Refs</th>
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
                  <td className="px-3 py-2 align-top text-[11px] text-zinc-400">
                    {m.maxReferences}
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
        subtitle={`${tools.allTools.length} exposed by the server — this app only calls the image ones`}
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

      <Panel title="Raw input schema">
        <Collapse title={`${tools.toolName} inputSchema`} defaultOpen>
          <Code value={tools.rawInputSchema} />
        </Collapse>
      </Panel>
    </div>
  );
}
