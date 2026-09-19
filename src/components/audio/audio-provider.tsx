"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AudioManifest,
  ManifestSegment,
  NarrationPart,
  ResolvedCue,
} from "@/content/narration-contract";
import type { AudioReveal } from "@/content/audio-targets";
import { resolveAudioTarget } from "./resolve-target";
import {
  pageQueue,
  partQueue,
  resultsQueue,
  type ReadySegment,
  type ResultNarration,
} from "./results-sequence";
import { HighlightOverlay } from "./highlight-overlay";

export type RepeatMode = 1 | 2 | 3 | "loop";
export type SpeedRate = 0.75 | 1 | 1.25;
export type PlayerStatus =
  | "loading"
  | "not_ready"
  | "error"
  | "ready"
  | "starting"
  | "playing"
  | "paused";

type QueueKind = "page" | "part" | "results";

type AudioApi = {
  status: PlayerStatus;
  error: string | null;
  follow: boolean;
  speed: SpeedRate;
  repeat: RepeatMode;
  currentTime: number;
  duration: number;
  activeTarget: string | null;
  hasReadySegments: boolean;
  retry: () => void;
  setFollow: (value: boolean) => void;
  setSpeed: (rate: SpeedRate) => void;
  setRepeat: (mode: RepeatMode) => void;
  playPage: () => void;
  playPart: (part: NarrationPart, segmentId?: string) => void;
  playResults: (result: ResultNarration) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  restart: () => void;
  previous: () => void;
  next: () => void;
  seek: (time: number) => void;
  canPlayPart: (part: NarrationPart) => boolean;
  registerReveal: (handler: (reveal: AudioReveal) => void) => () => void;
  notifyManualOverride: () => void;
  setAudioGrant: (grant?: string) => void;
};

const AudioCtx = createContext<AudioApi | null>(null);

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}

function cueAtTime(cues: ResolvedCue[], time: number): ResolvedCue | null {
  const covering = cues.filter((cue) => cue.start <= time && time < cue.end);
  if (covering.length) return covering[covering.length - 1];
  const started = cues.filter((cue) => cue.start <= time);
  return started.at(-1) ?? null;
}

function hasReady(list: ManifestSegment[]) {
  return list.some((segment) => segment.status === "ready");
}

export function AudioProvider({
  page = "nutrients",
  children,
}: {
  page?: string;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);
  const rafRef = useRef(0);
  const queueRef = useRef<ReadySegment[]>([]);
  const indexRef = useRef(0);
  const passesRef = useRef(0);
  const kindRef = useRef<QueueKind | null>(null);
  const partRef = useRef<NarrationPart | undefined>(undefined);
  const segmentIdRef = useRef<string | undefined>(undefined);
  const resultRef = useRef<ResultNarration | null>(null);
  const speedRef = useRef<SpeedRate>(1);
  const repeatRef = useRef<RepeatMode>(1);
  const followRef = useRef(true);
  const statusRef = useRef<PlayerStatus>("loading");
  const cueKeyRef = useRef<string | null>(null);
  const listenersRef = useRef(new Set<(reveal: AudioReveal) => void>());
  const segmentsRef = useRef<ManifestSegment[]>([]);
  const switchingRef = useRef(false);
  const playTokenRef = useRef(0);

  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [follow, setFollowState] = useState(true);
  const [speed, setSpeedState] = useState<SpeedRate>(1);
  const [repeat, setRepeatState] = useState<RepeatMode>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [segments, setSegments] = useState<ManifestSegment[]>([]);
  const [grant, setGrant] = useState<string | undefined>(undefined);
  const [loadTick, setLoadTick] = useState(0);

  const setStatusBoth = useCallback((next: PlayerStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const abortFetches = useCallback(() => {
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = new AbortController();
  }, []);

  const bump = useCallback(
    (abortInFlight = false) => {
      generationRef.current += 1;
      if (abortInFlight) abortFetches();
      return generationRef.current;
    },
    [abortFetches],
  );

  const isLive = useCallback(
    (token: number) =>
      token === playTokenRef.current && token === generationRef.current,
    [],
  );

  const stopRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const clearHighlight = useCallback(() => {
    cueKeyRef.current = null;
    setActiveTarget(null);
  }, []);

  const applyCue = useCallback((cue: ResolvedCue | null) => {
    const key = cue ? `${cue.target}:${cue.start}:${cue.end}` : null;
    if (key === cueKeyRef.current) return;
    cueKeyRef.current = key;
    if (cue?.reveal) {
      const target = resolveAudioTarget(cue.target);
      if (target && target.reveal.kind !== "always") {
        for (const handler of listenersRef.current) handler(target.reveal);
      }
    }
    setActiveTarget(cue?.target ?? null);
  }, []);

  const syncFromAudio = useCallback(() => {
    const audio = audioRef.current;
    const segment = queueRef.current[indexRef.current];
    if (!audio || !segment) return;
    const time = audio.currentTime || 0;
    const length =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : segment.duration;
    setCurrentTime(time);
    setDuration(length);
    applyCue(cueAtTime(segment.cues, time));
  }, [applyCue]);

  const startRaf = useCallback(
    (token: number) => {
      stopRaf();
      const tick = () => {
        if (!isLive(token) || statusRef.current !== "playing") return;
        syncFromAudio();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [isLive, stopRaf, syncFromAudio],
  );

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  const idleAfterStop = useCallback(() => {
    if (statusRef.current === "loading" || statusRef.current === "not_ready") {
      return;
    }
    setStatusBoth(hasReady(segmentsRef.current) ? "ready" : "not_ready");
  }, [setStatusBoth]);

  const playSegment = useCallback(
    (token: number, offset = 0) => {
      const audio = audioRef.current;
      const segment = queueRef.current[indexRef.current];
      if (!audio || !segment || !isLive(token)) return;
      cueKeyRef.current = null;
      switchingRef.current = true;
      audio.pause();
      audio.src = segment.url;
      audio.playbackRate = speedRef.current;
      setDuration(segment.duration);
      setCurrentTime(offset);
      const start = () => {
        if (!isLive(token)) return;
        if (offset > 0) {
          try {
            audio.currentTime = offset;
          } catch {
            /* loadedmetadata may still be settling */
          }
        }
        const attempt = audio.play();
        if (!attempt) {
          switchingRef.current = false;
          return;
        }
        attempt
          .catch((err: unknown) => {
            if (!isLive(token)) return;
            if (err instanceof DOMException && err.name === "AbortError")
              return;
            setError("تعذّر تشغيل الصوت. حاولي مجددًا.");
            setStatusBoth("error");
            stopRaf();
          })
          .finally(() => {
            if (isLive(token)) switchingRef.current = false;
          });
      };
      if (audio.readyState >= 1) start();
      else {
        const onMeta = () => {
          audio.removeEventListener("loadedmetadata", onMeta);
          start();
        };
        audio.addEventListener("loadedmetadata", onMeta);
      }
    },
    [isLive, setStatusBoth, stopRaf],
  );

  const buildQueue = useCallback((): ReadySegment[] => {
    const list = segmentsRef.current;
    if (kindRef.current === "part") {
      return partQueue(list, partRef.current ?? "map", segmentIdRef.current);
    }
    if (kindRef.current === "results" && resultRef.current) {
      return resultsQueue(list, resultRef.current);
    }
    return pageQueue(list);
  }, []);

  const finishPlayback = useCallback(() => {
    bump(true);
    stopRaf();
    switchingRef.current = false;
    releaseAudio();
    clearHighlight();
    setCurrentTime(0);
    setDuration(0);
    kindRef.current = null;
    idleAfterStop();
  }, [bump, stopRaf, releaseAudio, clearHighlight, idleAfterStop]);

  const advance = useCallback(() => {
    const queue = queueRef.current;
    if (!queue.length) {
      finishPlayback();
      return;
    }
    if (indexRef.current + 1 < queue.length) {
      indexRef.current += 1;
      const token = bump();
      playTokenRef.current = token;
      setStatusBoth("starting");
      playSegment(token);
      return;
    }
    passesRef.current += 1;
    const need = repeatRef.current === "loop" ? Infinity : repeatRef.current;
    if (passesRef.current < need) {
      indexRef.current = 0;
      const token = bump();
      playTokenRef.current = token;
      setStatusBoth("starting");
      playSegment(token);
      return;
    }
    finishPlayback();
  }, [bump, finishPlayback, playSegment, setStatusBoth]);

  const stop = useCallback(() => {
    bump(true);
    stopRaf();
    switchingRef.current = false;
    releaseAudio();
    clearHighlight();
    setCurrentTime(0);
    setDuration(0);
    idleAfterStop();
  }, [bump, stopRaf, releaseAudio, clearHighlight, idleAfterStop]);

  const advanceRef = useRef(advance);
  const syncRef = useRef(syncFromAudio);
  const startRafRef = useRef(startRaf);
  const isLiveRef = useRef(isLive);
  advanceRef.current = advance;
  syncRef.current = syncFromAudio;
  startRafRef.current = startRaf;
  isLiveRef.current = isLive;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlaying = () => {
      const token = playTokenRef.current;
      if (!isLiveRef.current(token)) return;
      switchingRef.current = false;
      setStatusBoth("playing");
      startRafRef.current(token);
      syncRef.current();
    };
    const onPlay = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      syncRef.current();
    };
    const onPause = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      stopRaf();
      syncRef.current();
      if (switchingRef.current) return;
      if (audio.ended) return;
      if (statusRef.current === "playing") setStatusBoth("paused");
    };
    const onSeeked = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      syncRef.current();
    };
    const onRate = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      syncRef.current();
    };
    const onTime = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      const segment = queueRef.current[indexRef.current];
      if (!segment) return;
      setCurrentTime(audio.currentTime || 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      if (switchingRef.current) return;
      advanceRef.current();
    };
    const onError = () => {
      if (!isLiveRef.current(playTokenRef.current)) return;
      if (!audio.getAttribute("src")) return;
      setError("تعذّر تشغيل الصوت. حاولي مجددًا.");
      setStatusBoth("error");
      stopRaf();
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("seeked", onSeeked);
    audio.addEventListener("ratechange", onRate);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("seeked", onSeeked);
      audio.removeEventListener("ratechange", onRate);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [setStatusBoth, stopRaf]);

  useEffect(() => {
    const abort = new AbortController();
    fetchAbortRef.current = abort;
    const fetchId = ++fetchIdRef.current;
    const hadReady = hasReady(segmentsRef.current);
    if (!hadReady || statusRef.current === "error") setStatusBoth("loading");
    setError(null);
    const url = `/api/audio/manifest?page=${encodeURIComponent(page)}${
      grant ? `&grant=${encodeURIComponent(grant)}` : ""
    }`;
    fetch(url, { signal: abort.signal })
      .then(async (res) => {
        if (fetchId !== fetchIdRef.current) return;
        if (res.status === 404) {
          segmentsRef.current = [];
          setSegments([]);
          setStatusBoth("not_ready");
          return;
        }
        if (!res.ok) {
          setError("تعذّر تحميل الشرح الصوتي.");
          setStatusBoth("error");
          return;
        }
        const body = (await res.json()) as AudioManifest;
        if (fetchId !== fetchIdRef.current) return;
        const list = body.segments ?? [];
        segmentsRef.current = list;
        setSegments(list);
        const playing =
          statusRef.current === "playing" ||
          statusRef.current === "paused" ||
          statusRef.current === "starting";
        if (playing) return;
        setStatusBoth(hasReady(list) ? "ready" : "not_ready");
      })
      .catch((err: unknown) => {
        if (abort.signal.aborted) return;
        if (fetchId !== fetchIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("تعذّر تحميل الشرح الصوتي.");
        setStatusBoth("error");
      });
    return () => {
      abort.abort();
    };
  }, [page, grant, loadTick, setStatusBoth]);

  useEffect(() => {
    return () => {
      bump(true);
      stopRaf();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, [bump, stopRaf]);

  const beginQueue = useCallback(
    (kind: QueueKind) => {
      const token = bump(true);
      playTokenRef.current = token;
      stopRaf();
      clearHighlight();
      kindRef.current = kind;
      queueRef.current = buildQueue();
      indexRef.current = 0;
      passesRef.current = 0;
      if (!queueRef.current.length) {
        idleAfterStop();
        return;
      }
      setStatusBoth("starting");
      playSegment(token);
    },
    [
      bump,
      stopRaf,
      clearHighlight,
      buildQueue,
      idleAfterStop,
      setStatusBoth,
      playSegment,
    ],
  );

  const playPage = useCallback(() => {
    segmentIdRef.current = undefined;
    partRef.current = undefined;
    resultRef.current = null;
    beginQueue("page");
  }, [beginQueue]);

  const playPart = useCallback(
    (part: NarrationPart, segmentId?: string) => {
      partRef.current = part;
      segmentIdRef.current = segmentId;
      resultRef.current = null;
      beginQueue("part");
    },
    [beginQueue],
  );

  const playResults = useCallback(
    (result: ResultNarration) => {
      resultRef.current = result;
      partRef.current = "result";
      segmentIdRef.current = undefined;
      beginQueue("results");
    },
    [beginQueue],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    const token = playTokenRef.current;
    if (!audio?.getAttribute("src") || !isLive(token)) return;
    setStatusBoth("starting");
    audio.play()?.catch((err: unknown) => {
      if (!isLive(token)) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("تعذّر تشغيل الصوت. حاولي مجددًا.");
      setStatusBoth("error");
    });
  }, [isLive, setStatusBoth]);

  const restart = useCallback(() => {
    if (!kindRef.current) {
      playPage();
      return;
    }
    const token = bump(true);
    playTokenRef.current = token;
    stopRaf();
    clearHighlight();
    indexRef.current = 0;
    passesRef.current = 0;
    queueRef.current = buildQueue();
    if (!queueRef.current.length) {
      idleAfterStop();
      return;
    }
    setStatusBoth("starting");
    playSegment(token);
  }, [
    playPage,
    bump,
    stopRaf,
    clearHighlight,
    buildQueue,
    idleAfterStop,
    setStatusBoth,
    playSegment,
  ]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queueRef.current.length) return;
    if (audio.currentTime > 1.5 || indexRef.current === 0) {
      audio.currentTime = 0;
      syncFromAudio();
      return;
    }
    indexRef.current -= 1;
    const token = bump();
    playTokenRef.current = token;
    setStatusBoth("starting");
    playSegment(token);
  }, [bump, playSegment, setStatusBoth, syncFromAudio]);

  const next = useCallback(() => {
    if (!queueRef.current.length) return;
    advance();
  }, [advance]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, time);
      syncFromAudio();
    },
    [syncFromAudio],
  );

  const setSpeed = useCallback((rate: SpeedRate) => {
    speedRef.current = rate;
    setSpeedState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const setRepeat = useCallback((mode: RepeatMode) => {
    repeatRef.current = mode;
    setRepeatState(mode);
  }, []);

  const setFollow = useCallback((value: boolean) => {
    followRef.current = value;
    setFollowState(value);
  }, []);

  const registerReveal = useCallback(
    (handler: (reveal: AudioReveal) => void) => {
      listenersRef.current.add(handler);
      return () => {
        listenersRef.current.delete(handler);
      };
    },
    [],
  );

  const notifyManualOverride = useCallback(() => {
    const current = statusRef.current;
    if (
      current === "playing" ||
      current === "paused" ||
      current === "starting"
    ) {
      stop();
    }
  }, [stop]);

  const setAudioGrant = useCallback((next?: string) => {
    if (!next) return;
    setGrant(next);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setLoadTick((tick) => tick + 1);
  }, []);

  const hasReadySegments = useMemo(() => hasReady(segments), [segments]);

  const canPlayPart = useCallback(
    (part: NarrationPart) =>
      hasReadySegments &&
      segments.some(
        (segment) => segment.status === "ready" && segment.part === part,
      ),
    [hasReadySegments, segments],
  );

  const api = useMemo<AudioApi>(
    () => ({
      status,
      error,
      follow,
      speed,
      repeat,
      currentTime,
      duration,
      activeTarget,
      hasReadySegments,
      retry,
      setFollow,
      setSpeed,
      setRepeat,
      playPage,
      playPart,
      playResults,
      pause,
      resume,
      stop,
      restart,
      previous,
      next,
      seek,
      canPlayPart,
      registerReveal,
      notifyManualOverride,
      setAudioGrant,
    }),
    [
      status,
      error,
      follow,
      speed,
      repeat,
      currentTime,
      duration,
      activeTarget,
      hasReadySegments,
      retry,
      setFollow,
      setSpeed,
      setRepeat,
      playPage,
      playPart,
      playResults,
      pause,
      resume,
      stop,
      restart,
      previous,
      next,
      seek,
      canPlayPart,
      registerReveal,
      notifyManualOverride,
      setAudioGrant,
    ],
  );

  return (
    <AudioCtx.Provider value={api}>
      <audio
        ref={audioRef}
        data-audio-engine="true"
        preload="auto"
        hidden
        aria-hidden="true"
      />
      <HighlightOverlay targetId={activeTarget} follow={follow} />
      {children}
    </AudioCtx.Provider>
  );
}
