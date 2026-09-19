import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { publicQuestions, grade, modelReason } from "@/server/questions.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "hana_session";
function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  const action = (await params).action.join("/");
  const user = store.sessionUser(req.cookies.get(cookieName)?.value);
  if (action === "session") return response({ user });
  if (action === "quiz")
    return store.isPublished()
      ? response({ questions: publicQuestions() })
      : response({ error: "الدرس غير متاح حاليًا." }, 404);
  if (action === "dashboard") {
    if (!user) return response({ error: "يلزم تسجيل الدخول." }, 401);
    return response(store.snapshot(user.id));
  }
  return response({ error: "غير موجود." }, 404);
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const origin = req.headers.get("origin");
    // Next normalizes loopback hosts to localhost in nextUrl. The actual Host
    // header preserves the browser origin; APP_ORIGIN pins it for deployment.
    const expectedOrigin =
      process.env.APP_ORIGIN ||
      `${req.nextUrl.protocol}//${req.headers.get("host")}`;
    if (origin && new URL(origin).origin !== new URL(expectedOrigin).origin) {
      return response({ error: "طلب غير مسموح." }, 403);
    }
    if (!req.headers.get("content-type")?.includes("application/json"))
      return response({ error: "صيغة غير صحيحة." }, 415);
    const raw = await req.text();
    if (raw.length > 16000)
      return response({ error: "الطلب أكبر من المسموح." }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return response({ error: "بيانات غير صحيحة." }, 400);
    const action = (await params).action.join("/");
    const token = req.cookies.get(cookieName)?.value;
    const user = store.sessionUser(token);
    if (["register", "login", "student-login"].includes(action)) {
      store.rateLimit(
        action +
          ":" +
          String(body.email ?? body.username ?? "")
            .trim()
            .toLowerCase(),
      );
      const signed =
        action === "register"
          ? store.registerParent(body)
          : action === "login"
            ? store.loginParent(body.email, body.password)
            : store.loginChild(body.username, body.pin);
      if (!signed) return response({ error: "تعذّر تسجيل الدخول." }, 401);
      const res = response({ user: signed });
      res.cookies.set(cookieName, store.createSession(signed.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 7 * 86400,
      });
      return res;
    }
    if (action === "logout") {
      store.revokeSession(token);
      const res = response({ ok: true });
      res.cookies.delete(cookieName);
      return res;
    }
    if (action === "quiz") {
      if (!store.isPublished())
        return response({ error: "الدرس غير متاح حاليًا." }, 404);
      const answers = body.answers;
      if (
        user?.role !== "student" &&
        (!answers || typeof answers !== "object" || Array.isArray(answers))
      )
        return response({ error: "الإجابات غير صحيحة." }, 400);
      return response(
        user?.role === "student"
          ? store.submit(user.id, body)
          : { ...grade(body.answers), preview: true },
      );
    }
    if (action === "practice") {
      if (!store.isPublished())
        return response({ error: "الدرس غير متاح حاليًا." }, 404);
      return response(
        user?.role === "student"
          ? store.savePractice(user.id, body.answer)
          : { mode: "model_answer", feedback: modelReason },
      );
    }
    if (!user) return response({ error: "يلزم تسجيل الدخول." }, 401);
    if (action === "children")
      return response(store.createChild(user.id, body));
    if (action === "children/reset")
      return response(store.resetChildPin(user.id, body.childId, body.pin));
    if (action === "progress")
      return response(store.saveProgress(user.id, body));
    if (action === "admin/publish")
      return response(store.publish(user.id, body.published));
    return response({ error: "غير موجود." }, 404);
  } catch (error: unknown) {
    const e = error as Error & { status?: number };
    if (e instanceof SyntaxError)
      return response({ error: "بيانات غير صحيحة." }, 400);
    if (e.status) return response({ error: e.message }, e.status);
    console.error("API operation failed", e.name);
    return response({ error: "تعذّر إتمام الطلب. حاولي مجددًا." }, 500);
  }
}
