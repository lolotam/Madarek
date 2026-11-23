"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

let stopActiveClip: (() => void) | null = null;

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
    stopActiveClip?.();
    setUnavailable(false);

    const recording = new Audio(`/english/audio/${clip}.mp3`);
    let speaking = false;
    let active = true;

    function stop() {
      if (!active) return;
      active = false;
      recording.pause();
      if (speaking) window.speechSynthesis.cancel();
      if (stopActiveClip === stop) stopActiveClip = null;
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
        utterance.rate = 0.85;
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
    stopActiveClip = stop;
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
