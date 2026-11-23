import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/db";
import { readJsonBody } from "@/server/http.mjs";
import { codex, evaluate } from "@/server/english-codex.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
async function request(req: NextRequest, ctx: Context) {
  const reply = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    const user = store.sessionUser(req.cookies.get("hana_session")?.value);
    const { action } = await ctx.params;
    if (action === "answer" && req.method === "POST") {
      const parsed = await readJsonBody(req);
      if (!parsed.ok) return reply({ error: parsed.error }, parsed.status);
      const body = parsed.body as {
        qid: string;
        answer: string;
        nonce: string;
      };
      if (user?.role !== "student") return reply(store.english.preview(body));
      const { attempt, created } = store.english.submit(user.id, body);
      return reply(
        created && attempt.source === "waiting"
          ? await evaluate(store.english, attempt)
          : attempt,
      );
    }
    if (!user) return reply({ error: "سجّل الدخول أولًا." }, 401);
    if (action === "history" && req.method === "GET")
      return reply(store.english.history(user.id));
    if (action === "reset" && req.method === "POST") {
      if (user.role !== "student")
        return reply({ error: "ابدأ من الأول من حساب الطالب." }, 403);
      const parsed = await readJsonBody(req);
      if (!parsed.ok) return reply({ error: parsed.error }, parsed.status);
      return reply(store.english.resetLesson(user.id, parsed.body.page));
    }
    if (action === "mascot" && req.method === "POST") {
      if (user.role !== "student")
        return reply({ error: "الطالب يقدر يختار شخصيته من حسابه." }, 403);
      const parsed = await readJsonBody(req);
      if (!parsed.ok) return reply({ error: parsed.error }, parsed.status);
      return reply(store.saveEnglishMascot(user.id, parsed.body.mascot));
    }
    if (user.role !== "admin")
      return reply({ error: "هذا الإجراء متاح للإدارة فقط." }, 403);
    if (req.method === "GET") {
      if (action === "status")
        return reply({
          connected: await codex.connected(),
          model: store.english.selected(),
          message: codex.loginMessage,
        });
      if (action === "models") return reply(await codex.models());
      if (action === "attempts") return reply(store.english.list(user.id));
    } else {
      const parsed = await readJsonBody(req);
      if (!parsed.ok) return reply({ error: parsed.error }, parsed.status);
      const body = parsed.body as Record<string, any>;
      if (action === "connect") {
        codex.loginMessage = "";
        const { verificationUrl, userCode, loginId } = await codex.call(
          "account/login/start",
          { type: "chatgptDeviceCode" },
        );
        return reply({ verificationUrl, userCode, loginId });
      }
      if (action === "cancel") {
        if (typeof body.loginId !== "string")
          return reply({ error: "رمز الربط غير صالح." }, 400);
        await codex.call("account/login/cancel", { loginId: body.loginId });
        return reply({ ok: true });
      }
      if (action === "disconnect") {
        await codex.call("account/logout");
        store.english.setModel(user.id, "");
        return reply({ ok: true });
      }
      if (action === "model") {
        if (
          typeof body.model !== "string" ||
          (body.model &&
            !(await codex.models()).some(
              (m: { id: string }) => m.id === body.model,
            ))
        )
          return reply({ error: "الموديل غير متاح." }, 400);
        store.english.setModel(user.id, body.model);
        return reply({ ok: true });
      }
      if (action === "review")
        return reply(store.english.review(user.id, body.id, body.score));
      if (action === "retry")
        return reply(
          await evaluate(store.english, store.english.retry(user.id, body.id)),
        );
    }
    return reply({ error: "غير متاح." }, 404);
  } catch (e) {
    const err = e as Error & { status?: number };
    return reply(
      { error: err.status ? err.message : "تعذّر إكمال الطلب." },
      err.status || 500,
    );
  }
}
export const GET = request;
export const POST = request;
