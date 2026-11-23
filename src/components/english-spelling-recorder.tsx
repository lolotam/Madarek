"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EnglishAnswerRecording } from "./english-audio";

const seconds = 12;
const rate = 16000;

async function toWav(context: AudioContext, recording: Blob) {
  const source = await context.decodeAudioData(await recording.arrayBuffer());
  const frames = Math.min(rate * seconds, Math.round(source.duration * rate));
  if (frames < rate / 2)
    throw new Error("التسجيل قصير. قول الحروف واحدة واحدة.");
  const offline = new OfflineAudioContext(1, frames, rate);
  const track = offline.createBufferSource();
  track.buffer = source;
  track.connect(offline.destination);
  track.start();
  const wave = (await offline.startRendering()).getChannelData(0);
  const bytes = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(bytes);
  function tag(offset: number, text: string) {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  }
  tag(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  tag(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, frames * 2, true);
  for (let i = 0; i < frames; i++) {
    const sample = Math.max(-1, Math.min(1, wave[i]));
    view.setInt16(44 + 2 * i, Math.round(sample * 32767), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export type SpellingReview = {
  transcript: string;
  answer: string;
  receipt: string;
};

type Capture = {
  context: AudioContext;
  stream?: MediaStream;
  recorder?: MediaRecorder;
  timer?: ReturnType<typeof setTimeout>;
};
function release(capture: Capture) {
  clearTimeout(capture.timer);
  capture.stream?.getTracks().forEach((track) => track.stop());
  void capture.context.close().catch(() => {});
}

export function EnglishSpellingRecorder({
  onEvaluate,
  busy,
}: {
  onEvaluate: (
    wav: Blob,
    nonce: string,
    receipt?: string,
  ) => Promise<SpellingReview | undefined>;
  busy: boolean;
}) {
  const capture = useRef<Capture | null>(null);
  const live = useRef(true);
  const [phase, setPhase] = useState<
    "idle" | "requesting" | "recording" | "preparing"
  >("idle");
  const [draft, setDraft] = useState<{
    wav: Blob;
    nonce: string;
    url: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<SpellingReview | null>(null);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      const take = capture.current;
      capture.current = null;
      if (take) release(take);
    };
  }, []);
  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.url);
    },
    [draft],
  );

  async function record() {
    if (capture.current) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("المتصفح مش بيدعم التسجيل هنا. تقدر تكتب إجابتك.");
      return;
    }
    setDraft(null);
    setReview(null);
    setError("");
    setPhase("requesting");
    let take: Capture | undefined;
    try {
      take = { context: new AudioContext() };
      const current = take;
      capture.current = current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      current.stream = stream;
      if (capture.current !== current || !live.current) {
        release(current);
        return;
      }
      const recorder = new MediaRecorder(stream);
      current.recorder = recorder;
      const parts: Blob[] = [];
      recorder.ondataavailable = ({ data }) => {
        if (data.size) parts.push(data);
      };
      recorder.onerror = () => {
        if (capture.current !== current) return;
        capture.current = null;
        release(current);
        setPhase("idle");
        setError("تعذّر التسجيل. جرّب تاني.");
      };
      recorder.onstop = async () => {
        if (capture.current !== current) return;
        clearTimeout(current.timer);
        stream.getTracks().forEach((track) => track.stop());
        setPhase("preparing");
        try {
          const wav = await toWav(
            current.context,
            new Blob(parts, { type: recorder.mimeType }),
          );
          if (live.current)
            setDraft({
              wav,
              nonce: crypto.randomUUID(),
              url: URL.createObjectURL(wav),
            });
        } catch (cause) {
          if (live.current)
            setError(
              (cause as Error).message.includes("التسجيل قصير")
                ? "التسجيل قصير. قول الحروف واحدة واحدة."
                : "تعذّر تجهيز التسجيل. جرّب تاني.",
            );
        } finally {
          release(current);
          if (capture.current === current) capture.current = null;
          if (live.current) setPhase("idle");
        }
      };
      recorder.start();
      current.timer = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, seconds * 1000);
      setPhase("recording");
    } catch {
      if (take) release(take);
      capture.current = null;
      if (live.current) {
        setPhase("idle");
        setError("الميكروفون غير متاح. اسمح بالتسجيل أو اكتب الإجابة.");
      }
    }
  }

  async function evaluate() {
    if (!draft) return;
    try {
      const heard = await onEvaluate(draft.wav, draft.nonce, review?.receipt);
      if (heard) setReview(heard);
    } catch {
      setReview(null);
    }
  }

  return (
    <div className="school-spelling">
      <strong>جاوب بصوتك</strong>
      <p>
        قول الحروف بالإنجليزي واحدة واحدة. التسجيل بيتحفظ على حسابك لما ترسله.
      </p>
      <div className="school-question-audio">
        {phase === "recording" ? (
          <button
            type="button"
            className="button outline small"
            onClick={() => capture.current?.recorder?.stop()}
          >
            <Square size={16} aria-hidden /> أوقف التسجيل
          </button>
        ) : (
          <button
            type="button"
            className="button outline small"
            disabled={busy || phase !== "idle"}
            onClick={record}
          >
            <Mic size={18} aria-hidden />{" "}
            {draft ? "سجّل من جديد" : "سجّل تهجئتك"}
          </button>
        )}
        {draft && (
          <button
            type="button"
            className="button primary small"
            disabled={busy}
            onClick={evaluate}
          >
            {busy
              ? "جارٍ المعالجة…"
              : review
                ? "قيّم التسجيل واحفظه"
                : "شوف الحروف اللي اتسمعت"}
          </button>
        )}
      </div>
      {review && (
        <div role="status">
          <p>
            اللي اتسمع · <bdi lang="en">{review.transcript}</bdi>
          </p>
          <p>راجع الحروف قبل الحفظ. لو مختلفة عن اللي قلته، سجّل من جديد.</p>
        </div>
      )}
      {draft && (
        <EnglishAnswerRecording
          src={draft.url}
          label="اسمع تسجيلك قبل الإرسال"
          preload="metadata"
        />
      )}
      {error && <p role="alert">{error}</p>}
      {phase === "recording" && (
        <p role="status">التسجيل شغّال، لحد ١٢ ثانية.</p>
      )}
      {phase === "preparing" && <p role="status">بنجهّز التسجيل…</p>}
    </div>
  );
}
