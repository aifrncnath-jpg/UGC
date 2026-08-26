import { NextResponse } from "next/server";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Tells the browser whether uploaded reference images can possibly work.
 *
 * Higgsfield fetches reference images from its own servers, so an upload is only
 * usable if this app is reachable from the public internet. Rather than let the
 * upload button look functional and then have the reference silently ignored, the
 * UI asks here first and disables uploads with an explanation when the answer is
 * no.
 */
export async function GET() {
  const base = appUrl();
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\.local(:|$)/i.test(
    base
  );
  return NextResponse.json({
    appUrl: base,
    uploadsUsable: !isLocal,
    reason: isLocal
      ? `This app is running at ${base}. Higgsfield loads reference images from its own servers and cannot reach an address on your machine, so an uploaded file would be ignored. Paste a publicly hosted image URL instead, or deploy the app and set APP_URL.`
      : null,
  });
}
