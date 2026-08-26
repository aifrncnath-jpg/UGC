"use client";

import { Button, Code, Collapse, Note, Panel, Spinner } from "./ui";
import { imageSrc, type GalleryItemView } from "@/lib/client-types";

export function ResultView({
  item,
  busy,
  error,
  aspectRatio,
}: {
  item: GalleryItemView | null;
  busy: boolean;
  error: string | null;
  aspectRatio: string;
}) {
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w && h ? `${w} / ${h}` : "9 / 16";

  if (busy) {
    return (
      <Panel title="Generating">
        <div
          className="shimmer flex w-full items-center justify-center rounded-xl border border-line"
          style={{ aspectRatio: ratio }}
        >
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <Spinner className="h-6 w-6" />
            <p className="text-xs">Nano Banana Pro is cooking…</p>
            <p className="max-w-56 text-center text-[11px] leading-relaxed text-zinc-600">
              2K renders usually land in under a minute. The tab can stay open;
              the job keeps polling.
            </p>
          </div>
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
            Your render lands here. Everything is mirrored to disk, so the link
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
        srcs[0] ? (
          <a href={srcs[0]} download target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              Download
            </Button>
          </a>
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

        <Collapse title="Prompt sent">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {item.prompt}
          </p>
        </Collapse>

        <Collapse title="MCP arguments">
          <Code value={item.params} />
        </Collapse>

        {item.rawText && (
          <Collapse title="Server message">
            <Code value={item.rawText} />
          </Collapse>
        )}
      </div>
    </Panel>
  );
}
