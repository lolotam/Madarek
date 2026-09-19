import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { publicQuestions, grade, modelReason } from "@/server/questions.mjs";
import { signAudioGrant } from "@/server/audio/grant.mjs";
import { isSecureRequest, readJsonBody } from "@/server/http.mjs";
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
  try {
    const action = (await params).action.join("/");
    const user = store.sessionUser(req.cookies.get(cookieName)?.value);
    if (action === "session") return response({ user });
    if (action === "quiz")
      return store.isPublished()
        ? response({ questions: publicQuestions() })
        : response({ error: "الدرس غير متاح حاليًا." }, 404);
    if (action === "videos")
      return response({
        videos: store.publishedVideos(
          req.nextUrl.searchParams.get("lesson") || "",
        ),
      });
    if (action === "dashboard") {
      if (!user) return response({ error: "يلزم تسجيل الدخول." }, 401);
      return response(store.snapshot(user.id));
    }
    if (action.startsWith("admin/")) {
      if (!user) return response({ error: "يلزم تسجيل الدخول." }, 401);
      const q = req.nextUrl.searchParams.get("q") || "";
      const page = req.nextUrl.searchParams.get("page") || "1";
      if (action === "admin/users")
        return response(store.listAdminUsers(user.id, { q, page }));
      if (action === "admin/settings")
        return response(store.getAdminSettings(user.id));
      if (action === "admin/audit")
        return response(store.listAdminAudit(user.id));
      if (action === "admin/videos")
        return response(store.listLessonVideos(user.id));
    }
    return response({ error: "غير موجود." }, 404);
  } catch (error: unknown) {
    const e = error as Error & { status?: number };
    if (e.status) return response({ error: e.message }, e.status);
    console.error("API operation failed", e.name);
    return response({ error: "تعذّر إتمام الطلب. حاولي مجددًا." }, 500);
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return response({ error: parsed.error }, parsed.status);
    const body = parsed.body as any;
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
          ? store.registerFamily(body)
          : action === "login"
            ? store.loginParent(body.email, body.password)
            : store.loginChild(body.username, body.pin);
      if (!signed) return response({ error: "تعذّر تسجيل الدخول." }, 401);
      const res = response({ user: signed });
      res.cookies.set(cookieName, store.createSession(signed.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: isSecureRequest(req),
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
          ? { ...store.submit(user.id, body), audioGrant: signAudioGrant() }
          : {
              ...grade(body.answers),
              preview: true,
              audioGrant: signAudioGrant(),
            },
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
    if (action === "admin/users/update")
      return response(store.updateAdminUser(user.id, body));
    if (action === "admin/users/reset-secret")
      return response(store.resetAdminSecret(user.id, body));
    if (action === "admin/users/disable")
      return response(store.setUserDisabled(user.id, body));
    if (action === "admin/users/delete")
      return response(store.deleteFamily(user.id, body));
    if (action === "admin/families")
      return response(store.createAdminFamily(user.id, body));
    if (action === "admin/settings")
      return response(store.saveAdminSettings(user.id, body));
    if (action === "admin/videos/save")
      return response(store.saveLessonVideo(user.id, body));
    if (action === "admin/videos/delete")
      return response(store.deleteLessonVideo(user.id, body));
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
