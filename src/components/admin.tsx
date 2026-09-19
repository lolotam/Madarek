"use client";
import { FormEvent, useEffect, useId, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldOff,
  ShieldCheck,
  ScrollText,
  Trash2,
  Users,
  Volume2,
} from "lucide-react";
import { api } from "./providers";
import { Dialog } from "./ui/dialog";
import { sciencePath } from "@/content/curriculum";

export type AdminPerson = {
  id: string;
  name: string;
  role: "parent" | "student" | "admin";
  email: string | null;
  username: string | null;
  parentId: string | null;
  grade: number | null;
  gender: "male" | "female" | null;
  createdAt: number;
  disabledAt: number | null;
  attemptCount: number;
};
export type UserList = {
  page: number;
  pageSize: number;
  total: number;
  items: Array<
    | { kind: "family"; parent: AdminPerson; children: AdminPerson[] }
    | { kind: "admin"; user: AdminPerson }
  >;
};
export type SettingsView = {
  encryption: { ready: boolean; message: string | null };
  elevenlabs_voice_id: string;
  elevenlabs_model_id: string;
  elevenlabs_max_characters: number | null;
  apiKey: {
    configured: boolean;
    source: "database" | "env" | "none";
    last4: string | null;
    unreadable?: boolean;
  };
};
export type AuditView = {
  entries: {
    id: string;
    adminId: string;
    adminName: string | null;
    action: string;
    targetUserId: string | null;
    detail: unknown;
    createdAt: number;
  }[];
};
type Snapshot = {
  user: { id: string; name: string; role: string };
  stats?: { parents: number; students: number; attempts: number };
  published?: boolean;
};

const GRADE_LABEL: Record<number, string> = {
  2: "الصف الثاني",
  5: "الصف الخامس",
  8: "الصف الثامن",
};
const ROLE_LABEL: Record<AdminPerson["role"], string> = {
  parent: "ولي أمر",
  student: "طالب",
  admin: "إدارة",
};
const ACTION_LABEL: Record<string, string> = {
  "users.update": "تعديل حساب",
  "users.reset-secret": "إعادة ضبط كلمة المرور أو الرمز",
  "users.disable": "تعطيل حساب",
  "users.enable": "تفعيل حساب",
  "families.create": "إنشاء أسرة",
  "families.delete": "حذف أسرة",
  "settings.update": "تحديث إعدادات الخدمات",
  "content.publish": "تحديث نشر الدرس",
};

function formatDate(value: number) {
  return new Date(value).toLocaleString("ar-KW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Notice({
  kind,
  id,
  children,
}: {
  kind: "error" | "success";
  id?: string;
  children: string;
}) {
  if (!children) return null;
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <p
      id={id}
      className={kind === "error" ? "form-error" : "feedback success"}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon size={18} />
      {children}
    </p>
  );
}

export function AdminDashboard({
  selfId,
  initialUsers,
  initialSettings,
  initialAudit,
  initialSnapshot,
}: {
  selfId: string;
  initialUsers: UserList;
  initialSettings: SettingsView;
  initialAudit: AuditView;
  initialSnapshot: Snapshot;
}) {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState("users");
  return (
    <section className="container admin-page section">
      <header className="admin-heading">
        <div>
          <span className="eyebrow">مساحة الإدارة</span>
          <h1>
            لوحة الإدارة
            <span className="title-dot">.</span>
          </h1>
          <p>حسابات الأسر، إعدادات الخدمات، نشر المحتوى، وسجل التغييرات.</p>
        </div>
        <Link href="/admin/audio" className="button outline small">
          <Volume2 size={18} />
          مراجعة الصوت
        </Link>
      </header>
      <Tabs.Root dir="rtl" value={tab} onValueChange={setTab}>
        <Tabs.List className="admin-tabs" aria-label="أقسام الإدارة">
          <Tabs.Trigger value="users">
            {tab === "users" ? (
              <motion.span
                className="admin-tab-ink"
                layoutId={reduceMotion ? undefined : "admin-tab-ink"}
              />
            ) : null}
            <Users size={18} /> المستخدمون
          </Tabs.Trigger>
          <Tabs.Trigger value="settings">
            {tab === "settings" ? (
              <motion.span
                className="admin-tab-ink"
                layoutId={reduceMotion ? undefined : "admin-tab-ink"}
              />
            ) : null}
            <Settings2 size={18} /> إعدادات الخدمات
          </Tabs.Trigger>
          <Tabs.Trigger value="content">
            {tab === "content" ? (
              <motion.span
                className="admin-tab-ink"
                layoutId={reduceMotion ? undefined : "admin-tab-ink"}
              />
            ) : null}
            <BookOpen size={18} /> المحتوى
          </Tabs.Trigger>
          <Tabs.Trigger value="audit">
            {tab === "audit" ? (
              <motion.span
                className="admin-tab-ink"
                layoutId={reduceMotion ? undefined : "admin-tab-ink"}
              />
            ) : null}
            <ScrollText size={18} /> السجل
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="users">
          <h2 className="sr-only">المستخدمون</h2>
          <UsersTab selfId={selfId} initial={initialUsers} />
        </Tabs.Content>
        <Tabs.Content value="settings">
          <h2 className="sr-only">إعدادات الخدمات</h2>
          <SettingsTab initial={initialSettings} />
        </Tabs.Content>
        <Tabs.Content value="content">
          <h2 className="sr-only">المحتوى</h2>
          <ContentTab initial={initialSnapshot} />
        </Tabs.Content>
        <Tabs.Content value="audit">
          <h2 className="sr-only">السجل</h2>
          <AuditTab initial={initialAudit} />
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}

function UsersTab({ selfId, initial }: { selfId: string; initial: UserList }) {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const searchErrorId = useId();

  async function load(page = 1, q = query) {
    setBusy(true);
    setError("");
    try {
      const next = await api(
        `admin/users?q=${encodeURIComponent(q)}&page=${page}`,
      );
      setData(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load(1, query);
  }

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={onSearch}>
          <label className="field" htmlFor="admin-user-search">
            <span>بحث بالاسم أو البريد أو اسم المستخدم</span>
            <input
              id="admin-user-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={200}
              aria-describedby={error ? searchErrorId : undefined}
            />
          </label>
          <button className="button primary small" disabled={busy}>
            <Search size={18} />
            {busy ? "جارٍ البحث…" : "بحث"}
          </button>
        </form>
        <button
          className="button outline small"
          type="button"
          onClick={() => {
            setCreating(true);
            setError("");
          }}
        >
          <Plus size={18} /> إنشاء أسرة
        </button>
      </div>
      <Notice kind="error" id={searchErrorId}>
        {error}
      </Notice>
      <Notice kind="success">{notice}</Notice>
      <p className="sr-only" role="status">
        {busy ? "جارٍ تحميل المستخدمين" : `${data.total} نتيجة`}
      </p>
      {!data.items.length && !busy ? (
        <div className="empty-state">
          <Users size={40} />
          <h3>لا توجد أسر مطابقة</h3>
          <p>جرّبي بحثًا آخر أو أنشئي أسرة جديدة من لوحة الإدارة.</p>
          <button className="button primary" onClick={() => setCreating(true)}>
            إنشاء أسرة <Plus size={18} />
          </button>
        </div>
      ) : (
        <motion.ul
          className="admin-family-list"
          variants={{
            show: {
              transition: { staggerChildren: reduceMotion ? 0 : 0.05 },
            },
          }}
          initial="hidden"
          animate="show"
          aria-busy={busy}
        >
          {data.items.map((item) => {
            const people =
              item.kind === "admin"
                ? [item.user]
                : [item.parent, ...item.children];
            const heading =
              item.kind === "admin" ? item.user.name : item.parent.name;
            return (
              <motion.li
                key={item.kind === "admin" ? item.user.id : item.parent.id}
                className="panel family-card"
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
                  show: { opacity: 1, y: 0 },
                }}
                layout
              >
                <h3>{heading}</h3>
                <p className="micro-copy">
                  {item.kind === "admin"
                    ? "حساب إدارة"
                    : `أسرة · ${item.children.length} من الأبناء`}
                </p>
                <ul className="person-stack">
                  {people.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      selfId={selfId}
                      onBusy={setBusy}
                      onError={setError}
                      onNotice={setNotice}
                      onReload={() => load(data.page)}
                    />
                  ))}
                </ul>
                {item.kind === "family" ? (
                  <DeleteFamilyButton
                    parent={item.parent}
                    busy={busy}
                    onBusy={setBusy}
                    onError={setError}
                    onNotice={setNotice}
                    onReload={() => load(data.page)}
                  />
                ) : null}
              </motion.li>
            );
          })}
        </motion.ul>
      )}
      {pages > 1 ? (
        <nav className="admin-pagination" aria-label="صفحات المستخدمين">
          <button
            className="button outline small"
            type="button"
            disabled={busy || data.page <= 1}
            onClick={() => load(data.page - 1)}
          >
            <ChevronRight size={18} /> السابق
          </button>
          <p>
            صفحة {data.page.toLocaleString("ar-KW")} من{" "}
            {pages.toLocaleString("ar-KW")}
          </p>
          <button
            className="button outline small"
            type="button"
            disabled={busy || data.page >= pages}
            onClick={() => load(data.page + 1)}
          >
            التالي <ChevronLeft size={18} />
          </button>
        </nav>
      ) : null}
      <CreateFamilyDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={() => {
          setNotice("أُنشئت الأسرة ويمكن لأفرادها تسجيل الدخول.");
          setCreating(false);
          load(1);
        }}
      />
    </div>
  );
}

function PersonRow({
  person,
  selfId,
  onBusy,
  onError,
  onNotice,
  onReload,
}: {
  person: AdminPerson;
  selfId: string;
  onBusy: (v: boolean) => void;
  onError: (v: string) => void;
  onNotice: (v: string) => void;
  onReload: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [reset, setReset] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const isSelf = person.id === selfId;
  const gender =
    person.gender === "male" ? "ولد" : person.gender === "female" ? "بنت" : "";
  return (
    <li className={"person-row" + (person.disabledAt ? " is-disabled" : "")}>
      <div>
        <strong>{person.name}</strong>
        <p>
          {ROLE_LABEL[person.role]}
          {person.grade ? ` · ${GRADE_LABEL[person.grade]}` : ""}
          {gender ? ` · ${gender}` : ""}
          {person.email ? ` · ${person.email}` : ""}
          {person.username ? (
            <>
              {" "}
              · <bdi>{person.username}</bdi>
            </>
          ) : null}
          {` · ${formatDate(person.createdAt)}`}
          {person.role === "student"
            ? ` · ${person.attemptCount.toLocaleString("ar-KW")} محاولات`
            : ""}
        </p>
      </div>
      <div className="person-flags">
        <span className={"pill " + (person.disabledAt ? "muted" : "green")}>
          {person.disabledAt ? "معطّل" : "مفعّل"}
        </span>
      </div>
      <div className="person-actions">
        <button
          type="button"
          className="button outline small"
          onClick={() => setEdit(true)}
        >
          <Pencil size={16} /> تعديل
        </button>
        <button
          type="button"
          className="button outline small"
          onClick={() => setReset(true)}
        >
          <KeyRound size={16} />
          {person.role === "student" ? "إعادة ضبط الرمز" : "كلمة مرور جديدة"}
        </button>
        {!isSelf ? (
          <button
            type="button"
            className="button outline small"
            onClick={() => setDisableOpen(true)}
          >
            {person.disabledAt ? (
              <ShieldCheck size={16} />
            ) : (
              <ShieldOff size={16} />
            )}
            {person.disabledAt ? "تفعيل" : "تعطيل"}
          </button>
        ) : null}
      </div>
      <EditPersonDialog
        person={person}
        open={edit}
        onOpenChange={setEdit}
        onSaved={() => {
          onNotice("تم حفظ التعديلات.");
          onReload();
        }}
      />
      <ResetSecretDialog
        person={person}
        open={reset}
        onOpenChange={setReset}
        onSaved={() => {
          onNotice("أُعيد ضبط الدخول وأُنهيت الجلسات القديمة.");
          onReload();
        }}
      />
      <Dialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title={person.disabledAt ? "تفعيل الحساب" : "تعطيل الحساب"}
        description={
          person.disabledAt
            ? "سيتمكن هذا الحساب من تسجيل الدخول مجددًا."
            : "لن يتمكن هذا الحساب من تسجيل الدخول، وتُنهى جلساته الحالية. الأبناء لا يُعطّلون تلقائيًا."
        }
      >
        <div className="button-row">
          <button
            className="button primary"
            type="button"
            onClick={async () => {
              onBusy(true);
              onError("");
              try {
                await api("admin/users/disable", {
                  userId: person.id,
                  disabled: !person.disabledAt,
                });
                setDisableOpen(false);
                onNotice(
                  person.disabledAt ? "تم تفعيل الحساب." : "تم تعطيل الحساب.",
                );
                onReload();
              } catch (e) {
                onError((e as Error).message);
              } finally {
                onBusy(false);
              }
            }}
          >
            تأكيد
          </button>
          <button
            type="button"
            className="button outline"
            onClick={() => setDisableOpen(false)}
          >
            إلغاء
          </button>
        </div>
      </Dialog>
    </li>
  );
}

function DeleteFamilyButton({
  parent,
  busy,
  onBusy,
  onError,
  onNotice,
  onReload,
}: {
  parent: AdminPerson;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onError: (v: string) => void;
  onNotice: (v: string) => void;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const errorId = useId();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    onBusy(true);
    try {
      await api("admin/users/delete", {
        parentId: parent.id,
        confirmEmail: confirm,
      });
      setOpen(false);
      setConfirm("");
      onNotice("حُذفت الأسرة وكل بياناتها.");
      onReload();
    } catch (err) {
      const message = (err as Error).message;
      setFormError(message);
      onError(message);
    } finally {
      onBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="button outline small danger-action"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={16} /> حذف الأسرة
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="حذف الأسرة"
        description="هذا الإجراء يحذف ولي الأمر والأبناء وجلساتهم وتقدمهم ومحاولاتهم. اكتبي البريد الإلكتروني لولي الأمر للتأكيد."
      >
        <form onSubmit={submit}>
          {formError ? (
            <p className="form-error" role="alert" id={errorId}>
              <AlertCircle size={18} /> {formError}
            </p>
          ) : null}
          <label className="field" htmlFor={`delete-${parent.id}`}>
            <span>البريد الإلكتروني لولي الأمر (مطلوب)</span>
            <input
              id={`delete-${parent.id}`}
              type="email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? errorId : undefined}
              autoComplete="off"
            />
          </label>
          <div className="button-row">
            <button className="button primary" disabled={busy}>
              تأكيد الحذف
            </button>
            <button
              type="button"
              className="button outline"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function EditPersonDialog({
  person,
  open,
  onOpenChange,
  onSaved,
}: {
  person: AdminPerson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorId = useId();
  const isChild = person.role === "student";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("admin/users/update", {
        userId: person.id,
        name: form.get("name"),
        email: form.get("email"),
        username: form.get("username"),
        grade: form.get("grade"),
        gender: form.get("gender"),
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isChild ? "تعديل ملف الطالب" : "تعديل بيانات الحساب"}
      description="جميع الحقول المعروضة مطلوبة."
    >
      <form onSubmit={submit}>
        {error ? (
          <p className="form-error" role="alert" id={errorId}>
            <AlertCircle size={18} /> {error}
          </p>
        ) : null}
        <label className="field" htmlFor={`edit-name-${person.id}`}>
          <span>الاسم (مطلوب)</span>
          <input
            id={`edit-name-${person.id}`}
            name="name"
            defaultValue={person.name}
            required
            maxLength={60}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        {isChild ? (
          <>
            <label className="field" htmlFor={`edit-user-${person.id}`}>
              <span>اسم المستخدم (مطلوب)</span>
              <input
                id={`edit-user-${person.id}`}
                name="username"
                defaultValue={person.username ?? ""}
                required
                minLength={3}
                maxLength={32}
                autoComplete="off"
              />
            </label>
            <label className="field" htmlFor={`edit-grade-${person.id}`}>
              <span>الصف (مطلوب)</span>
              <select
                id={`edit-grade-${person.id}`}
                name="grade"
                defaultValue={person.grade ?? ""}
                required
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
              <legend>الجنس (مطلوب)</legend>
              <div className="radio-row">
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    defaultChecked={person.gender === "male"}
                    required
                  />
                  ولد
                </label>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    defaultChecked={person.gender === "female"}
                  />
                  بنت
                </label>
              </div>
            </fieldset>
          </>
        ) : (
          <label className="field" htmlFor={`edit-email-${person.id}`}>
            <span>البريد الإلكتروني (مطلوب)</span>
            <input
              id={`edit-email-${person.id}`}
              name="email"
              type="email"
              defaultValue={person.email ?? ""}
              required
              maxLength={200}
            />
          </label>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </button>
      </form>
    </Dialog>
  );
}

function ResetSecretDialog({
  person,
  open,
  onOpenChange,
  onSaved,
}: {
  person: AdminPerson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorId = useId();
  const isChild = person.role === "student";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("admin/users/reset-secret", {
        userId: person.id,
        password: form.get("password"),
        pin: form.get("pin"),
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isChild ? "رمز دخول جديد" : "كلمة مرور جديدة"}
      description={
        isChild
          ? "رمز الدخول من 6 إلى 12 رقمًا. الحقل مطلوب."
          : "كلمة المرور لا تقل عن 10 أحرف. الحقل مطلوب."
      }
    >
      <form onSubmit={submit}>
        {error ? (
          <p className="form-error" role="alert" id={errorId}>
            <AlertCircle size={18} /> {error}
          </p>
        ) : null}
        {isChild ? (
          <label className="field" htmlFor={`pin-${person.id}`}>
            <span>رمز الدخول الجديد (مطلوب)</span>
            <input
              id={`pin-${person.id}`}
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6,12}"
              minLength={6}
              maxLength={12}
              required
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
        ) : (
          <label className="field" htmlFor={`password-${person.id}`}>
            <span>كلمة المرور الجديدة (مطلوب)</span>
            <input
              id={`password-${person.id}`}
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "حفظ"}
        </button>
      </form>
    </Dialog>
  );
}

function CreateFamilyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [childCount, setChildCount] = useState(1);
  const errorId = useId();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const children = Array.from({ length: childCount }, (_, i) => ({
      name: form.get(`child-${i}-name`),
      username: form.get(`child-${i}-username`),
      pin: form.get(`child-${i}-pin`),
      grade: form.get(`child-${i}-grade`),
      gender: form.get(`child-${i}-gender`),
    }));
    try {
      await api("admin/families", {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        children,
      });
      setChildCount(1);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="إنشاء أسرة"
      description="أدخلي بيانات ولي الأمر وكل طالب. جميع الحقول المعروضة مطلوبة."
    >
      <form onSubmit={submit} className="admin-create-form">
        {error ? (
          <p className="form-error" role="alert" id={errorId}>
            <AlertCircle size={18} /> {error}
          </p>
        ) : null}
        <label className="field" htmlFor="family-name">
          <span>اسم ولي الأمر (مطلوب)</span>
          <input id="family-name" name="name" required maxLength={60} />
        </label>
        <label className="field" htmlFor="family-email">
          <span>البريد الإلكتروني (مطلوب)</span>
          <input
            id="family-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="off"
          />
        </label>
        <label className="field" htmlFor="family-password">
          <span>كلمة المرور (مطلوب، 10 أحرف على الأقل)</span>
          <input
            id="family-password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        {Array.from({ length: childCount }, (_, i) => (
          <fieldset key={i} className="admin-child-set">
            <legend>الطالب {["١", "٢", "٣", "٤", "٥", "٦"][i]} (مطلوب)</legend>
            <label className="field" htmlFor={`child-${i}-name`}>
              <span>اسم الطالب</span>
              <input
                id={`child-${i}-name`}
                name={`child-${i}-name`}
                required
                maxLength={60}
              />
            </label>
            <label className="field" htmlFor={`child-${i}-username`}>
              <span>اسم المستخدم</span>
              <input
                id={`child-${i}-username`}
                name={`child-${i}-username`}
                required
                minLength={3}
                maxLength={32}
                autoComplete="off"
              />
            </label>
            <label className="field" htmlFor={`child-${i}-grade`}>
              <span>الصف</span>
              <select
                id={`child-${i}-grade`}
                name={`child-${i}-grade`}
                required
                defaultValue=""
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
                  <input
                    type="radio"
                    name={`child-${i}-gender`}
                    value="male"
                    required
                  />
                  ولد
                </label>
                <label>
                  <input
                    type="radio"
                    name={`child-${i}-gender`}
                    value="female"
                  />
                  بنت
                </label>
              </div>
            </fieldset>
            <label className="field" htmlFor={`child-${i}-pin`}>
              <span>رمز الدخول (٦–١٢ رقمًا)</span>
              <input
                id={`child-${i}-pin`}
                name={`child-${i}-pin`}
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6,12}"
                required
                minLength={6}
                maxLength={12}
                autoComplete="new-password"
              />
            </label>
          </fieldset>
        ))}
        <div className="button-row">
          <button
            type="button"
            className="button outline small"
            disabled={childCount >= 6}
            onClick={() => setChildCount((n) => Math.min(6, n + 1))}
          >
            إضافة ابن/ابنة
          </button>
          <button
            type="button"
            className="button outline small"
            disabled={childCount <= 0}
            onClick={() => setChildCount((n) => Math.max(0, n - 1))}
          >
            إزالة آخر طالب
          </button>
        </div>
        <button className="button primary" disabled={busy}>
          {busy ? "جارٍ الإنشاء…" : "إنشاء الأسرة"}
        </button>
      </form>
    </Dialog>
  );
}

function SettingsTab({ initial }: { initial: SettingsView }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const errorId = useId();
  const secretDisabled = !data.encryption.ready;
  async function save(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      const next = await api("admin/settings", body);
      setData(next);
      setFormKey((n) => n + 1);
      setNotice(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const apiKey = String(form.get("elevenlabs_api_key") || "");
    const maxRaw = String(form.get("elevenlabs_max_characters") || "").trim();
    await save(
      {
        elevenlabs_voice_id: form.get("elevenlabs_voice_id"),
        elevenlabs_model_id: form.get("elevenlabs_model_id"),
        elevenlabs_max_characters: maxRaw === "" ? null : Number(maxRaw),
        ...(apiKey ? { elevenlabs_api_key: apiKey } : {}),
      },
      "حُفظت إعدادات الخدمات.",
    );
  }
  const sourceLabel =
    data.apiKey.source === "database"
      ? "قاعدة البيانات"
      : data.apiKey.source === "env"
        ? "متغيرات البيئة"
        : "غير مضبوط";
  return (
    <div className="panel admin-settings">
      <h3>ElevenLabs</h3>
      <p>
        هذه الإعدادات للنطق الصوتي اللاحق. لا يُرسل أي طلب إلى ElevenLabs من هذه
        الصفحة.
      </p>
      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>
      {secretDisabled ? (
        <p className="feedback retry" role="status">
          <AlertCircle size={18} />
          {data.encryption.message}
        </p>
      ) : null}
      <form key={formKey} onSubmit={submit}>
        <label className="field" htmlFor="voice-id">
          <span>معرّف الصوت (اختياري، حتى 100 حرف)</span>
          <input
            id="voice-id"
            name="elevenlabs_voice_id"
            defaultValue={data.elevenlabs_voice_id}
            maxLength={100}
            autoComplete="off"
          />
        </label>
        <label className="field" htmlFor="model-id">
          <span>معرّف النموذج (اختياري، حتى 100 حرف)</span>
          <input
            id="model-id"
            name="elevenlabs_model_id"
            defaultValue={data.elevenlabs_model_id}
            maxLength={100}
            autoComplete="off"
          />
        </label>
        <label className="field" htmlFor="max-chars">
          <span>الحد الأقصى للمحارف (0–1,000,000)</span>
          <input
            id="max-chars"
            name="elevenlabs_max_characters"
            type="number"
            min={0}
            max={1000000}
            step={1}
            defaultValue={data.elevenlabs_max_characters ?? ""}
          />
        </label>
        <fieldset className="admin-secret-set">
          <legend>مفتاح الواجهة البرمجية</legend>
          <p className="micro-copy">
            الحالة:{" "}
            {data.apiKey.unreadable
              ? "مضبوط لكن غير قابل للقراءة. غيّري المفتاح أو تحقّقي من SETTINGS_ENCRYPTION_KEY."
              : data.apiKey.configured
                ? `مضبوط من ${sourceLabel}${data.apiKey.last4 ? ` · آخر أربع خانات ${data.apiKey.last4}` : ""}`
                : "غير مضبوط"}
          </p>
          <label className="field" htmlFor="api-key">
            <span>مفتاح جديد (يُترك فارغًا إذا لم تريدي استبداله)</span>
            <input
              id="api-key"
              name="elevenlabs_api_key"
              type="password"
              autoComplete="new-password"
              disabled={secretDisabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={
                secretDisabled
                  ? "api-key-help"
                  : error
                    ? errorId
                    : "api-key-help"
              }
            />
            <small id="api-key-help">
              لا يُعرض المفتاح الحالي. الحقل فارغ عند فتح الصفحة.
            </small>
          </label>
        </fieldset>
        <div className="button-row">
          <button className="button primary" disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={
              busy ||
              !data.apiKey.configured ||
              data.apiKey.source !== "database"
            }
            onClick={() => setClearOpen(true)}
          >
            مسح مفتاح قاعدة البيانات
          </button>
        </div>
      </form>
      <Dialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="مسح مفتاح الواجهة"
        description="سيُحذف المفتاح المخزّن. إن وُجد مفتاح في البيئة فسيُستخدم بديلًا."
      >
        <div className="button-row">
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              await save({ clearApiKey: true }, "مُسح مفتاح قاعدة البيانات.");
              setClearOpen(false);
            }}
          >
            تأكيد المسح
          </button>
          <button
            type="button"
            className="button outline"
            onClick={() => setClearOpen(false)}
          >
            إلغاء
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function ContentTab({ initial }: { initial: Snapshot }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await api("admin/publish", { published: !data.published });
      setData(await api("dashboard"));
      setNotice("تم تحديث حالة نشر الدرس.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>
      <div className="dashboard-stats">
        <div className="stat-card">
          <Users size={25} />
          <b>{(data.stats?.parents || 0).toLocaleString("ar-KW")}</b>
          <span>أولياء الأمور</span>
        </div>
        <div className="stat-card">
          <BookOpen size={25} />
          <b>{(data.stats?.students || 0).toLocaleString("ar-KW")}</b>
          <span>الطلاب</span>
        </div>
        <div className="stat-card">
          <ScrollText size={25} />
          <b>{(data.stats?.attempts || 0).toLocaleString("ar-KW")}</b>
          <span>محاولات الاختبار</span>
        </div>
      </div>
      <div className="panel admin-panel">
        <Settings2 size={30} />
        <h3>علوم الصف الثامن</h3>
        <p>١٩ درسًا مفهرسًا · ٤ وحدات · الفصل الأول ٢٠٢٦–٢٠٢٧</p>
        <div className="publication-row">
          <div>
            <h3>المغذّيات</h3>
            <span className={"pill " + (data.published ? "green" : "yellow")}>
              {data.published ? "منشور" : "قيد المراجعة"}
            </span>
          </div>
          <button className="button outline" onClick={publish} disabled={busy}>
            {busy
              ? "جارٍ التحديث…"
              : data.published
                ? "إلغاء نشر الدرس"
                : "نشر الدرس"}
          </button>
        </div>
        <Link href={sciencePath} className="text-link">
          معاينة فهرس المادة
        </Link>
        <p className="admin-note">
          مرجع المحتوى: الكتاب المرفوع، ص ٢٤–٢٨. هذه لوحة الإدارة الأولية؛ محرّر
          المحتوى ورفع PDF والتوليد بالذكاء الاصطناعي ضمن مرحلة الربط التالية.
        </p>
      </div>
    </div>
  );
}

function AuditTab({ initial }: { initial: AuditView }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    api("admin/audit")
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div>
      <Notice kind="error">{error}</Notice>
      {!data.entries.length ? (
        <div className="empty-state">
          <ScrollText size={40} />
          <h3>لا يوجد سجل بعد</h3>
          <p>ستظهر هنا آخر خمسين عملية إدارة بعد أول تغيير.</p>
        </div>
      ) : (
        <ul className="audit-list">
          {data.entries.map((row) => (
            <li key={row.id} className="panel">
              <h3>{ACTION_LABEL[row.action] || row.action}</h3>
              <p>
                {row.adminName || "حساب إدارة"} · {formatDate(row.createdAt)}
              </p>
              {row.detail ? (
                <p className="micro-copy">
                  {typeof row.detail === "string"
                    ? row.detail
                    : JSON.stringify(row.detail)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
