"use client";

import React from "react";
import { Button, Code, Collapse, Note, Panel, Spinner } from "./ui";
import { imageSrc, type GalleryItemView } from "@/lib/client-types";

export function ResultView({
  item,
  busy,
  error,
  aspectRatio,
  count,
}: {
  item: GalleryItemView | null;
  busy: boolean;
  error: string | null;
  aspectRatio: string;
  count: number;
}) {
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w && h ? `${w} / ${h}` : "9 / 16";

  if (busy) {
    return (
      <Panel title="Generating">
        <div
          className={`grid gap-3 ${count > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className="shimmer flex w-full items-center justify-center rounded-xl border border-line"
              style={{ aspectRatio: ratio }}
            >
              {i === 0 && (
                <div className="flex flex-col items-center gap-3 px-4 text-zinc-500">
                  <Spinner className="h-6 w-6" />
                  <p className="text-center text-[11px] leading-relaxed">
                    Usually under a minute. Keep this tab open.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Generation failed">
        <Note tone="error">{error}</Note>
      </Panel>
    );
  }

  if (!item) {
    return (
      <Panel title="Output">
        <div
          className="flex w-full items-center justify-center rounded-xl border border-dashed border-line bg-ink/50"
          style={{ aspectRatio: ratio }}
        >
          <p className="px-8 text-center text-xs leading-relaxed text-zinc-600">
            Your image lands here. Every result is saved to disk, so the link
            never expires on you.
          </p>
        </div>
      </Panel>
    );
  }

  const srcs = imageSrc(item);

  return (
    <Panel
      title={item.status === "pending" ? "Still rendering" : "Output"}
      subtitle={new Date(item.createdAt).toLocaleString()}
      right={
        srcs.length > 0 ? (
          <div className="flex gap-1.5">
            {srcs.map((src, i) => (
              <a key={src} href={src} download target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  ↓{srcs.length > 1 ? ` ${i + 1}` : ""}
                </Button>
              </a>
            ))}
          </div>
        ) : null
      }
    >
      <div className="space-y-3">
        {item.warnings && item.warnings.length > 0 && (
          <Note tone="warn">
            <ul className="list-inside list-disc space-y-1">
              {item.warnings.map((wn, i) => (
                <li key={i}>{wn}</li>
              ))}
            </ul>
          </Note>
        )}

        {item.status === "pending" && (
          <Note tone="info">
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-3.5 w-3.5" /> Job{" "}
              <code className="font-mono">{item.jobId}</code> is still running.
              Polling automatically.
            </span>
          </Note>
        )}

        {item.status === "error" && item.error && (
          <Note tone="error">{item.error}</Note>
        )}

        {srcs.length > 0 && (
          <div
            className={`grid gap-3 ${srcs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {srcs.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Generated image ${i + 1}`}
                  className="w-full rounded-xl border border-line bg-ink object-contain transition hover:border-zinc-600"
                />
              </a>
            ))}
          </div>
        )}

        <Collapse title="MCP arguments sent">
          <Code value={item.params} />
        </Collapse>

        {item.raw !== undefined && (
          <Collapse
            title="Raw MCP response"
            defaultOpen={item.status !== "done"}
          >
            <p className="text-[11px] leading-relaxed text-zinc-400">
              This is exactly what Higgsfield sent back. If the image appeared on
              higgsfield.ai but not here, this payload shows why — copy it and
              send it over.
            </p>
            <CopyRaw value={item.raw} />
            <Code value={item.raw} />
          </Collapse>
        )}
      </div>
    </Panel>
  );
}

function CopyRaw({ value }: { value: unknown }) {
  const [state, setState] = React.useState<"idle" | "ok" | "fail">("idle");

  async function copy() {
    const text = JSON.stringify(value, null, 2);
    try {
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
      {state === "ok"
        ? "Copied ✓"
        : state === "fail"
          ? "Select the text below manually"
          : "Copy raw response"}
    </Button>
  );
}
