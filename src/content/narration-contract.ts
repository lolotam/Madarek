// Shared contract for audio narration (docs/AUDIO-NARRATION-DESIGN.md).
// Types only: no narration text or answers live here, so client code may
// import it. Narration scripts themselves are server-only JSON under
// src/server/narration/ and reach the browser only through the manifest API.

/** One narrated clip: a fixed, reviewed Egyptian-Arabic script. */
export type NarrationSegment = {
  /** Stable id, e.g. "map.intro", "result.score.7". Never reuse for other text. */
  id: string;
  page: "nutrients";
  /** Lesson part used by "play this part": map | explore | practice | quiz | result. */
  part: NarrationPart;
  /** Order within the page when playing the whole page. */
  order: number;
  /** Bump when `text` or `cues` change; part of the storage hash. */
  version: number;
  /** Exact text sent to text-to-speech. */
  text: string;
  cues: NarrationCue[];
  /**
   * "answer": reveals model answers/explanations. Served only with a valid
   * results grant (see AudioManifest). Omitted from manifests without one.
   */
  protected?: "answer";
};

export type NarrationPart = "map" | "explore" | "practice" | "quiz" | "result";

/** Highlights a registry target while `phrase` is being spoken. */
export type NarrationCue = {
  /** Exact substring of the segment text. Timing comes from provider alignment. */
  phrase: string;
  /** 1-based occurrence of `phrase` in the text when it repeats. Default 1. */
  occurrence?: number;
  /** Id from src/content/audio-targets.ts (static or quiz helper id). */
  target: string;
  /** Drive the UI into the target's reveal state (open tab, select food…). Default true. */
  reveal?: boolean;
};

/**
 * Library layout written by the generator and read by the server:
 *   <AUDIO_LIBRARY_PATH>/<page>/<segmentId>/<hash>/audio.mp3
 *   <AUDIO_LIBRARY_PATH>/<page>/<segmentId>/<hash>/alignment.json  (ClipAlignment)
 *   <AUDIO_LIBRARY_PATH>/<page>/<segmentId>/<hash>/metadata.json   (ClipMetadata)
 * AUDIO_LIBRARY_PATH defaults to .data/audio. `hash` is the first 16 hex chars
 * of sha256 over {text, version, cues, voiceId, modelId, voiceSettings, outputFormat}.
 * The served clip for a segment is its newest version whose review is "approved".
 */
export type ClipReviewStatus = "pending" | "approved" | "rejected";

export type ClipMetadata = {
  segmentId: string;
  page: string;
  part: NarrationPart;
  version: number;
  text: string;
  hash: string;
  voiceId: string;
  modelId: string;
  voiceSettings: Record<string, unknown>;
  outputFormat: string;
  characters: number;
  createdAt: string; // ISO
  protected?: "answer";
  review: { status: ClipReviewStatus; reviewedAt?: string; reason?: string };
};

export type ClipAlignment = {
  duration: number; // seconds
  characters: string[];
  starts: number[]; // seconds, one per character (provider "alignment", not normalized)
  ends: number[];
  cues: ResolvedCue[];
};

/** A cue resolved to audio time. */
export type ResolvedCue = {
  target: string;
  reveal: boolean;
  start: number; // seconds
  end: number;
};

/**
 * GET /api/audio/manifest?page=nutrients[&grant=<token>]
 * Lists every segment of the page in order. Protected segments appear only
 * when `grant` is valid. A grant is returned as `audioGrant` by POST /api/quiz
 * after grading (student or visitor preview).
 */
export type AudioManifest = {
  page: string;
  segments: ManifestSegment[];
};

export type ManifestSegment = {
  id: string;
  part: NarrationPart;
  order: number;
  protected: boolean;
} &
  // `url` is opaque to the client: /api/audio/clip/<segmentId>/<hash>, already
  // carrying ?grant= for protected clips. The endpoint supports HTTP Range.
  (
    | { status: "ready"; url: string; duration: number; cues: ResolvedCue[] }
    | { status: "not_ready" }
  );
