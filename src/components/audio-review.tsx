"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "./providers";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export type ClipReviewStatus = "pending" | "approved" | "rejected";
export type CurrentStatus = ClipReviewStatus | "missing";
export type NarrationPart = "map" | "explore" | "practice" | "quiz" | "result";

export type PreviewCue = {
  start: number;
  end: number;
  target: string;
  textStart: number;
  textEnd: number;
};

export type ReviewSegment = {
  id: string;
  part: NarrationPart;
  order: number;
  text: string;
  protected: boolean;
  hash: string;
  currentStatus: CurrentStatus;
  current: {
    hash: string;
    status: ClipReviewStatus;
    reason?: string;
    reviewedAt?: string;
    createdAt?: string;
    duration: number | null;
    cues: PreviewCue[];
  } | null;
  older: Array<{
    hash: string;
    status: ClipReviewStatus;
    createdAt: string;
    reason?: string;
    version?: number;
  }>;
};

export type ReviewBoardData = {
  page: string;
  summary: {
    missing: number;
    pending: number;
    approved: number;
    rejected: number;
    neededCharacters: number;
    neededSegments: number;
  };
  parts: Array<{ part: NarrationPart; segments: ReviewSegment[] }>;
};

const PART_LABELS: Record<NarrationPart, string> = {
  map: "نفهم",
  explore: "نجرّب",
  practice: "نتدرّب",
  quiz: "نختبر فهمنا",
  result: "النتائج",
};

const STATUS_LABELS: Record<CurrentStatus, string> = {
  missing: "غير مولَّد",
  pending: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const STATUS_PILL: Record<CurrentStatus, string> = {
  missing: "pill muted",
  pending: "pill yellow",
  approved: "pill green",
  rejected: "pill pink",
};

const PARTS: NarrationPart[] = ["map", "explore", "practice", "quiz", "result"];

function formatWhen(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activeCue(cues: PreviewCue[], time: number) {
  const hits = cues.filter(
    (cue) =>
      cue.textEnd > cue.textStart && time >= cue.start && time <= cue.end,
  );
  if (!hits.length) return null;
  hits.sort((a, b) => a.start - b.start);
  return hits[hits.length - 1];
}

function CueText({
  text,
  cues,
  time,
  id,
}: {
  text: string;
  cues: PreviewCue[];
  time: number;
  id: string;
}) {
  const reduceMotion = useReducedMotion();
  const cue = activeCue(cues, time);
  if (!cue) {
    return (
      <p
        id={id}
        dir="rtl"
        className="break-words text-base leading-[1.9] text-[var(--ink)]"
      >
        {text}
      </p>
    );
  }
  return (
    <p
      id={id}
      dir="rtl"
      className="break-words text-base leading-[1.9] text-[var(--ink)]"
    >
      {text.slice(0, cue.textStart)}
      <motion.mark
        layoutId={reduceMotion ? undefined : `cue-${id}`}
        className="rounded-[4px] bg-[var(--amber-soft)] text-[var(--ink)] not-italic"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <span className="sr-only">العبارة الجارية: </span>
        {text.slice(cue.textStart, cue.textEnd)}
      </motion.mark>
      {text.slice(cue.textEnd)}
    </p>
  );
}

function StatusBadge({ status }: { status: CurrentStatus }) {
  return <span className={STATUS_PILL[status]}>{STATUS_LABELS[status]}</span>;
}

function pauseOtherAudio(current: HTMLAudioElement) {
  document.querySelectorAll("audio").forEach((node) => {
    if (node !== current) node.pause();
  });
}

function ClipPreview({ segment }: { segment: ReviewSegment }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const textId = `clip-text-${segment.id}`;
  const current = segment.current;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    let frame = 0;
    const tick = () => {
      setTime(audio.currentTime);
      if (!audio.paused && !audio.ended) {
        frame = requestAnimationFrame(tick);
      }
    };
    const start = () => {
      pauseOtherAudio(audio);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const stop = () => cancelAnimationFrame(frame);
    const sync = () => setTime(audio.currentTime);
    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    audio.addEventListener("seeked", sync);
    audio.addEventListener("timeupdate", sync);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("seeked", sync);
      audio.removeEventListener("timeupdate", sync);
    };
  }, [current]);
  if (!current) return null;
  return (
    <div className="flex flex-col gap-3">
      <CueText
        id={textId}
        text={segment.text}
        cues={current.cues}
        time={time}
      />
      <audio
        ref={audioRef}
        className="h-11 w-full max-w-full"
        controls
        preload="metadata"
        src={`/api/admin/audio/clip/${segment.id}/${current.hash}`}
        aria-label={`معاينة مقطع ${segment.id}`}
        aria-describedby={textId}
      />
    </div>
  );
}

function nextSummary(
  summary: ReviewBoardData["summary"],
  from: CurrentStatus,
  to: ClipReviewStatus,
) {
  if (from === to) return summary;
  const next = { ...summary };
  if (from === "missing") next.missing = Math.max(0, next.missing - 1);
  if (from === "pending") next.pending = Math.max(0, next.pending - 1);
  if (from === "approved") next.approved = Math.max(0, next.approved - 1);
  if (from === "rejected") next.rejected = Math.max(0, next.rejected - 1);
  next[to] += 1;
  return next;
}

function RejectDialog({
  segment,
  busy,
  onReject,
}: {
  segment: ReviewSegment;
  busy: boolean;
  onReject: (reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const errorId = `reject-error-${segment.id}`;
  const hintId = `reject-hint-${segment.id}`;
  function reset() {
    setReason("");
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("اكتبي سبب الرفض. هذا الحقل مطلوب.");
      return;
    }
    if (trimmed.length > 300) {
      setError("سبب الرفض يجب ألا يزيد على 300 حرف.");
      return;
    }
    setError("");
    const ok = await onReject(trimmed);
    if (!ok) return;
    reset();
    setOpen(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <motion.button
          type="button"
          className="button outline small"
          whileTap={{ scale: 0.98 }}
          disabled={busy}
        >
          رفض
        </motion.button>
      </DialogTrigger>
      <DialogContent aria-describedby={`reject-desc-${segment.id}`}>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle className="text-[21px] font-bold text-[var(--ink)]">
              رفض المقطع {segment.id}
            </DialogTitle>
            <DialogDescription
              id={`reject-desc-${segment.id}`}
              className="text-[15px] leading-[1.9] text-[var(--muted)]"
            >
              اكتبي سببًا واضحًا للمراجعة القادمة. الحقل مطلوب، من حرف واحد إلى
              300 حرف.
            </DialogDescription>
          </DialogHeader>
          <label className="field" htmlFor={`reject-reason-${segment.id}`}>
            <span>سبب الرفض (مطلوب)</span>
            <textarea
              id={`reject-reason-${segment.id}`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError("");
              }}
              maxLength={300}
              rows={4}
              required
              aria-required="true"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            />
            <small id={hintId}>{reason.trim().length} / 300</small>
          </label>
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="form-error flex items-center gap-2"
            >
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="button outline small">
                إلغاء
              </button>
            </DialogClose>
            <motion.button
              type="submit"
              className="button primary small"
              whileTap={{ scale: 0.98 }}
              disabled={busy}
            >
              {busy ? "جارٍ الحفظ…" : "تأكيد الرفض"}
            </motion.button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SegmentCard({
  segment,
  busy,
  feedback,
  error,
  onApprove,
  onReject,
}: {
  segment: ReviewSegment;
  busy: boolean;
  feedback: string;
  error: string;
  onApprove: () => void;
  onReject: (reason: string) => Promise<boolean>;
}) {
  return (
    <motion.article
      layout
      className="panel"
      aria-labelledby={`seg-title-${segment.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h3
          id={`seg-title-${segment.id}`}
          className="text-[18px] text-[var(--ink)]"
          dir="ltr"
        >
          {segment.id}
        </h3>
        <StatusBadge status={segment.currentStatus} />
        {segment.protected ? (
          <span className="pill blue">
            <ShieldAlert size={14} aria-hidden="true" />
            مقطع إجابة
          </span>
        ) : null}
      </header>
      {segment.current ? (
        <ClipPreview segment={segment} />
      ) : (
        <div className="flex flex-col gap-3">
          <p
            dir="rtl"
            className="break-words text-base leading-[1.9] text-[var(--ink)]"
          >
            {segment.text}
          </p>
          <p className="flex items-start gap-2 text-[15px] text-[var(--muted)]">
            <CircleHelp size={18} aria-hidden="true" />
            <span>
              لا توجد نسخة مولَّدة للبصمة الحالية. ولّدي المقطع من سطر الأوامر
              ثم عودي للمراجعة.
            </span>
          </p>
        </div>
      )}
      {segment.current?.reason ? (
        <p className="mt-3 text-[14px] text-[var(--pink-ink)]">
          سبب الرفض: {segment.current.reason}
        </p>
      ) : null}
      {segment.current ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <motion.button
            type="button"
            className="button primary small"
            whileTap={{ scale: 0.98 }}
            onClick={onApprove}
            disabled={busy}
            aria-busy={busy}
          >
            اعتماد
          </motion.button>
          <RejectDialog segment={segment} busy={busy} onReject={onReject} />
        </div>
      ) : null}
      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.p
            key="ok"
            role="status"
            className="mt-3 flex items-center gap-2 text-[14px] text-[var(--violet-ink)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            {feedback}
          </motion.p>
        ) : null}
        {error ? (
          <motion.p
            key="err"
            role="alert"
            className="form-error mt-3 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={18} aria-hidden="true" />
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
      {segment.older.length > 0 ? (
        <details className="mt-4 border-t border-[var(--line)] pt-3">
          <summary className="min-h-11 py-2 text-[14px] font-semibold text-[var(--violet-ink)]">
            نسخ أقدم ({segment.older.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {segment.older.map((version) => (
              <li
                key={version.hash}
                className="rounded-[12px] bg-[var(--paper)] p-3 text-[13px]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <code dir="ltr" className="break-all">
                    {version.hash}
                  </code>
                  <StatusBadge status={version.status} />
                </div>
                {version.createdAt ? (
                  <p className="mt-1">{formatWhen(version.createdAt)}</p>
                ) : null}
                {version.reason ? (
                  <p className="mt-1 text-[var(--pink-ink)]">
                    {version.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </motion.article>
  );
}

export function AudioReviewBoard({ board }: { board: ReviewBoardData }) {
  const reduceMotion = useReducedMotion();
  const [parts, setParts] = useState(board.parts);
  const [summary, setSummary] = useState(board.summary);
  const [statusFilter, setStatusFilter] = useState<"all" | CurrentStatus>(
    "all",
  );
  const [partFilter, setPartFilter] = useState<"all" | NarrationPart>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const visibleParts = useMemo(() => {
    return parts
      .filter((group) => partFilter === "all" || group.part === partFilter)
      .map((group) => ({
        ...group,
        segments: group.segments.filter((segment) =>
          statusFilter === "all"
            ? true
            : segment.currentStatus === statusFilter,
        ),
      }))
      .filter((group) => group.segments.length > 0);
  }, [parts, partFilter, statusFilter]);

  async function decide(
    segment: ReviewSegment,
    decision: "approve" | "reject",
    reason?: string,
  ): Promise<boolean> {
    if (!segment.current) return false;
    setBusyId(segment.id);
    setErrors((current) => {
      const next = { ...current };
      delete next[segment.id];
      return next;
    });
    try {
      const result = (await api("admin/audio/review", {
        segmentId: segment.id,
        hash: segment.current.hash,
        decision,
        ...(reason ? { reason } : {}),
      })) as { review: { status: ClipReviewStatus; reason?: string } };
      const nextStatus = result.review.status;
      setParts((current) =>
        current.map((group) => ({
          ...group,
          segments: group.segments.map((row) => {
            if (row.id !== segment.id || !row.current) return row;
            return {
              ...row,
              currentStatus: nextStatus,
              current: {
                ...row.current,
                status: nextStatus,
                reason: result.review.reason,
              },
            };
          }),
        })),
      );
      setSummary((current) =>
        nextSummary(current, segment.currentStatus, nextStatus),
      );
      setFeedback((current) => ({
        ...current,
        [segment.id]:
          nextStatus === "approved"
            ? `اعتُمد المقطع ${segment.id}.`
            : `رُفض المقطع ${segment.id}.`,
      }));
      return true;
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [segment.id]:
          error instanceof Error
            ? error.message
            : "تعذّر حفظ المراجعة. حاولي مجددًا.",
      }));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="container py-12">
      <header className="mb-10">
        <Link href="/admin" className="text-link">
          <ArrowRight size={17} aria-hidden="true" />
          لوحة الإدارة
        </Link>
        <h1 className="mt-3">مراجعة الصوت</h1>
        <p className="mt-2 max-w-[40rem]">
          استمعي لكل مقطع مولَّد، ثم اعتمديه أو ارفضيه بسبب مكتوب. المتعلمون لا
          يصلهم إلا المقاطع المعتمدة.
        </p>
      </header>

      <section aria-labelledby="audio-summary-heading" className="mb-8">
        <h2 id="audio-summary-heading" className="mb-4">
          ملخص الحالة الحالية
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["missing", summary.missing, CircleHelp],
              ["pending", summary.pending, Clock],
              ["approved", summary.approved, CheckCircle2],
              ["rejected", summary.rejected, XCircle],
            ] as const
          ).map(([status, count, Icon]) => (
            <li
              key={status}
              className="flex items-center gap-3 rounded-[16px] border border-[var(--line)] bg-[var(--white)] p-4"
            >
              <Icon
                size={22}
                aria-hidden="true"
                className="text-[var(--violet-ink)]"
              />
              <div>
                <b className="block text-[22px] text-[var(--ink)]">{count}</b>
                <span className="text-[13px] text-[var(--muted)]">
                  {STATUS_LABELS[status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[15px] text-[var(--ink)]">
          حروف بانتظار التوليد: <strong>{summary.neededCharacters}</strong>
          {summary.neededSegments
            ? ` · ${summary.neededSegments} مقطعًا`
            : " · لا يوجد توليد معلّق"}
        </p>
        <p className="mt-4 text-[15px]">
          توليد المقاطع يجري من سطر الأوامر، وليس من هذه الصفحة:
        </p>
        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded-[12px] border border-[var(--line)] bg-[var(--violet-soft)] p-4 text-[15px] leading-[1.9] text-[var(--violet-ink)]"
        >
          <code>npm run audio -- generate</code>
        </pre>
      </section>

      <fieldset className="mb-8 rounded-[16px] border border-[var(--line)] bg-[var(--white)] p-4">
        <legend className="px-2 text-[16px] font-semibold text-[var(--ink)]">
          تصفية المقاطع
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="field mb-0" htmlFor="audio-status-filter">
            <span>الحالة</span>
            <select
              id="audio-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
            >
              <option value="all">كل الحالات</option>
              <option value="pending">{STATUS_LABELS.pending}</option>
              <option value="rejected">{STATUS_LABELS.rejected}</option>
              <option value="approved">{STATUS_LABELS.approved}</option>
              <option value="missing">{STATUS_LABELS.missing}</option>
            </select>
          </label>
          <label className="field mb-0" htmlFor="audio-part-filter">
            <span>الجزء</span>
            <select
              id="audio-part-filter"
              value={partFilter}
              onChange={(event) =>
                setPartFilter(event.target.value as typeof partFilter)
              }
            >
              <option value="all">كل الأجزاء</option>
              {PARTS.map((part) => (
                <option key={part} value={part}>
                  {PART_LABELS[part]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {visibleParts.length === 0 ? (
        <p className="panel text-[15px]">
          لا توجد مقاطع تطابق التصفية الحالية. غيّري الحالة أو الجزء لعرض
          المقاطع.
        </p>
      ) : (
        visibleParts.map((group) => (
          <section
            key={group.part}
            aria-labelledby={`part-${group.part}`}
            className="mb-8"
          >
            <h2 id={`part-${group.part}`} className="mb-4">
              {PART_LABELS[group.part]}
            </h2>
            <motion.div
              className="flex flex-col gap-4"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: reduceMotion ? 0 : 0.04,
                  },
                },
              }}
            >
              <AnimatePresence mode="popLayout">
                {group.segments.map((segment) => (
                  <SegmentCard
                    key={segment.id}
                    segment={segment}
                    busy={busyId === segment.id}
                    feedback={feedback[segment.id] || ""}
                    error={errors[segment.id] || ""}
                    onApprove={() => {
                      void decide(segment, "approve");
                    }}
                    onReject={(reason) => decide(segment, "reject", reason)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </section>
        ))
      )}
    </section>
  );
}
