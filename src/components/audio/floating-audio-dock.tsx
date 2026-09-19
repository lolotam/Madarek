"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Headphones,
  LoaderCircle,
  Pause,
  Play,
  RotateCw,
  SkipBack,
  SkipForward,
  Minus,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAudio } from "./audio-provider";

function toArabicDigits(value: number) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

const tap = { scale: 0.96 };

function subscribeCompact(onStoreChange: () => void) {
  const media = window.matchMedia("(max-width: 1199px)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getCompactSnapshot() {
  return window.matchMedia("(max-width: 1199px)").matches;
}

function getCompactServerSnapshot() {
  return false;
}

export function FloatingAudioDock() {
  const reduce = useReducedMotion();
  const press = reduce ? undefined : tap;
  const dockRef = useRef<HTMLElement>(null);
  const wasActiveRef = useRef(false);
  const compact = useSyncExternalStore(
    subscribeCompact,
    getCompactSnapshot,
    getCompactServerSnapshot,
  );
  const {
    status,
    error,
    hasReadySegments,
    segmentIndex,
    segmentCount,
    canPrevious,
    canNext,
    retry,
    playPage,
    pause,
    resume,
    replaySegment,
    previous,
    next,
  } = useAudio();
  const [userPinned, setUserPinned] = useState<"min" | "open" | null>(null);

  const isActivePlayback = status === "starting" || status === "playing";
  useEffect(() => {
    if (isActivePlayback && !wasActiveRef.current) {
      setUserPinned(null);
    }
    wasActiveRef.current = isActivePlayback;
  }, [isActivePlayback]);

  const minimized =
    userPinned === "min" ||
    (userPinned !== "open" && compact && !isActivePlayback);

  useEffect(() => {
    const mode = minimized ? "min" : "open";
    document.documentElement.setAttribute("data-audio-dock", mode);
    return () => {
      document.documentElement.removeAttribute("data-audio-dock");
      document.documentElement.style.removeProperty("--audio-dock-clearance");
    };
  }, [minimized]);

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const apply = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--audio-dock-clearance",
        `calc(${height}px + 16px + env(safe-area-inset-bottom, 0px))`,
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minimized, status, segmentCount, error, hasReadySegments, compact]);

  const canControl =
    hasReadySegments && status !== "loading" && status !== "not_ready";
  const playing = status === "playing";
  const paused = status === "paused";
  const queueActive = segmentCount > 0;
  const canReplay = canControl && queueActive;

  let message = "";
  if (status === "loading") message = "جارٍ تجهيز الشرح الصوتي…";
  else if (status === "not_ready") message = "الشرح الصوتي غير جاهز بعد";
  else if (status === "error") message = error || "تعذّر تحميل الشرح الصوتي.";
  else if (status === "starting") message = "جارٍ التشغيل…";
  else if (playing) message = "التشغيل جارٍ";
  else if (paused) message = "متوقف مؤقتًا";
  else if (status === "ready") message = "جاهز للتشغيل";

  const playLabel =
    playing || status === "starting"
      ? "إيقاف مؤقت"
      : paused
        ? "إكمال"
        : "تشغيل";

  const onPrimary = () => {
    if (playing || status === "starting") pause();
    else if (paused) resume();
    else playPage();
  };

  const classes = [
    "audio-dock",
    status === "not_ready" ? "audio-dock-unavailable" : "",
    minimized ? "audio-dock-minimized" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const primaryButton = canControl ? (
    <motion.button
      type="button"
      className="icon-button"
      onClick={onPrimary}
      disabled={!canControl}
      aria-label={playLabel}
      whileTap={press}
    >
      {playing || status === "starting" ? (
        <Pause size={18} />
      ) : (
        <Play size={18} />
      )}
    </motion.button>
  ) : null;

  return (
    <aside
      ref={dockRef}
      className={classes}
      role="region"
      aria-label="التحكم الصوتي العائم"
      data-audio-dock-status={status}
      data-audio-segment-index={segmentIndex}
      data-audio-segment-count={segmentCount}
    >
      {status === "not_ready" ? (
        <div className="audio-dock-status" role="status">
          الشرح الصوتي غير جاهز بعد
        </div>
      ) : minimized ? (
        <div className="audio-dock-pill">
          {primaryButton}
          {status === "loading" && (
            <motion.span
              className="audio-player-spinner"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                ease: "linear",
              }}
            >
              <LoaderCircle size={16} />
            </motion.span>
          )}
          <motion.button
            type="button"
            className="icon-button audio-dock-restore"
            onClick={() => setUserPinned("open")}
            aria-label="توسيع التحكم الصوتي"
            aria-expanded={false}
            whileTap={press}
          >
            <Headphones size={18} />
          </motion.button>
        </div>
      ) : (
        <>
          <div className="audio-dock-head">
            <div className="audio-dock-status" role="status">
              {status === "loading" || status === "starting" ? (
                <motion.span
                  className="audio-player-spinner"
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: "linear",
                  }}
                >
                  <LoaderCircle size={16} />
                </motion.span>
              ) : (
                <Headphones size={16} />
              )}
              <span>{message}</span>
            </div>
            <motion.button
              type="button"
              className="icon-button audio-dock-minimize"
              onClick={() => setUserPinned("min")}
              aria-label="تصغير التحكم الصوتي"
              aria-expanded={true}
              whileTap={press}
            >
              <Minus size={16} />
            </motion.button>
          </div>
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
          {queueActive ? (
            <p className="audio-dock-index">
              المقطع {toArabicDigits(segmentIndex + 1)} من{" "}
              {toArabicDigits(segmentCount)}
            </p>
          ) : canControl ? (
            <p className="audio-dock-index">اضغطي تشغيل لنبدأ الشرح</p>
          ) : null}
          {canControl && (
            <div className="audio-dock-controls">
              {primaryButton}
              <motion.button
                type="button"
                className="button small outline audio-dock-replay"
                onClick={replaySegment}
                disabled={!canReplay}
                aria-label="إعادة المقطع"
                whileTap={press}
              >
                <RotateCw size={16} />
                إعادة المقطع
              </motion.button>
              <motion.button
                type="button"
                className="icon-button"
                onClick={previous}
                disabled={!canPrevious}
                aria-label="المقطع السابق"
                whileTap={press}
              >
                <SkipForward size={18} />
              </motion.button>
              <motion.button
                type="button"
                className="icon-button"
                onClick={next}
                disabled={!canNext}
                aria-label="المقطع التالي"
                whileTap={press}
              >
                <SkipBack size={18} />
              </motion.button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
