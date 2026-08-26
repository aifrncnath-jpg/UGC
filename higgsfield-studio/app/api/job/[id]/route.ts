import { NextResponse } from "next/server";
import { callTool, NotConnectedError } from "@/lib/mcp";
import { getImageTool } from "@/lib/tools";
import { parseToolResult, isPending } from "@/lib/extract";
import { ImageDedupe, mirrorRemoteImage, saveBase64Image } from "@/lib/assets";
import { getStore } from "@/lib/store";
import { saveGalleryItem, statusArgsFor } from "@/lib/generate";

export const dynamic = "force-dynamic";

/**
 * One poll of an in-flight generation. The browser calls this on a timer for
 * jobs that were still cooking when /api/generate had to return.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  try {
    const store = await getStore();
    const item = (store.gallery ?? []).find((g) => g.id === id);
    if (!item) {
      return NextResponse.json({ ok: false, error: "Unknown job." }, { status: 404 });
    }
    if (item.status !== "pending" || !item.jobId) {
      return NextResponse.json({ ok: true, item });
    }

    const { statusToolName } = await getImageTool();
    if (!statusToolName) {
      return NextResponse.json({
        ok: true,
        item: {
          ...item,
          status: "error" as const,
          error:
            "The generation is async but the server exposes no status tool, so the result cannot be polled.",
        },
      });
    }

    const args = await statusArgsFor(statusToolName, item.jobId);
    const raw = await callTool(statusToolName, args);
    const parsed = parseToolResult(raw);

    if (isPending(parsed)) {
      return NextResponse.json({ ok: true, item, stillPending: true });
    }

    // Same content-hash guard as the initial generation, so a response carrying
    // both a URL and an inline copy of one image doesn't become two results.
    const dedupe = new ImageDedupe();
    const localImages: string[] = [];
    const reasons: string[] = [];

    for (const img of parsed.base64Images) {
      const saved = await saveBase64Image(img.data, img.mimeType, item.id, dedupe);
      if (saved) localImages.push(saved);
    }
    for (const url of parsed.images.slice(0, 10)) {
      const outcome = await mirrorRemoteImage(url, item.id, dedupe);
      if (outcome.path) localImages.push(outcome.path);
      else if (outcome.reason) reasons.push(outcome.reason);
    }

    // Only a confirmed download counts as done. Candidate URLs alone are not
    // evidence, since an unverified link is what made results vanish before.
    if (!localImages.length && isPending(parsed)) {
      return NextResponse.json({ ok: true, item, stillPending: true });
    }

    const updated = {
      ...item,
      images: parsed.images,
      localImages,
      raw,
      status: localImages.length ? ("done" as const) : ("error" as const),
      error: localImages.length
        ? undefined
        : reasons.length
          ? `No usable image in the response: ${[...new Set(reasons)].join(" | ")}`
          : parsed.text ||
            "The job finished without returning an image this app could read.",
    };
    await saveGalleryItem(updated);
    return NextResponse.json({ ok: true, item: updated });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json(
        { ok: false, notConnected: true, error: err.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
