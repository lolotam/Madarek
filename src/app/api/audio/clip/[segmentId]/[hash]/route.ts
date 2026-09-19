import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { serveAudioClip } from "@/server/audio/clip.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string; hash: string }> },
) {
  if (!store.isPublished()) {
    return NextResponse.json(
      { error: "الدرس غير متاح حاليًا." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { segmentId, hash } = await params;
  return serveAudioClip(req, { segmentId, hash });
}
