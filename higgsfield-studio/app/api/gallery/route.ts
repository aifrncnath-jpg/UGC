import { NextResponse } from "next/server";
import { getStore, updateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getStore();
  // `raw` payloads are large; the gallery list doesn't need them.
  const items = (s.gallery ?? []).map(({ raw, ...rest }) => rest);
  return NextResponse.json({ ok: true, items });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  await updateStore((s) => {
    s.gallery = id ? (s.gallery ?? []).filter((g) => g.id !== id) : [];
  });
  return NextResponse.json({ ok: true });
}
