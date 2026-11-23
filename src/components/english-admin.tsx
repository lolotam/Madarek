"use client";
import { useEffect, useState } from "react";
import { api } from "./providers";
import {
  GradeDetails,
  markText,
  markSource,
  type EnglishAttempt,
} from "./english-lesson";
type Model = { id: string; name: string; hidden: boolean };
export function EnglishAdmin() {
  const [rows, setRows] = useState<EnglishAttempt[]>([]),
    [models, setModels] = useState<Model[]>([]);
  const [connected, setConnected] = useState(false),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState("");
  const [device, setDevice] = useState<{
    verificationUrl: string;
    userCode: string;
    loginId: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function history() {
    setRows(await api("english/attempts"));
  }
  async function status() {
    const s = await api("english/status");
    setConnected(s.connected);
    setSelected(s.model);
    setDraft(s.model);
    if (s.message) {
      setNotice(s.message);
      setDevice(null);
    }
    if (s.connected) {
      setDevice(null);
      setModels(await api("english/models"));
    } else setModels([]);
  }
  async function run(job: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await job();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    history().catch((e) => setNotice(e.message));
    status().catch((e) => setNotice(e.message));
  }, []);
  useEffect(() => {
    if (!device) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        await status();
      } catch (e) {
        if (!stopped) setNotice((e as Error).message);
      }
      if (!stopped) timer = setTimeout(poll, 3500);
    }
    timer = setTimeout(poll, 3500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [device]);
  return (
    <section className="school-admin">
      <h2 lang="en" dir="ltr">
        AI Settings
      </h2>
      <section className="panel">
        <h2>حساب ChatGPT للتصحيح</h2>
        <p>
          {connected ? "الحساب متصل." : "اربط حساب وليّ الأمر لتقييم الكتابة."}
        </p>
        <div className="actions">
          {connected ? (
            <button
              disabled={busy}
              className="button outline"
              onClick={() =>
                run(async () => {
                  await api("english/disconnect", {});
                  await status();
                })
              }
            >
              فصل الحساب
            </button>
          ) : (
            <button
              className="button primary"
              disabled={busy || !!device}
              onClick={() =>
                run(async () => {
                  setDevice(await api("english/connect", {}));
                })
              }
            >
              ربط ChatGPT عبر Codex
            </button>
          )}
          <button
            disabled={busy}
            className="button outline"
            onClick={() => run(status)}
          >
            تحديث الاتصال
          </button>
        </div>
        {device && (
          <p>
            افتح صفحة OpenAI وأدخل الرمز{" "}
            <strong dir="ltr">{device.userCode}</strong>{" "}
            <a
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
              href={device.verificationUrl}
            >
              متابعة الربط
            </a>{" "}
            <button
              className="text-link"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("english/cancel", { loginId: device.loginId });
                  setDevice(null);
                })
              }
            >
              إلغاء الربط الجاري
            </button>
          </p>
        )}
        {connected && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api("english/model", { model: draft });
                setSelected(draft);
                setNotice("تم حفظ إعداد التقييم.");
              });
            }}
          >
            <p>موديلات الحساب · {models.length.toLocaleString("ar")}</p>
            <label className="field">
              موديل تقييم الكتابة
              <select value={draft} onChange={(e) => setDraft(e.target.value)}>
                <option value="">التصحيح المحلي ومراجعة المدرّسة</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.id}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary>عرض كل الموديلات ومعرّفاتها</summary>
              <ul>
                {models.map((m) => (
                  <li key={m.id}>
                    <bdi>{m.name}</bdi> · <code dir="ltr">{m.id}</code>
                  </li>
                ))}
              </ul>
            </details>
            <p>
              بتفعيل موديل، تُرسل كلمات الإجابة الإنجليزية للتقييم بعد فحص
              التفاصيل الشخصية. يظل اسم الطالب وسجل محاولاته في مدارك.
            </p>
            <button
              className="button primary"
              disabled={busy || draft === selected}
            >
              حفظ الموديل
            </button>
          </form>
        )}
      </section>
      {notice && <p role="status">{notice}</p>}
      <section className="panel">
        <h2>محاولات الطلاب</h2>
        <button
          className="button outline small"
          onClick={() => run(history)}
          disabled={busy}
        >
          تحديث السجل
        </button>
        {!rows.length && <p>ستظهر هنا الإجابات بعد أول محاولة.</p>}
        {rows.map((r) => (
          <details key={r.id}>
            <summary>
              {r.name} · سؤال <bdi>{r.qid}</bdi> · {markText(r)}
            </summary>
            <p dir="ltr" lang="en">
              {r.prompt}
            </p>
            <p>
              الإجابة · <bdi>{r.answerText ?? r.answer}</bdi>
            </p>
            <GradeDetails row={r} />
            <p>
              {r.feedback} · {markSource(r.source)}{" "}
              {r.model && <bdi>{r.model}</bdi>}
            </p>
            <p>{new Date(r.created_at).toLocaleString("ar")}</p>
            <form
              className="actions"
              onSubmit={(e) => {
                e.preventDefault();
                const score = Number(
                  new FormData(e.currentTarget).get("score"),
                );
                run(async () => {
                  await api("english/review", { id: r.id, score });
                  await history();
                });
              }}
            >
              <label>
                درجة المدرّسة{" "}
                <input
                  required
                  type="number"
                  name="score"
                  min="0"
                  max="100"
                  defaultValue={r.score ?? ""}
                />
              </label>
              <button disabled={busy} className="button outline small">
                حفظ الدرجة
              </button>
              {selected &&
                (r.source === "review" ||
                  r.source === "waiting" ||
                  r.source === "fallback") && (
                  <button
                    type="button"
                    disabled={busy}
                    className="button outline small"
                    onClick={() =>
                      run(async () => {
                        await api("english/retry", { id: r.id });
                        await history();
                      })
                    }
                  >
                    إعادة التقييم بالموديل
                  </button>
                )}
            </form>
          </details>
        ))}
      </section>
    </section>
  );
}
