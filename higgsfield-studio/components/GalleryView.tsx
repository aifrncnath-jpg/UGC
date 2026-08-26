"use client";

import { Button, Note, Panel } from "./ui";
import { imageSrc, type GalleryItemView } from "@/lib/client-types";

export function GalleryView({
  items,
  onReuse,
  onDelete,
  onClear,
}: {
  items: GalleryItemView[];
  onReuse: (item: GalleryItemView) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  if (!items.length) {
    return (
      <Panel title="Gallery">
        <Note tone="info">
          Nothing here yet. Every generation is saved with the exact arguments
          that produced it, so you can rerun a winning look on a new subject.
        </Note>
      </Panel>
    );
  }

  return (
    <Panel
      title="Gallery"
      subtitle={`${items.length} generation${items.length === 1 ? "" : "s"}, mirrored locally in .data/outputs`}
      right={
        <Button variant="danger" size="sm" onClick={onClear}>
          Clear all
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const src = imageSrc(item)[0];
          return (
            <div
              key={item.id}
              className="group overflow-hidden rounded-xl border border-line bg-panel2"
            >
              <div className="relative aspect-[3/4] bg-ink">
                {src ? (
                  <a href={src} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:opacity-90"
                    />
                  </a>
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-zinc-600">
                    {item.status === "pending"
                      ? "Still rendering…"
                      : (item.error ?? "No image")}
                  </div>
                )}
                {imageSrc(item).length > 1 && (
                  <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200">
                    +{imageSrc(item).length - 1}
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2.5">
                <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
                  {item.prompt}
                </p>
                <p className="truncate font-mono text-[10px] text-zinc-600">
                  {item.model} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onReuse(item)}
                  >
                    Reuse
                  </Button>
                  {src && (
                    <a href={src} download target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        ↓
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(item.id)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
