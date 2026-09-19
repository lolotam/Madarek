"use client";

import {
  Headphones,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAudio, type RepeatMode, type SpeedRate } from "./audio-provider";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "٠:٠٠";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const tap = { scale: 0.96 };

export function PlayerBar() {
  const reduce = useReducedMotion();
  const press = reduce ? undefined : tap;
  const {
    status,
    error,
    follow,
    speed,
    repeat,
    currentTime,
    duration,
    hasReadySegments,
    retry,
    setFollow,
    setSpeed,
    setRepeat,
    playPage,
    pause,
    resume,
    stop,
    restart,
    previous,
    next,
    seek,
  } = useAudio();

  const busy = status === "loading" || status === "starting";
  const canControl =
    hasReadySegments && status !== "loading" && status !== "not_ready";
  const playing = status === "playing";

  let message = "";
  if (status === "loading") message = "جارٍ تجهيز الشرح الصوتي…";
  else if (status === "not_ready") message = "الشرح الصوتي غير جاهز بعد";
  else if (status === "error") message = error || "تعذّر تحميل الشرح الصوتي.";
  else if (status === "starting") message = "جارٍ التشغيل…";
  else if (playing) message = "التشغيل جارٍ";

  return (
    <motion.div
      className="audio-player"
      layout
      role="region"
      aria-label="المشغّل الصوتي"
      data-audio-player-status={status}
    >
      <AnimatePresence mode="wait">
        {message ? (
          <motion.div
            key={status}
            className="audio-player-status"
            role="status"
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.2 }}
          >
            {message}
            {status === "error" && (
              <motion.button
                type="button"
                className="button small outline"
                onClick={retry}
                whileTap={press}
              >
                إعادة المحاولة
              </motion.button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="audio-player-main">
        <motion.button
          type="button"
          className="button small primary audio-play-page"
          onClick={playPage}
          disabled={!canControl || busy}
          aria-label="تشغيل شرح: الصفحة"
          whileTap={press}
        >
          <Headphones size={16} />
          اسمعي الصفحة
        </motion.button>
        <motion.button
          type="button"
          className="icon-button"
          onClick={() => {
            if (playing) pause();
            else if (status === "paused") resume();
            else playPage();
          }}
          disabled={!canControl}
          aria-label={
            playing
              ? "إيقاف مؤقت"
              : status === "starting"
                ? "جارٍ التشغيل"
                : "تشغيل"
          }
          whileTap={press}
        >
          {busy ? (
            <motion.span
              className="audio-player-spinner"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                ease: "linear",
              }}
            >
              <LoaderCircle size={18} />
            </motion.span>
          ) : playing ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </motion.button>
        <motion.button
          type="button"
          className="icon-button"
          onClick={stop}
          disabled={!canControl || status === "ready"}
          aria-label="إيقاف"
          whileTap={press}
        >
          <Square size={16} />
        </motion.button>
        <motion.button
          type="button"
          className="button small outline audio-restart"
          onClick={restart}
          disabled={!canControl}
          aria-label="من الأول"
          whileTap={press}
        >
          <RotateCcw size={16} />
          من الأول
        </motion.button>
        <motion.button
          type="button"
          className="icon-button"
          onClick={previous}
          disabled={!canControl || (!playing && status !== "paused")}
          aria-label="المقطع السابق"
          whileTap={press}
        >
          <SkipForward size={18} />
        </motion.button>
        <motion.button
          type="button"
          className="icon-button"
          onClick={next}
          disabled={!canControl || (!playing && status !== "paused")}
          aria-label="المقطع التالي"
          whileTap={press}
        >
          <SkipBack size={18} />
        </motion.button>
      </div>
      <div className="audio-player-tools">
        <label className="audio-seek">
          <span className="audio-tool-label">موضع التشغيل</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={Math.min(currentTime, duration || 0)}
            disabled={!canControl || duration <= 0}
            onChange={(e) => seek(Number(e.target.value))}
            aria-valuetext={`${formatTime(currentTime)} من ${formatTime(duration)}`}
          />
          <span className="audio-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </label>
        <label className="audio-select">
          <span className="audio-tool-label">السرعة</span>
          <select
            value={String(speed)}
            disabled={!canControl}
            onChange={(e) => setSpeed(Number(e.target.value) as SpeedRate)}
            aria-label="سرعة التشغيل"
          >
            <option value="0.75">٠٫٧٥×</option>
            <option value="1">١×</option>
            <option value="1.25">١٫٢٥×</option>
          </select>
        </label>
        <label className="audio-select">
          <span className="audio-tool-label">التكرار</span>
          <select
            value={repeat === "loop" ? "loop" : String(repeat)}
            disabled={!canControl}
            onChange={(e) => {
              const value = e.target.value;
              setRepeat(
                value === "loop" ? "loop" : (Number(value) as RepeatMode),
              );
            }}
            aria-label="تكرار التشغيل"
          >
            <option value="1">مرة</option>
            <option value="2">مرتان</option>
            <option value="3">ثلاث مرات</option>
            <option value="loop">مستمر</option>
          </select>
        </label>
        <label className="audio-follow">
          <input
            type="checkbox"
            checked={follow}
            onChange={(e) => setFollow(e.target.checked)}
          />
          تتبّع الشرح
        </label>
      </div>
    </motion.div>
  );
}
