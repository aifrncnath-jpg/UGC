import { NextResponse } from "next/server";
import { resetAuth } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await resetAuth();
  return NextResponse.json({ ok: true });
}
