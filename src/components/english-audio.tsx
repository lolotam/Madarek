"use client";

import { Gauge, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const speedOptions = [
  { rate: 0.5, label: "بطيء جدًا" },
  { rate: 0.75, label: "بطيء" },
  { rate: 1, label: "عادي" },
  { rate: 1.25, label: "أسرع" },
  { rate: 1.5, label: "سريع" },
];
const speedKey = "madarek.english.playback-rate";
const normalSpeed = 1;
const speedListeners = new Set<() => void>();
let sessionSpeed: number | undefined;
let activeClip: { stop: () => void; setSpeed: (rate: number) => void } | null =
  null;

function getSpeed() {
  if (sessionSpeed !== undefined) return sessionSpeed;
  try {
    const saved = Number(window.localStorage.getItem(speedKey));
    if (speedOptions.some(({ rate }) => rate === saved)) return saved;
  } catch {
    // Playback settings also work when storage is unavailable.
  }
  return normalSpeed;
}

function subscribeToSpeed(listener: () => void) {
  speedListeners.add(listener);
  return () => {
    speedListeners.delete(listener);
  };
}

function useSpeed() {
  return useSyncExternalStore(subscribeToSpeed, getSpeed, () => normalSpeed);
}

function setSpeed(rate: number) {
  sessionSpeed = rate;
  try {
    window.localStorage.setItem(speedKey, String(rate));
  } catch {
    // Keep the selection for the current page.
  }
  activeClip?.setSpeed(rate);
  speedListeners.forEach((listener) => listener());
}

function applySpeed(audio: HTMLAudioElement, rate: number) {
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
  audio.preservesPitch = true;
}

export function EnglishAudioSpeed() {
  const speed = useSpeed();
  return (
    <label className="school-audio-speed">
      <Gauge size={19} aria-hidden />
      سرعة النطق
      <select
        value={speed}
        onChange={(event) => setSpeed(Number(event.target.value))}
      >
        {speedOptions.map(({ rate, label }) => (
          <option key={rate} value={rate}>
            {label} · {rate}×
          </option>
        ))}
      </select>
    </label>
  );
}

export function EnglishAnswerRecording({
  src,
  label,
  preload = "none",
}: {
  src: string;
  label: string;
  preload?: "none" | "metadata";
}) {
  const speed = useSpeed();
  return (
    <audio
      controls
      preload={preload}
      src={src}
      aria-label={label}
      ref={(audio) => {
        if (audio) applySpeed(audio, speed);
      }}
    />
  );
}

export function EnglishAudioButton({
  clip,
  label,
  text,
  compact = false,
  transcript = false,
}: {
  clip: string;
  label: string;
  text: string;
  compact?: boolean;
  transcript?: boolean;
}) {
  const stopClip = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => () => stopClip.current?.(), [clip]);

  function toggle() {
    if (stopClip.current) {
      stopClip.current();
      return;
    }
    activeClip?.stop();
    setUnavailable(false);

    const recording = new Audio(`/english/audio/${clip}.mp3`);
    applySpeed(recording, getSpeed());
    let speaking = false;
    let active = true;

    function stop() {
      if (!active) return;
      active = false;
      recording.pause();
      if (speaking) window.speechSynthesis.cancel();
      if (activeClip?.stop === stop) activeClip = null;
      stopClip.current = null;
      setPlaying(false);
    }

    async function play() {
      try {
        await recording.play();
      } catch {
        if (!active) return;
        const speech = window.speechSynthesis;
        if (
          !speech ||
          !text.trim() ||
          typeof SpeechSynthesisUtterance === "undefined" ||
          speech.getVoices().length === 0
        ) {
          stop();
          setUnavailable(true);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(
          text.replace(/_{2,}/g, " blank "),
        );
        utterance.lang = "en-GB";
        utterance.rate = 0.85 * getSpeed();
        utterance.onend = stop;
        utterance.onerror = () => {
          if (!active) return;
          stop();
          setUnavailable(true);
        };
        speaking = true;
        speech.speak(utterance);
      }
    }

    recording.onended = stop;
    stopClip.current = stop;
    activeClip = { stop, setSpeed: (rate) => applySpeed(recording, rate) };
    setPlaying(true);
    void play();
  }

  return (
    <div className="school-clip" dir="rtl" lang="ar">
      <button
        className={compact ? "school-clip-icon" : "button outline small"}
        type="button"
        aria-label={playing ? "أوقف الصوت" : label}
        onClick={toggle}
      >
        {playing ? (
          <Square size={16} aria-hidden />
        ) : (
          <Volume2 size={18} aria-hidden />
        )}
        {!compact && (playing ? "أوقف الصوت" : label)}
      </button>
      {unavailable && (
        <div className="school-clip-status" role="status">
          الصوت غير متاح.
          {transcript && (
            <p dir="ltr" lang="en">
              {text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
