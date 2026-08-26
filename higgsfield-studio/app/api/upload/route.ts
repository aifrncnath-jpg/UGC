import { NextResponse } from "next/server";
import { saveUpload } from "@/lib/assets";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Stores a reference image locally and returns its URL.
 *
 * Heads up: Higgsfield fetches reference images from its own servers, so the URL
 * has to be publicly reachable. On localhost it won't be — deploy the app (or
 * tunnel it) if you want reference-image workflows.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "That file is larger than 12 MB." },
      { status: 413 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: "Only image files are supported." },
      { status: 415 }
    );
  }

  const { url } = await saveUpload(file);
  const base = appUrl();
  return NextResponse.json({
    ok: true,
    url,
    absoluteUrl: `${base}${url}`,
    publiclyReachable: !/localhost|127\.0\.0\.1/i.test(base),
  });
}
