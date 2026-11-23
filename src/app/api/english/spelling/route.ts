import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { isSpellingRecordingQuestion } from "@/server/english.mjs";
import { originForbidden, jsonResponse } from "@/server/http.mjs";
import {
  RECORDING_BYTES,
  transcribeSpelling,
  readSpellingReceipt,
  spellingReceipt,
} from "@/server/english-transcription.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function problem(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

function userFor(req: NextRequest) {
  return store.sessionUser(req.cookies.get("hana_session")?.value);
}

export async function GET(req: NextRequest) {
  const user = userFor(req);
  if (!user) return problem("سجّل الدخول أولًا.", 401);
  const id = Number(req.nextUrl.searchParams.get("attempt"));
  if (!Number.isSafeInteger(id) || id <= 0)
    return problem("التسجيل غير موجود.", 404);
  const recording = store.english.recording(user.id, id);
  if (!recording) return problem("التسجيل غير موجود.", 404);
  const wav = new Uint8Array(recording.wav);
  const range = req.headers.get("range")?.match(/^bytes=(\d+)-(\d*)$/);
  const headers = {
    "Content-Type": "audio/wav",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  if (!range)
    return new NextResponse(wav, {
      headers: { ...headers, "Content-Length": String(wav.length) },
    });
  const start = Number(range[1]);
  const end = Math.min(
    range[2] ? Number(range[2]) : wav.length - 1,
    wav.length - 1,
  );
  if (start > end)
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${wav.length}` },
    });
  return new NextResponse(wav.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${wav.length}`,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = userFor(req);
    if (!user) return problem("سجّل الدخول أولًا.", 401);
    if (user.role !== "student" || originForbidden(req))
      return problem("الطلب غير مسموح.", 403);
    const qid = req.headers.get("x-question-id") ?? "";
    const nonce = req.headers.get("x-attempt-nonce") ?? "";
    if (!isSpellingRecordingQuestion(qid) || !/^[a-z0-9-]{12,80}$/i.test(nonce))
      return problem("السؤال أو رقم المحاولة غير صالح.", 400);
    if (req.headers.get("content-type") !== "audio/wav")
      return problem("صيغة التسجيل غير مدعومة.", 415);
    if (Number(req.headers.get("content-length")) > RECORDING_BYTES)
      return problem("التسجيل أطول من ١٢ ثانية.", 413);
    const reader = req.body?.getReader();
    if (!reader) return problem("سجّل إجابتك أولًا.", 400);
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > RECORDING_BYTES) {
        await reader.cancel();
        return problem("التسجيل أطول من ١٢ ثانية.", 413);
      }
      chunks.push(value);
    }
    const wav = Buffer.concat(chunks, size);
    const context = { uid: user.id, qid, nonce };
    const receipt = req.headers.get("x-recognition-receipt");
    if (!receipt) {
      store.rateLimit(`english-spelling:${user.id}`);
      const heard = await transcribeSpelling(wav);
      return jsonResponse({
        ...heard,
        receipt: spellingReceipt(context, wav, heard),
      });
    }
    const { transcript, answer } = readSpellingReceipt(receipt, context, wav);
    return jsonResponse(
      store.english.submitRecording(
        user.id,
        { qid, answer, nonce },
        { transcript, wav },
      ),
    );
  } catch (failure) {
    const error = failure as Error & { status?: number };
    return problem(
      error.status ? error.message : "تعذّر حفظ التسجيل.",
      error.status || 500,
    );
  }
}
