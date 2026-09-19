import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { getAudioManifest } from "@/server/audio/manifest.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  if (!store.isPublished()) {
    return response({ error: "الدرس غير متاح حاليًا." }, 404);
  }
  const page = req.nextUrl.searchParams.get("page") || "";
  const grant = req.nextUrl.searchParams.get("grant") ?? undefined;
  try {
    return response(await getAudioManifest(page, grant));
  } catch (error: unknown) {
    const e = error as Error & { status?: number };
    if (e.status === 404) return response({ error: "غير موجود." }, 404);
    throw error;
  }
}
