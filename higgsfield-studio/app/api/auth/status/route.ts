import { NextResponse } from "next/server";
import { authStatus } from "@/lib/oauth";
import { MCP_SERVER_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await authStatus();
  return NextResponse.json({ ...status, serverUrl: MCP_SERVER_URL });
}
