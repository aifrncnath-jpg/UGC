import fs from "node:fs/promises";
import { resolveAsset } from "@/lib/assets";

export const dynamic = "force-dynamic";

/** Serves mirrored generations and uploaded reference images from .data/. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const found = await resolveAsset(name);
  if (!found) return new Response("Not found", { status: 404 });

  const buf = await fs.readFile(found.file);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": found.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
}
