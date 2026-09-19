"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  LoaderCircle,
} from "lucide-react";
import { api, useSession } from "./providers";
export function Auth({ initialMode = "login" }: { initialMode?: string }) {
  const [mode, setMode] = useState(initialMode),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const { refresh } = useSession();
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(mode === "student" ? "student-login" : mode, data);
      await refresh();
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container auth-layout">
      <div className="auth-story">
        <span className="eyebrow">مساحة تنمو معك</span>
        <h1>
          فضولك يستحق
          <br />
          <span>مكانًا خاصًا.</span>
        </h1>
        <p>
          احتفظي باكتشافاتك، وتابعي تقدّمك،
          <br />
          وعودي لتكملي الرحلة من حيث توقّفتِ.
        </p>
        <div className="auth-book">
          <BookOpen size={110} strokeWidth={1.1} />
          <span>
            <Check size={23} />
          </span>
        </div>
        <div className="auth-promise">
          <ShieldCheck size={24} />
          <p>
            ولي الأمر ينشئ الحساب ويضيف أبناءه.
            <br />
            لا يحتاج الطفل إلى بريد إلكتروني.
          </p>
        </div>
      </div>
      <div className="auth-card">
        <div className="segmented" role="group" aria-label="نوع الحساب">
          {(
            [
              ["login", "ولي الأمر"],
              ["student", "الطالب"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={(mode === "register" ? "login" : mode) === value}
              data-state={
                (mode === "register" ? "login" : mode) === value
                  ? "active"
                  : "inactive"
              }
              onClick={() => {
                setMode(value);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <h2>
          {mode === "register"
            ? "لنبدأ رحلتكم معًا"
            : mode === "student"
              ? "أهلًا بالمستكشفة!"
              : "أهلًا بعودتك"}
        </h2>
        <p>
          {mode === "register"
            ? "حساب واحد لمتابعة رحلة أبنائك."
            : "ادخلي إلى مساحتك التعليمية."}
        </p>
        <form key={mode} onSubmit={submit}>
          {mode === "register" && (
            <label className="field">
              <span>اسم ولي الأمر</span>
              <input required name="name" maxLength={60} autoComplete="name" />
            </label>
          )}
          {mode === "student" ? (
            <label className="field">
              <span>اسم مستخدم الطالب</span>
              <input
                name="username"
                required
                minLength={3}
                maxLength={32}
                autoComplete="username"
              />
            </label>
          ) : (
            <label className="field">
              <span>البريد الإلكتروني</span>
              <input
                required
                name="email"
                type="email"
                maxLength={200}
                autoComplete="email"
                dir="ltr"
              />
            </label>
          )}
          <label className="field">
            <span id="auth-secret-label">
              {mode === "student" ? "رمز الدخول" : "كلمة المرور"}
            </span>
            <div className="password-field">
              <input
                required
                aria-labelledby="auth-secret-label"
                aria-describedby={
                  mode === "register" ? "auth-secret-hint" : undefined
                }
                name={mode === "student" ? "pin" : "password"}
                type={show ? "text" : "password"}
                inputMode={mode === "student" ? "numeric" : undefined}
                minLength={
                  mode === "student" ? 6 : mode === "register" ? 10 : 1
                }
                maxLength={mode === "student" ? 12 : 128}
                pattern={mode === "student" ? "[0-9]{6,12}" : undefined}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShow(!show)}
                aria-label={show ? "إخفاء الرمز" : "إظهار الرمز"}
              >
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {mode === "register" && (
              <small id="auth-secret-hint">
                عشرة أحرف على الأقل. اختاري كلمة مرور يصعب تخمينها.
              </small>
            )}
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <ArrowLeft size={18} />
            )}{" "}
            {busy
              ? "جارٍ الدخول…"
              : mode === "register"
                ? "إنشاء الحساب"
                : "دخول إلى مساحتي"}
          </button>
        </form>
        {mode !== "student" && (
          <p className="auth-switch">
            {mode === "register" ? "لديك حساب بالفعل؟" : "أول زيارة لك؟"}{" "}
            <button
              className="text-link"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
              }}
            >
              {mode === "register" ? "تسجيل الدخول" : "إنشاء حساب ولي أمر"}
            </button>
          </p>
        )}
        {mode === "student" && (
          <p className="micro-copy">
            نسيتِ الرمز؟ يستطيع ولي أمرك تغييره من لوحة المتابعة.
          </p>
        )}
        <div className="auth-local-note">
          نسخة محلية أولى. الحسابات تُحفظ على هذا الخادم. خدمة التحقق واستعادة
          بريد ولي الأمر لم تُربط بعد.
        </div>
        <Link href="/grade/8/science" className="text-link">
          أستكشف الدروس أولًا <ArrowLeft size={16} />
        </Link>
      </div>
    </section>
  );
}
