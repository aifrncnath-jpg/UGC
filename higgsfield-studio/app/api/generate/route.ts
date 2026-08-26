import { NextResponse } from "next/server";
import {
  InvalidComboError,
  MAX_COUNT,
  runGeneration,
  type GenerateRequest,
} from "@/lib/generate";
import { NotConnectedError } from "@/lib/mcp";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Write a prompt first." },
      { status: 400 }
    );
  }

  const count = body.count ?? 1;
  if (typeof count !== "number" || !Number.isFinite(count) || count < 1 || count > MAX_COUNT) {
    return NextResponse.json(
      { ok: false, error: `Number of images must be between 1 and ${MAX_COUNT}.` },
      { status: 400 }
    );
  }

  try {
    const item = await runGeneration({ ...body, prompt: body.prompt.trim() });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json(
        { ok: false, notConnected: true, error: err.message },
        { status: 401 }
      );
    }
    // An illegal model/ratio pair is a user error, and importantly it costs no
    // credits because we never reached the tool call.
    if (err instanceof InvalidComboError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
