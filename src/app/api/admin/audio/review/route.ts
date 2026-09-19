import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { handleAudioReview } from "@/server/audio/review.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = store.sessionUser(req.cookies.get("hana_session")?.value);
    return await handleAudioReview(req, { user });
  } catch (error: unknown) {
    const e = error as Error & { status?: number };
    if (e instanceof SyntaxError)
      return NextResponse.json(
        { error: "بيانات غير صحيحة." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    if (e.status)
      return NextResponse.json(
        { error: e.message },
        { status: e.status, headers: { "Cache-Control": "no-store" } },
      );
    console.error("API operation failed", e.name);
    return NextResponse.json(
      { error: "تعذّر إتمام الطلب. حاولي مجددًا." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
