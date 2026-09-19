"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api, useSession } from "./providers";

const EASTERN = ["١", "٢", "٣", "٤", "٥", "٦"];
const GRADE_OPTIONS = [
  [2, "الصف الثاني"],
  [5, "الصف الخامس"],
  [8, "الصف الثامن"],
] as const;
type ChildDraft = {
  id: string;
  name: string;
  grade: string;
  gender: string;
  username: string;
  pin: string;
};
// A counter, not crypto.randomUUID(): that API is missing on plain-HTTP LAN
// origins, and these ids are only React keys.
let nextChildId = 0;
const emptyChild = (): ChildDraft => ({
  id: `child-${++nextChildId}`,
  name: "",
  grade: "",
  gender: "",
  username: "",
  pin: "",
});
const rowMotion = {
  duration: 0.25,
};

export function Auth({ initialMode = "login" }: { initialMode?: string }) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState(initialMode),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [children, setChildren] = useState<ChildDraft[]>([emptyChild()]),
    [showPins, setShowPins] = useState<Record<string, boolean>>({}),
    [focusTarget, setFocusTarget] = useState<"add" | string | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const { refresh } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget === "add") addBtnRef.current?.focus();
    else nameRefs.current.get(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget, children]);
  function switchMode(next: string) {
    setMode(next);
    setError("");
    setShow(false);
    setChildren([emptyChild()]);
    setShowPins({});
    setFocusTarget(null);
  }
  function updateChild(id: string, patch: Partial<ChildDraft>) {
    setChildren((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  function addChild() {
    const row = emptyChild();
    setChildren((rows) => [...rows, row]);
    setFocusTarget(row.id);
  }
  function removeChild(id: string) {
    setChildren((rows) => rows.filter((row) => row.id !== id));
    setShowPins((flags) => {
      const next = { ...flags };
      delete next[id];
      return next;
    });
    nameRefs.current.delete(id);
    setFocusTarget("add");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "register") {
        await api("register", {
          name: data.name,
          email: data.email,
          password: data.password,
          children: children.map((row) => ({
            name: row.name,
            grade: Number(row.grade),
            gender: row.gender,
            username: row.username,
            pin: row.pin,
          })),
        });
      } else {
        await api(mode === "student" ? "student-login" : mode, data);
      }
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
            التسجيل لولي الأمر والأبناء في خطوة واحدة، ويمكن إضافة المزيد
            لاحقًا.
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
              onClick={() => switchMode(value)}
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
            ? "إضافة الأبناء الآن، ولكلٍّ منهم حساب مستقل باسم مستخدم ورمز."
            : "ادخلي إلى مساحتك التعليمية."}
        </p>
        <form key={mode} onSubmit={submit}>
          {mode === "register" && (
            <p className="micro-copy">جميع الحقول مطلوبة.</p>
          )}
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
          {mode === "register" && (
            <fieldset className="children-set">
              <legend>الأبناء</legend>
              <AnimatePresence initial={false}>
                {children.map((row, index) => (
                  <motion.fieldset
                    key={row.id}
                    layout
                    className="child-row"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={rowMotion}
                  >
                    <legend>الطالب {EASTERN[index]}</legend>
                    <label className="field">
                      <span>اسم الطالب</span>
                      <input
                        required
                        maxLength={60}
                        value={row.name}
                        ref={(el) => {
                          if (el) nameRefs.current.set(row.id, el);
                          else nameRefs.current.delete(row.id);
                        }}
                        onChange={(e) =>
                          updateChild(row.id, { name: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>الصف</span>
                      <select
                        required
                        aria-label="الصف"
                        value={row.grade}
                        onChange={(e) =>
                          updateChild(row.id, { grade: e.target.value })
                        }
                      >
                        <option value="" disabled>
                          اختيار الصف
                        </option>
                        {GRADE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="gender-set">
                      <legend>الجنس</legend>
                      <div className="radio-row">
                        <label>
                          <input
                            type="radio"
                            name={`child-gender-${row.id}`}
                            value="male"
                            required
                            checked={row.gender === "male"}
                            onChange={() =>
                              updateChild(row.id, { gender: "male" })
                            }
                          />
                          ولد
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`child-gender-${row.id}`}
                            value="female"
                            checked={row.gender === "female"}
                            onChange={() =>
                              updateChild(row.id, { gender: "female" })
                            }
                          />
                          بنت
                        </label>
                      </div>
                    </fieldset>
                    <label className="field">
                      <span>اسم المستخدم</span>
                      <input
                        required
                        dir="ltr"
                        minLength={3}
                        maxLength={32}
                        autoComplete="off"
                        value={row.username}
                        onChange={(e) =>
                          updateChild(row.id, { username: e.target.value })
                        }
                      />
                      <small>حروف أو أرقام دون مسافات.</small>
                    </label>
                    <label className="field">
                      <span id={`child-pin-label-${row.id}`}>رمز الدخول</span>
                      <div className="password-field">
                        <input
                          required
                          aria-labelledby={`child-pin-label-${row.id}`}
                          type={showPins[row.id] ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]{6,12}"
                          minLength={6}
                          maxLength={12}
                          autoComplete="new-password"
                          value={row.pin}
                          onChange={(e) =>
                            updateChild(row.id, { pin: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() =>
                            setShowPins((flags) => ({
                              ...flags,
                              [row.id]: !flags[row.id],
                            }))
                          }
                          aria-label={
                            showPins[row.id]
                              ? `إخفاء رمز الطالب ${EASTERN[index]}`
                              : `إظهار رمز الطالب ${EASTERN[index]}`
                          }
                        >
                          {showPins[row.id] ? (
                            <EyeOff size={19} />
                          ) : (
                            <Eye size={19} />
                          )}
                        </button>
                      </div>
                      <small>٦–١٢ رقمًا. يُحفظ للطفل.</small>
                    </label>
                    <button
                      type="button"
                      className="text-link child-remove"
                      onClick={() => removeChild(row.id)}
                      aria-label={`إزالة الطالب ${EASTERN[index]}`}
                    >
                      <X size={16} /> إزالة
                    </button>
                  </motion.fieldset>
                ))}
              </AnimatePresence>
              {children.length < 6 && (
                <motion.button
                  type="button"
                  className="button outline small"
                  ref={addBtnRef}
                  whileTap={{ scale: reduceMotion ? 1 : 0.97 }}
                  onClick={addChild}
                >
                  <Plus size={16} /> إضافة ابن/ابنة
                </motion.button>
              )}
            </fieldset>
          )}
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
              onClick={() =>
                switchMode(mode === "register" ? "login" : "register")
              }
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
