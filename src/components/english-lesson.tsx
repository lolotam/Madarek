"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MatchingBoard, type MatchOptions } from "./english-matching";
import { EnglishMascot } from "./english-mascot";
import {
  EnglishSpellingRecorder,
  type SpellingReview,
} from "./english-spelling-recorder";
import { EnglishAudioButton } from "./english-audio";
import { playApplause } from "./english-applause";
import { sceneDocument } from "@/content/english-scene.mjs";
import { api, useSession } from "./providers";
type Question = {
  id: string;
  prompt: string;
  scene: string;
  passage?: string;
  audio?: string;
  options?: string[];
  matches?: MatchOptions;
  kind: string;
};
export type EnglishAttempt = {
  id: number;
  qid: string;
  answer: string;
  prompt: string;
  score: number | null;
  source: string;
  feedback: string;
  earned: number | null;
  possible: number;
  correct: boolean | null;
  detail?: {
    correction: string;
    breakdown: { key: string; label: string; max: number; awarded: number }[];
  } | null;
  model?: string;
  created_at: number;
  name?: string;
  answerText?: string;
  matchResults?: boolean[];
  recording?: { transcript: string };
};
type LessonGrade = Pick<
  EnglishAttempt,
  | "score"
  | "earned"
  | "possible"
  | "feedback"
  | "detail"
  | "source"
  | "matchResults"
  | "recording"
>;
type LessonResult = LessonGrade &
  ({ id: number; preview?: never } | { id?: never; preview: true });

export function markText(row: Pick<EnglishAttempt, "score">) {
  return row.score == null
    ? "بانتظار المراجعة"
    : (row.score === 100
        ? "صحيحة"
        : row.score === 0
          ? "تحتاج تصحيح"
          : "صحيحة جزئيًا") +
        " · " +
        row.score +
        "٪";
}
export function markSource(source: string) {
  return (
    (
      {
        key: "مفتاح الإجابة",
        ai: "تقييم Codex",
        whisper: "تفريغ Whisper وتصحيح التهجئة",
        teacher: "مراجعة المدرّسة",
        fallback: "مفتاح الإجابة · Codex غير متصل",
        waiting: "قيد التقييم",
        review: "للمراجعة",
      } as Record<string, string>
    )[source] || source
  );
}
export function GradeDetails({ row }: { row: LessonGrade & { id?: number } }) {
  return (
    <>
      {row.earned !== null && (
        <p>
          درجة السؤال ·{" "}
          <bdi>
            {row.earned} / {row.possible}
          </bdi>
        </p>
      )}
      {row.recording && row.id && (
        <div className="school-spelling">
          <p>
            اللي اتسمع · <bdi lang="en">{row.recording.transcript}</bdi>
          </p>
          <audio
            controls
            preload="none"
            src={`/api/english/spelling?attempt=${row.id}`}
            aria-label="اسمع إجابتك المحفوظة"
          />
        </div>
      )}
      {row.detail && (
        <>
          <ul>
            {row.detail.breakdown.map((c) => (
              <li key={c.key}>
                {c.label} ·{" "}
                <bdi>
                  {c.awarded} / {c.max}
                </bdi>
              </li>
            ))}
          </ul>
          {row.score !== 100 && (
            <p>
              مثال صحيح · <bdi lang="en">{row.detail.correction}</bdi>
            </p>
          )}
        </>
      )}
    </>
  );
}
export function Diagram({
  q,
}: {
  q: Pick<Question, "scene"> & { id?: string };
}) {
  const host = useRef<HTMLDivElement>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (!host.current || !ready) return;
    const player = document.createElement("hyperframes-player");
    player.setAttribute("width", "840");
    player.setAttribute("height", "232");
    player.setAttribute("srcdoc", sceneDocument(q.scene, q.id));
    player.setAttribute("aria-hidden", "true");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      player.setAttribute("autoplay", "");
    host.current.replaceChildren(player);
    return () => player.remove();
  }, [q.scene, q.id, ready]);
  return (
    <>
      <Script src="/english/player.js" onReady={() => setReady(true)} />
      <figure className="school-diagram" aria-label={q.scene}>
        {ready ? (
          <div key="player" ref={host} />
        ) : (
          <div key="fallback">
            {q.scene.split("|").map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            const p = host.current?.firstElementChild as
              | (HTMLElement & {
                  seek?: (t: number) => void;
                  play?: () => void;
                })
              | null;
            p?.seek?.(0);
            p?.play?.();
          }}
        >
          إعادة الحركة
        </button>
      </figure>
    </>
  );
}
const clockFaces = Array.from("🕛🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚");

function ClockModel({ hour }: { hour: number }) {
  const details = useRef<HTMLDetailsElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (details.current?.open) setOpen(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./english-clock.mjs")
      .then(({ showClock }) => {
        if (!cancelled && host.current && slider.current)
          dispose = showClock(host.current, hour, slider.current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [hour, open]);
  return (
    <details
      ref={details}
      className="school-clock"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>جرّب ساعة الصف ثلاثية الأبعاد</summary>
      {open && (
        <>
          <div
            className="school-clock-screen"
            ref={host}
            role="img"
            aria-label="ساعة بعقربين"
          >
            {clockFaces[hour]}
          </div>
          <label>
            لفّ الساعة{" "}
            <input
              ref={slider}
              type="range"
              min="-40"
              max="40"
              defaultValue="12"
            />
          </label>
        </>
      )}
    </details>
  );
}

function Pencils({ far }: { far: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined,
      alive = true;
    import("./english-pencils.mjs")
      .then((mod) => {
        if (alive && box.current) dispose = mod.showPencils(box.current, far);
      })
      .catch(() => {
        if (box.current) box.current.textContent = far ? "✏️✏️" : "✏️";
      });
    return () => {
      alive = false;
      dispose?.();
    };
  }, [far]);
  return (
    <div className="school-pencils">
      <div
        ref={box}
        role="img"
        aria-label={far ? "قلمان بعيدان" : "قلم قريب"}
      ></div>
      <label>
        قرّب وبعّد الأقلام{" "}
        <input
          type="range"
          min=".55"
          max="2"
          step=".05"
          defaultValue={far ? 0.8 : 1.6}
        />
      </label>
    </div>
  );
}
const confettiColors = ["#7554ce", "#ed9b2b", "#248061", "#5f99dc", "#db5581"];

function AnswerReaction({ correct }: { correct: boolean }) {
  return (
    <div
      className={`school-reaction ${correct ? "school-confetti" : "school-miss"}`}
      aria-hidden="true"
    >
      {correct ? (
        Array.from({ length: 24 }, (_, index) => (
          <span
            key={index}
            data-shape={
              index % 3 === 0 ? "star" : index % 3 === 1 ? "dot" : "strip"
            }
            style={
              {
                "--piece-x": `${4 + ((index * 37) % 93)}%`,
                "--piece-color": confettiColors[index % confettiColors.length],
                "--piece-delay": `${(index % 6) * 55}ms`,
                "--piece-drift": `${((index % 7) - 3) * 15}px`,
                "--piece-turn": `${(index % 2 === 0 ? 1 : -1) * (210 + index * 21)}deg`,
              } as CSSProperties
            }
          />
        ))
      ) : (
        <span>×</span>
      )}
    </div>
  );
}

export function EnglishLesson({
  page,
  lesson,
  grammar = false,
}: {
  page: number;
  grammar?: boolean;
  lesson: { title: string; ar: string; icon: string; questions: Question[] };
}) {
  const { user, loading } = useSession();
  const [step, setStep] = useState(0);
  const q = lesson.questions[step];
  const clockHour =
    page === 3 ? clockFaces.findIndex((face) => q.scene.includes(face)) : -1;
  const [draft, setDraft] = useState(""),
    [row, setRow] = useState<LessonResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const readyToSubmit =
    Boolean(draft.trim()) && (!q.matches || !draft.split(",").includes("-1"));
  const [showReaction, setShowReaction] = useState(false);
  const answerForm = useRef<HTMLFormElement>(null);
  const resultPanel = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const outcome =
    row?.score === 100
      ? "correct"
      : row?.score === 0
        ? "incorrect"
        : row?.score == null
          ? "pending"
          : "partial";

  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
      audio.current = null;
    },
    [],
  );

  useEffect(() => {
    if (showReaction)
      resultPanel.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
  }, [showReaction, row]);

  function prepareAudio() {
    try {
      audio.current ??= new AudioContext();
      // Unlock audio in the click handler before waiting for the grading response.
      void audio.current.resume().catch(() => {});
    } catch {
      // Visual feedback stays available in browsers without Web Audio.
    }
  }

  function showResult(attempt: LessonResult) {
    setRow(attempt);
    setShowReaction(true);
    if (attempt.score === 100 && audio.current?.state === "running") {
      playApplause(audio.current);
    }
  }
  const nonce = useRef("");
  const edited = useRef(false);
  function change(index: number) {
    edited.current = false;
    setStep(index);
    setDraft("");
    setShowReaction(false);
    setRow(null);
    setError("");
    nonce.current = "";
  }
  function update(value: string) {
    edited.current = true;
    setDraft(value);
    nonce.current = "";
    setShowReaction(false);
    setRow(null);
    setError("");
  }
  useEffect(() => {
    if (!user || user.role !== "student") return;
    let active = true;
    api("english/history")
      .then((rows: EnglishAttempt[]) => {
        if (active && !edited.current) {
          const prev = rows.find((r) => r.qid === q.id);
          if (prev) {
            setRow(prev);
            setDraft(prev.answer);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [q.id, user]);
  async function refreshGrade() {
    if (!row || row.preview) return;
    prepareAudio();
    setBusy(true);
    try {
      const rows: EnglishAttempt[] = await api("english/history");
      const refreshed = rows.find((attempt) => attempt.id === row.id);
      if (refreshed) showResult(refreshed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function evaluateRecording(
    wav: Blob,
    attemptNonce: string,
    receipt?: string,
  ): Promise<SpellingReview | undefined> {
    if (busy || row) return;
    edited.current = true;
    prepareAudio();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/english/spelling", {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
          "X-Question-Id": q.id,
          "X-Attempt-Nonce": attemptNonce,
          ...(receipt && { "X-Recognition-Receipt": receipt }),
        },
        body: wav,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذّر تقييم التسجيل.");
      if (!receipt) return result as SpellingReview;
      setDraft(result.answer);
      showResult(result);
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || busy || row || !readyToSubmit) return;
    prepareAudio();
    nonce.current ||= Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    setBusy(true);
    setError("");
    try {
      showResult(
        await api("english/answer", {
          qid: q.id,
          answer: draft,
          nonce: nonce.current,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="practice" className="container section school school-lesson">
      <div className="breadcrumbs">
        {grammar ? (
          <Link href="/grade/2/english/grammar">شرح القواعد</Link>
        ) : (
          <>
            <Link href="/grade/2/english">My School Day</Link> / درس{" "}
            {page.toLocaleString("ar-u-nu-arab")} من ٢٠
          </>
        )}
      </div>
      <header className="school-heading">
        <div>
          <p>{lesson.ar}</p>
          <h1 lang="en" dir="ltr">
            {lesson.title}
          </h1>
          {!grammar && (page === 14 || page === 15) && (
            <Link
              className="text-link"
              href={`/grade/2/english/grammar/${page === 14 ? "pronouns" : "present"}`}
            >
              شرح القاعدة
            </Link>
          )}
        </div>
        <span className="school-icon">{lesson.icon}</span>
      </header>
      {showReaction && (outcome === "correct" || outcome === "incorrect") && (
        <AnswerReaction key={row?.id} correct={outcome === "correct"} />
      )}
      <div
        className="school-work"
        data-answer-shake={
          showReaction && outcome === "incorrect" ? "" : undefined
        }
      >
        <div className="school-steps">
          <EnglishMascot
            selected={user?.englishMascot}
            outcome={
              outcome === "pending"
                ? "idle"
                : outcome === "correct"
                  ? "correct"
                  : "retry"
            }
          />
          <b>
            سؤال {(step + 1).toLocaleString("ar-u-nu-arab")} من{" "}
            {lesson.questions.length.toLocaleString("ar-u-nu-arab")}
          </b>
          <progress
            value={step + 1}
            max={lesson.questions.length}
            aria-label="رقم السؤال"
          />
          {lesson.questions.length > 15 && (
            <label className="school-question-jump">
              انتقل لسؤال
              <select
                value={step}
                onChange={(event) => change(Number(event.target.value))}
                disabled={busy}
              >
                {lesson.questions.map((item, index) => (
                  <option key={item.id} value={index}>
                    {(index + 1).toLocaleString("ar-u-nu-arab")}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {q.passage && (
          <blockquote dir="ltr" lang="en">
            {q.passage}
            <EnglishAudioButton
              key={q.id}
              clip={`${q.id}-passage`}
              label="اسمع القطعة"
              text={q.passage}
            />
          </blockquote>
        )}
        <Diagram q={q} />
        {clockHour >= 0 && (
          <ClockModel key={`clock-${q.id}`} hour={clockHour} />
        )}
        {page === 6 && step < 2 && (
          <Pencils key={`pencils-${q.id}`} far={step === 0} />
        )}
        <h2 dir="ltr" lang="en">
          {q.prompt}
        </h2>
        <div className="school-question-audio" key={`audio-${q.id}`}>
          <EnglishAudioButton
            clip={`${q.id}-prompt`}
            label="اسمع السؤال"
            text={q.prompt}
          />
          {q.audio?.trim() && (
            <EnglishAudioButton
              clip={`${q.id}-listening`}
              label="اسمع التسجيل"
              text={q.audio}
              transcript
            />
          )}
          {(q.options || q.matches) && (
            <EnglishAudioButton
              clip={`${q.id}-options`}
              label={q.matches ? "اسمع كلمات التوصيل" : "اسمع الاختيارات"}
              text={(
                q.options ?? [
                  ...(q.matches?.left ?? []),
                  ...(q.matches?.right ?? []),
                ]
              ).join(". ")}
            />
          )}
        </div>
        <form ref={answerForm} onSubmit={submit}>
          <fieldset disabled={busy}>
            <legend className="sr-only">إجابتك</legend>
            {q.matches ? (
              <MatchingBoard
                key={q.id}
                options={q.matches}
                value={draft}
                onChange={update}
                disabled={busy}
                results={row?.matchResults}
              />
            ) : q.options ? (
              <div className="school-options" dir="ltr">
                {q.options.map((o) => (
                  <label
                    key={o}
                    className={o === draft ? "selected" : ""}
                    data-outcome={o === draft && row ? outcome : undefined}
                  >
                    <input
                      type="radio"
                      checked={draft === o}
                      name={q.id}
                      value={o}
                      onChange={() => update(o)}
                    />
                    <span lang="en">{o}</span>
                  </label>
                ))}
              </div>
            ) : (
              <label className="field">
                اكتب إجابتك بالإنجليزية
                <textarea
                  dir="ltr"
                  lang="en"
                  autoComplete="off"
                  maxLength={500}
                  rows={2}
                  value={draft}
                  onChange={(e) => update(e.target.value)}
                />
              </label>
            )}
          </fieldset>
          {page === 9 &&
            q.kind === "write" &&
            user?.role === "student" &&
            !row && (
              <EnglishSpellingRecorder
                key={q.id}
                onEvaluate={evaluateRecording}
                busy={busy}
              />
            )}
          <button
            type="submit"
            className="button primary"
            disabled={loading || !readyToSubmit || busy || !!row}
          >
            {busy ? "جارٍ تقييم إجابتك…" : "إرسال الإجابة"}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        {row && (
          <div
            className="school-result"
            data-outcome={outcome}
            ref={resultPanel}
            role="status"
          >
            <div className="school-result-heading">
              {outcome !== "pending" && (
                <span aria-hidden="true" className="school-result-mark">
                  {outcome === "correct"
                    ? "✓"
                    : outcome === "incorrect"
                      ? "×"
                      : "−"}
                </span>
              )}
              <strong>
                {outcome === "correct"
                  ? "أحسنت! إجابتك صحيحة · 100٪"
                  : outcome === "incorrect"
                    ? "إجابة خاطئة · 0٪"
                    : row.preview && row.score === null
                      ? "إجابة تحتاج تقييم كتابة"
                      : markText(row)}
              </strong>
            </div>
            {!row.preview && user?.role === "student" && (
              <p>
                محفوظة باسم <b>{user.name}</b>
              </p>
            )}
            <GradeDetails row={row} />
            {row.score === null && !row.preview && (
              <button
                className="button outline small"
                disabled={busy}
                onClick={refreshGrade}
              >
                تحديث الدرجة
              </button>
            )}
            <p>{row.feedback}</p>
            {!row.preview && <small>{markSource(row.source)}</small>}
            <button
              type="button"
              disabled={busy}
              className="button outline small"
              onClick={() => {
                update(draft);
                answerForm.current
                  ?.querySelector<HTMLElement>(
                    "input:checked, textarea, [data-match-left]",
                  )
                  ?.focus();
              }}
            >
              تعديل الإجابة
            </button>
          </div>
        )}
        {!loading && user?.role !== "student" && (
          <p className="school-save-note">
            {user ? (
              "لحفظ الدرجة باسم الطالب، استخدم حسابه."
            ) : (
              <Link
                className="text-link"
                href={`/login?mode=student&lesson=${page}`}
              >
                ادخل بحساب الطالب لحفظ الإجابة
              </Link>
            )}
          </p>
        )}
        <footer>
          {step > 0 && (
            <button
              className="button outline"
              disabled={busy}
              onClick={() => change(step - 1)}
            >
              السؤال السابق
            </button>
          )}
          {step < lesson.questions.length - 1 ? (
            <button
              className="button outline"
              disabled={busy}
              onClick={() => change(step + 1)}
            >
              السؤال التالي
            </button>
          ) : (
            <Link
              className="button primary"
              href={
                grammar
                  ? "/grade/2/english/grammar"
                  : page < 20
                    ? "/grade/2/english/" + (page + 1)
                    : "/dashboard"
              }
            >
              {grammar
                ? "العودة للقواعد"
                : page < 20
                  ? "الدرس التالي"
                  : "شوف تقدّمك"}
            </Link>
          )}
        </footer>
      </div>
    </section>
  );
}
