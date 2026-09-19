import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { serveAdminAudioClip } from "@/server/audio/clip.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string; hash: string }> },
) {
  const user = store.sessionUser(req.cookies.get("hana_session")?.value);
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "غير مصرّح." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { segmentId, hash } = await params;
  return serveAdminAudioClip(req, { segmentId, hash });
}
