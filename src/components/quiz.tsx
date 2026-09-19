"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Trophy,
  Lightbulb,
  Check,
  LoaderCircle,
  Headphones,
} from "lucide-react";
import { api, useSession } from "./providers";
import { useAudio } from "./audio/audio-provider";
import {
  quizFillTarget,
  quizOptionTarget,
  quizQuestionTarget,
  resultDetailTarget,
  resultReviewTarget,
  resultScoreTarget,
} from "@/content/audio-targets";
type Question = {
  id: string;
  kind: string;
  prompt: string;
  options?: [string, string][];
};
export type Result = {
  id?: string;
  score: number;
  correct: number;
  total: number;
  preview?: boolean;
  review: string[];
  createdAt?: number;
  audioGrant?: string;
  details: {
    id: string;
    prompt: string;
    submitted: string;
    answer: string;
    correct: boolean;
    explanation: string;
    concept: string;
  }[];
};
export function ResultDetails({ result }: { result: Result }) {
  return (
    <div className="result-details">
      {result.details.map((d, i) => (
        <details key={d.id} data-audio-target={resultDetailTarget(d.id).id}>
          <summary>
            <span className={d.correct ? "success-text" : "retry-text"}>
              {d.correct ? <CheckCircle2 size={19} /> : <Lightbulb size={19} />}
            </span>
            <span>
              {i + 1}. {d.prompt}
            </span>
          </summary>
          <div>
            <p>
              <b>إجابتك:</b> {d.submitted || "لم تُجب"}
            </p>
            <p>
              <b>الإجابة الصحيحة:</b> {d.answer}
            </p>
            <p>{d.explanation}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
export function Quiz({ onComplete }: { onComplete?: () => void }) {
  const { user } = useSession();
  const { registerReveal, notifyManualOverride, setAudioGrant, playResults } =
    useAudio();
  const [questions, setQuestions] = useState<Question[]>([]),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const attemptId = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    api("quiz")
      .then((d) => setQuestions(d.questions))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    return registerReveal((reveal) => {
      if (reveal.kind !== "quiz-question") return;
      setIndex((current) => {
        const next = questions.findIndex((q) => q.id === reveal.question);
        return next >= 0 ? next : current;
      });
    });
  }, [registerReveal, questions]);
  async function submit() {
    const unanswered = questions.filter((q) => !answers[q.id]?.trim()).length;
    if (unanswered && !confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setError("");
    attemptId.current ||= crypto.randomUUID();
    try {
      const nextResult = await api("quiz", { id: attemptId.current, answers });
      setResult(nextResult);
      if (typeof nextResult.audioGrant === "string") {
        setAudioGrant(nextResult.audioGrant);
      }
      if (!nextResult.preview) onComplete?.();
      setTimeout(() => heading.current?.focus(), 40);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="quiz-card result-card">
        <div className="result-icon">
          <Trophy size={38} />
        </div>
        <span className="eyebrow">كل محاولة خطوة إلى الأمام</span>
        <h3 ref={heading} tabIndex={-1}>
          {result.score >= 80
            ? "أحسنتِ، اكتشافات رائعة!"
            : "بداية جميلة، لنكمل الفهم!"}
        </h3>
        <div className="result-score" data-audio-target={resultScoreTarget.id}>
          {result.score.toLocaleString("ar-KW")}
          <small>٪</small>
        </div>
        <p>
          {result.correct.toLocaleString("ar-KW")} إجابات صحيحة من{" "}
          {result.total.toLocaleString("ar-KW")}
        </p>
        <p className="save-label">
          {result.preview
            ? "هذه تجربة غير محفوظة. ادخلي بحساب الطالب لحفظ المحاولات."
            : "حُفظت محاولتك ويمكن لولي أمرك متابعتها."}
        </p>
        {result.review.length > 0 && (
          <div className="review-box" data-audio-target={resultReviewTarget.id}>
            <b>نراجع معًا:</b>
            <div className="feature-tags">
              {result.review.map((r) => (
                <span key={r}>{r}</span>
              ))}
            </div>
            <a className="text-link" href="#map">
              العودة إلى شجرة المفاهيم <ArrowLeft size={16} />
            </a>
          </div>
        )}
        <ResultDetails result={result} />
        <button
          type="button"
          className="button outline"
          onClick={() => playResults(result)}
          aria-label="تشغيل شرح: النتيجة"
        >
          <Headphones size={18} /> اسمعي النتيجة
        </button>
        <button
          className="button primary"
          onClick={() => {
            setAnswers({});
            setResult(null);
            setIndex(0);
            setConfirm(false);
            attemptId.current = "";
          }}
        >
          <RotateCcw size={18} /> محاولة جديدة
        </button>
      </div>
    );
  if (!questions.length)
    return (
      <div className="quiz-card" role="status">
        {error || "جارٍ تجهيز الأسئلة…"}
        {error && (
          <button
            className="button outline"
            onClick={() => {
              setError("");
              api("quiz")
                .then((d) => setQuestions(d.questions))
                .catch((e) => setError(e.message));
            }}
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  const q = questions[index],
    answered = Object.values(answers).filter((v) => v.trim()).length;
  return (
    <div className="quiz-card">
      <div className="quiz-top">
        <span className="pill green">
          {q.kind === "choice" ? "اختاري الإجابة الصحيحة" : "أكملي الفراغ"}
        </span>
        <span>
          السؤال {(index + 1).toLocaleString("ar-KW")} من{" "}
          {questions.length.toLocaleString("ar-KW")}
        </span>
      </div>
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label="الأسئلة المجابة"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={questions.length}
      >
        <span style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>
      <fieldset data-audio-target={quizQuestionTarget(q.id).id}>
        <legend>{q.prompt}</legend>
        {q.kind === "choice" ? (
          <div className="quiz-choices">
            {q.options?.map(([value, label], i) => (
              <label
                className={
                  "quiz-choice " + (answers[q.id] === value ? "selected" : "")
                }
                key={value}
                data-audio-target={quizOptionTarget(q.id, value).id}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={value}
                  checked={answers[q.id] === value}
                  onChange={() => {
                    setAnswers({ ...answers, [q.id]: value });
                    setConfirm(false);
                  }}
                />
                <span className="choice-letter">{["أ", "ب", "ج"][i]}</span>
                <span>{label}</span>
                {answers[q.id] === value && <Check size={21} />}
              </label>
            ))}
          </div>
        ) : (
          <label className="field">
            <span>إجابتك</span>
            <input
              autoComplete="off"
              maxLength={100}
              data-audio-target={quizFillTarget(q.id).id}
              value={answers[q.id] || ""}
              onChange={(e) => {
                setAnswers({ ...answers, [q.id]: e.target.value });
                setConfirm(false);
              }}
              placeholder="اكتبي الكلمة المناسبة"
            />
          </label>
        )}
      </fieldset>
      <div className="quiz-pagination" aria-label="الانتقال بين الأسئلة">
        {questions.map((question, i) => (
          <button
            key={question.id}
            onClick={() => {
              notifyManualOverride();
              setIndex(i);
              setConfirm(false);
            }}
            className={
              (i === index ? "current " : "") +
              (answers[question.id]?.trim() ? "answered" : "")
            }
            aria-label={`السؤال ${i + 1}${answers[question.id]?.trim() ? " — مجاب" : ""}`}
            aria-current={i === index ? "step" : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {confirm && (
        <p role="alert" className="feedback retry">
          لديك {questions.length - answered} أسئلة دون إجابة وستُحسب صفرًا.
          راجعيها أو اضغطي «تأكيد التسليم».
        </p>
      )}
      <div className="quiz-actions">
        <button
          className="button outline"
          onClick={() => {
            notifyManualOverride();
            setIndex(index - 1);
          }}
          disabled={index === 0 || busy}
        >
          <ArrowRight size={18} /> السابق
        </button>
        {index < questions.length - 1 ? (
          <button
            className="button primary"
            onClick={() => {
              notifyManualOverride();
              setIndex(index + 1);
            }}
          >
            التالي <ArrowLeft size={18} />
          </button>
        ) : (
          <button className="button primary" disabled={busy} onClick={submit}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Trophy size={18} />
            )}{" "}
            {busy
              ? "جارٍ التصحيح…"
              : confirm
                ? "تأكيد التسليم"
                : "اكتشفي نتيجتك"}
          </button>
        )}
      </div>
      <p className="micro-copy">
        لا يوجد مؤقّت. خذي وقتك، ويمكنك العودة لأي سؤال قبل التسليم.
        {user?.role !== "student" && " ادخلي بحساب الطالب لحفظ النتيجة."}
      </p>
    </div>
  );
}
