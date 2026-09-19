"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Plus,
  LogOut,
  Users,
  Trophy,
  Settings2,
  Leaf,
  KeyRound,
} from "lucide-react";
import { api, useSession, User } from "./providers";
import { VideoCarousel } from "./video-carousel";
import { Result, ResultDetails } from "./quiz";
import { lessonPath } from "@/content/curriculum";
type ChildData = {
  user: User;
  progress: { sections: string[] };
  attempts: Result[];
  practice: { answer: string; feedback: string; createdAt: number }[];
};
type Snapshot = {
  user: User;
  children?: ChildData[];
  progress?: { sections: string[] };
  attempts?: Result[];
  practice?: ChildData["practice"];
  stats?: { parents: number; students: number; attempts: number };
  published?: boolean;
};
export function Dashboard({ initial }: { initial: Snapshot }) {
  const [data, setData] = useState(initial),
    [adding, setAdding] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const { refresh } = useSession(),
    router = useRouter();
  const user = data.user;
  async function reload() {
    setData(await api("dashboard"));
  }
  async function logout() {
    setBusy(true);
    try {
      await api("logout", {});
      await refresh();
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("children", Object.fromEntries(new FormData(e.currentTarget)));
      setAdding(false);
      setNotice("أُضيف ملف الطالب. احفظي اسم المستخدم والرمز للدخول.");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const children = data.children || [];
  const student = data as ChildData;
  return (
    <section className="container dashboard section">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            {user.role === "admin"
              ? "لوحة الإدارة"
              : user.role === "parent"
                ? "مساحة الأسرة"
                : "مساحتي التعليمية"}
          </span>
          <h1>
            أهلًا، {user.name}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {user.role === "parent"
              ? "صورة أوضح لكل خطوة يخطوها أبناؤك."
              : user.role === "admin"
                ? "المحتوى والطلاب، في مكان واحد."
                : "اكتشاف جديد ينتظرك اليوم."}
          </p>
        </div>
        <button
          onClick={logout}
          disabled={busy}
          className="button outline small"
        >
          <LogOut size={17} /> خروج
        </button>
      </div>
      {notice && (
        <p className="feedback success" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {user.role === "parent" && (
        <>
          <div className="dashboard-stats">
            <Stat icon={Users} value={children.length} label="ملفات الأبناء" />
            <Stat
              icon={Trophy}
              value={children.reduce((n, c) => n + c.attempts.length, 0)}
              label="محاولات محفوظة"
            />
            <Stat icon={BookOpen} value={1} label="درس متاح في أول نسخة" />
          </div>
          <div className="section-heading">
            <h2>رحلات أبنائك</h2>
            <button
              className="button primary small"
              onClick={() => {
                setAdding(!adding);
                setError("");
              }}
            >
              <Plus size={18} />
              {adding ? "إغلاق النموذج" : "إضافة طالب"}
            </button>
          </div>
          {adding && (
            <form className="child-form panel" onSubmit={add}>
              <h3>ملف جديد، بداية جديدة</h3>
              <p className="micro-copy">جميع الحقول مطلوبة.</p>
              <div className="form-grid">
                <label className="field">
                  <span>اسم الطالب</span>
                  <input required name="name" maxLength={60} />
                </label>
                <label className="field">
                  <span>الصف</span>
                  <select
                    required
                    name="grade"
                    defaultValue=""
                    aria-label="الصف"
                  >
                    <option value="" disabled>
                      اختيار الصف
                    </option>
                    <option value="2">الصف الثاني</option>
                    <option value="5">الصف الخامس</option>
                    <option value="8">الصف الثامن</option>
                  </select>
                </label>
                <fieldset className="gender-set">
                  <legend>الجنس</legend>
                  <div className="radio-row">
                    <label>
                      <input type="radio" name="gender" value="male" required />
                      ولد
                    </label>
                    <label>
                      <input type="radio" name="gender" value="female" />
                      بنت
                    </label>
                  </div>
                </fieldset>
                <label className="field">
                  <span>اسم المستخدم للدخول</span>
                  <input
                    required
                    name="username"
                    aria-label="اسم المستخدم للدخول"
                    minLength={3}
                    maxLength={32}
                    autoComplete="off"
                  />
                  <small>حروف أو أرقام دون مسافات.</small>
                </label>
                <label className="field">
                  <span>رمز الدخول</span>
                  <input
                    required
                    name="pin"
                    aria-label="رمز الدخول"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{6,12}"
                    minLength={6}
                    maxLength={12}
                    autoComplete="new-password"
                  />
                  <small>٦–١٢ رقمًا. يُحفظ للطفل.</small>
                </label>
              </div>
              <p className="micro-copy">
                لكل طالب صف وجنس محفوظان. المحتوى المتاح حاليًا: علوم الصف
                الثامن.
              </p>
              <button className="button primary" disabled={busy}>
                {busy ? "جارٍ الإضافة…" : "حفظ ملف الطالب"}
              </button>
            </form>
          )}
          {!children.length && !adding && (
            <div className="empty-state">
              <Users size={40} />
              <h3>لنبدأ بأول مستكشف في أسرتك</h3>
              <p>أضيفي ملفًا للطفل، وسيكون له حساب وتقدّم مستقل.</p>
              <button
                className="button primary"
                onClick={() => setAdding(true)}
              >
                إضافة أول طالب <Plus size={18} />
              </button>
            </div>
          )}
          {children.map((c) => (
            <ChildPanel key={c.user.id} child={c} />
          ))}
          <VideoCarousel lessonId="platform" title="دليل استخدام مدارك" />
        </>
      )}
      {user.role === "student" && (
        <>
          <div className="dashboard-stats">
            <Stat
              icon={CheckCircle2}
              value={student.progress?.sections.length || 0}
              label="مقاطع أنجزتِها من ٤"
            />
            <Stat
              icon={Trophy}
              value={Math.max(0, ...student.attempts.map((a) => a.score)) + "٪"}
              label="أفضل درجة مسجلة"
            />
            <Stat
              icon={FlaskConical}
              value={student.attempts.length}
              label="محاولات اختبار"
            />
          </div>
          <div className="continue-card">
            <span className="unit-icon">
              <Leaf size={36} />
            </span>
            <div>
              <span className="eyebrow">علوم الحياة · المغذّيات</span>
              <h2>
                {student.progress.sections.length
                  ? "لنُكمل الاكتشاف"
                  : "جاهزة لأول اكتشاف؟"}
              </h2>
              <p>الطعام أكثر من طعم لذيذ… لنكتشف ما يفعله في جسمك.</p>
            </div>
            <Link
              href={
                lessonPath +
                "#" +
                (["map", "explore", "practice", "quiz"].find(
                  (s) => !student.progress.sections.includes(s),
                ) || "quiz")
              }
              className="button primary"
            >
              {student.progress.sections.length
                ? "استكملي الدرس"
                : "ابدئي الدرس"}
              <ArrowLeft size={18} />
            </Link>
          </div>
          <History attempts={student.attempts} />
          <VideoCarousel lessonId="platform" title="كيف تستخدمين مدارك؟" />
        </>
      )}
      {user.role === "admin" && (
        <div className="panel admin-panel">
          <Settings2 size={30} />
          <h2>إدارة المنصة</h2>
          <p>المستخدمون، إعدادات الخدمات، نشر المحتوى، وسجل التغييرات.</p>
          <Link href="/admin" className="button primary">
            فتح لوحة الإدارة <ArrowLeft size={18} />
          </Link>
        </div>
      )}
    </section>
  );
}
function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string | number;
  label: string;
}) {
  return (
    <div className="stat-card">
      <Icon size={25} />
      <b>{typeof value === "number" ? value.toLocaleString("ar-KW") : value}</b>
      <span>{label}</span>
    </div>
  );
}
function ChildPanel({ child }: { child: ChildData }) {
  const [resetting, setResetting] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("children/reset", {
        childId: child.user.id,
        pin: new FormData(e.currentTarget).get("pin"),
      });
      setMessage("تم تغيير رمز الدخول وإنهاء الجلسات القديمة.");
      setResetting(false);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const last = child.attempts[0];
  return (
    <article className="child-panel panel">
      <header>
        <span className="avatar">{child.user.name.slice(0, 1)}</span>
        <div>
          <h3>{child.user.name}</h3>
          <p>
            {[
              child.user.grade === 2
                ? "الصف الثاني"
                : child.user.grade === 5
                  ? "الصف الخامس"
                  : child.user.grade === 8
                    ? "الصف الثامن"
                    : "",
              child.user.gender === "male"
                ? "ولد"
                : child.user.gender === "female"
                  ? "بنت"
                  : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            {child.user.grade || child.user.gender ? " · " : ""}
            اسم الدخول: <bdi>{child.user.username}</bdi>
          </p>
        </div>
        <span className="pill green">
          {child.progress.sections.length} / ٤ مقاطع
        </span>
      </header>
      <div className="child-progress">
        <span
          style={{ width: `${(child.progress.sections.length / 4) * 100}%` }}
        />
      </div>
      <div className="child-summary">
        <p>
          <b>آخر درجة:</b> {last ? last.score + "٪" : "لا توجد محاولة بعد"}
        </p>
        <p>
          <b>أفضل درجة:</b>{" "}
          {child.attempts.length
            ? Math.max(...child.attempts.map((a) => a.score)) + "٪"
            : "لم يبدأ الاختبار"}
        </p>
      </div>
      {last && last.review.length > 0 && (
        <div className="review-box">
          <b>موضوعات للمراجعة من آخر محاولة</b>
          <div className="feature-tags">
            {last.review.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      )}
      <History attempts={child.attempts} />
      {child.practice.length > 0 && (
        <details className="practice-history">
          <summary>إجابات تدريب «علّلي» ({child.practice.length})</summary>
          {child.practice.map((p, i) => (
            <div key={i}>
              <p>
                <b>إجابة الطالب:</b> {p.answer}
              </p>
              <p>
                <b>النموذج المعروض:</b> {p.feedback}
              </p>
              <small>
                تدريب دون درجة ·{" "}
                {new Date(p.createdAt).toLocaleDateString("ar-KW")}
              </small>
            </div>
          ))}
        </details>
      )}
      <button className="text-link" onClick={() => setResetting(!resetting)}>
        <KeyRound size={17} /> تغيير رمز دخول الطفل
      </button>
      {resetting && (
        <form onSubmit={reset} className="pin-reset">
          <label className="field">
            <span>رمز جديد من ٦–١٢ رقمًا</span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6,12}"
              required
              minLength={6}
              maxLength={12}
            />
          </label>
          <button className="button outline small" disabled={busy}>
            حفظ الرمز
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </article>
  );
}
function History({ attempts }: { attempts: Result[] }) {
  return (
    <section className="history">
      <h3>سجل المحاولات</h3>
      {!attempts.length ? (
        <p className="muted-text">
          لا توجد محاولات حتى الآن. ستظهر هنا بعد تسليم الاختبار بحساب الطالب.
        </p>
      ) : (
        attempts.map((a, i) => (
          <details className="attempt" key={a.id || i}>
            <summary>
              <span>
                <Trophy size={18} /> المغذّيات{" "}
                <small>
                  {new Date(a.createdAt || Date.now()).toLocaleString("ar-KW", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </small>
              </span>
              <b>{a.score}٪</b>
            </summary>
            <ResultDetails result={a} />
          </details>
        ))
      )}
    </section>
  );
}
