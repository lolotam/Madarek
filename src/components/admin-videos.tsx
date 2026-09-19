"use client";
import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "./providers";
import { units } from "@/content/curriculum";
import { formatDuration, videoKindLabel, type LessonVideo } from "./video-carousel";

export type AdminVideo = LessonVideo & {
  lessonId: string;
  position: number;
  published: boolean;
  updatedAt: number;
};
export type VideoList = { videos: AdminVideo[] };

const LESSON_OPTIONS = [
  { id: "platform", title: "دليل استخدام المنصة (عام)" },
  ...units
    .flatMap((u) => u.chapters.flatMap((c) => c.lessons))
    .map((l) => ({
      id: l.id,
      title: l.title + (l.available ? "" : " · غير متاح بعد"),
    })),
];
const lessonTitle = (id: string) =>
  LESSON_OPTIONS.find((l) => l.id === id)?.title ?? id;

export function VideosTab({ initial }: { initial: VideoList }) {
  const [videos, setVideos] = useState(initial.videos);
  const [editing, setEditing] = useState<AdminVideo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function reload() {
    setVideos((await api("admin/videos")).videos);
  }
  function startForm(video: AdminVideo | null) {
    setEditing(video);
    setFormKey((k) => k + 1);
    setConfirmId(null);
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    try {
      await api("admin/videos/save", {
        ...(editing ? { id: editing.id } : {}),
        lessonId: form.get("lessonId"),
        url: form.get("url"),
        title: form.get("title"),
        goal: form.get("goal"),
        kind: form.get("kind"),
        duration: form.get("duration"),
        position: Number(form.get("position") || 0),
        published: form.get("published") === "on",
      });
      setNotice(editing ? "حُفظت تعديلات الفيديو." : "أُضيف الفيديو.");
      startForm(null);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("admin/videos/delete", { id });
      setConfirmId(null);
      if (editing?.id === id) startForm(null);
      setNotice("حُذف الفيديو.");
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-videos">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
      <form key={formKey} className="panel video-form" onSubmit={save}>
        <h3>{editing ? "تعديل فيديو" : "إضافة فيديو"}</h3>
        <label className="field">
          <span>الدرس المرتبط</span>
          <select name="lessonId" defaultValue={editing?.lessonId ?? "nutrients"}>
            {LESSON_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>رابط يوتيوب</span>
          <input
            name="url"
            dir="ltr"
            required
            defaultValue={editing ? `https://youtu.be/${editing.youtubeId}` : ""}
          />
        </label>
        <label className="field">
          <span>العنوان</span>
          <input name="title" required maxLength={120} defaultValue={editing?.title} />
        </label>
        <label className="field">
          <span>الهدف من الفيديو</span>
          <input name="goal" required maxLength={240} defaultValue={editing?.goal} />
        </label>
        <label className="field">
          <span>النوع</span>
          <select name="kind" defaultValue={editing?.kind ?? "explain"}>
            {Object.entries(videoKindLabel).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>المدة (دقائق:ثوانٍ)</span>
          <input
            name="duration"
            dir="ltr"
            placeholder="4:05"
            defaultValue={
              editing?.durationSeconds ? formatDuration(editing.durationSeconds) : ""
            }
          />
        </label>
        <label className="field">
          <span>الترتيب داخل الشريط</span>
          <input
            name="position"
            type="number"
            min={0}
            max={999}
            defaultValue={editing?.position ?? 0}
          />
        </label>
        <label className="check-field">
          <input
            name="published"
            type="checkbox"
            defaultChecked={editing?.published ?? false}
          />
          <span>منشور للطلاب</span>
        </label>
        <div className="video-form-actions">
          <button className="button primary" disabled={busy}>
            {editing ? (
              "حفظ التعديلات"
            ) : (
              <>
                <Plus size={18} /> إضافة الفيديو
              </>
            )}
          </button>
          {editing && (
            <button
              type="button"
              className="button outline"
              onClick={() => startForm(null)}
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>
      <section className="panel">
        <h3>الفيديوهات ({videos.length.toLocaleString("ar-KW")})</h3>
        {!videos.length ? (
          <p className="muted-text">لا توجد فيديوهات بعد.</p>
        ) : (
          <ul className="video-admin-list">
            {videos.map((v) => (
              <li key={v.id}>
                <div>
                  <b>{v.title}</b>
                  <small>
                    {lessonTitle(v.lessonId)} · {videoKindLabel[v.kind]} · الترتيب{" "}
                    {v.position.toLocaleString("ar-KW")}
                  </small>
                </div>
                <span className={"pill " + (v.published ? "green" : "yellow")}>
                  {v.published ? "منشور" : "مسودة"}
                </span>
                <button
                  type="button"
                  className="button outline small"
                  onClick={() => startForm(v)}
                >
                  <Pencil size={16} /> تعديل
                </button>
                <button
                  type="button"
                  className="button outline small"
                  disabled={busy}
                  onClick={() => remove(v.id)}
                >
                  <Trash2 size={16} />{" "}
                  {confirmId === v.id ? "تأكيد الحذف" : "حذف"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
