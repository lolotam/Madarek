import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, isAbsolute } from "node:path";
import { loadAudioConfig } from "./config.mjs";
import { PAGE_ID_RE, PARTS, SEGMENT_ID_RE } from "./ids.mjs";

export function clipHash({
  text,
  version,
  cues,
  voiceId,
  modelId,
  voiceSettings,
  outputFormat,
}) {
  const payload = JSON.stringify({
    text,
    version,
    cues,
    voiceId,
    modelId,
    voiceSettings,
    outputFormat,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function notFound(page) {
  const error = new Error(`Unknown narration page: ${page}`);
  error.status = 404;
  return error;
}

function invalid(message) {
  throw new Error(message);
}

function assertCueInText(text, cue, index, segmentId) {
  if (!cue || typeof cue !== "object") {
    invalid(`Segment ${segmentId} cue ${index} is invalid`);
  }
  if (typeof cue.phrase !== "string" || cue.phrase.length === 0) {
    invalid(`Segment ${segmentId} cue ${index} is missing a phrase`);
  }
  if (typeof cue.target !== "string" || !cue.target.trim()) {
    invalid(`Segment ${segmentId} cue ${index} is missing a target`);
  }
  if (cue.reveal != null && typeof cue.reveal !== "boolean") {
    invalid(`Segment ${segmentId} cue ${index} has an invalid reveal flag`);
  }
  const occurrence = cue.occurrence ?? 1;
  if (!Number.isInteger(occurrence) || occurrence < 1) {
    invalid(`Segment ${segmentId} cue ${index} has an invalid occurrence`);
  }
  let from = 0;
  for (let n = 1; n <= occurrence; n++) {
    const found = text.indexOf(cue.phrase, from);
    if (found === -1) {
      invalid(
        `Segment ${segmentId} cue ${index} phrase is not present at occurrence ${occurrence}`,
      );
    }
    from = found + 1;
  }
}

function validateSegment(raw, page, seen) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    invalid("Narration segment must be an object");
  }
  if (typeof raw.id !== "string" || !SEGMENT_ID_RE.test(raw.id)) {
    invalid(`Invalid segment id: ${String(raw.id)}`);
  }
  if (seen.has(raw.id)) invalid(`Duplicate segment id: ${raw.id}`);
  seen.add(raw.id);
  if (raw.page !== page) {
    invalid(`Segment ${raw.id} page does not match file ${page}`);
  }
  if (!PARTS.has(raw.part)) {
    invalid(`Segment ${raw.id} has an invalid part`);
  }
  if (typeof raw.order !== "number" || !Number.isFinite(raw.order)) {
    invalid(`Segment ${raw.id} has an invalid order`);
  }
  if (typeof raw.version !== "number" || !Number.isFinite(raw.version)) {
    invalid(`Segment ${raw.id} has an invalid version`);
  }
  if (typeof raw.text !== "string" || raw.text.length === 0) {
    invalid(`Segment ${raw.id} is missing text`);
  }
  if (!Array.isArray(raw.cues)) {
    invalid(`Segment ${raw.id} cues must be an array`);
  }
  raw.cues.forEach((cue, index) =>
    assertCueInText(raw.text, cue, index, raw.id),
  );
  if (raw.protected != null && raw.protected !== "answer") {
    invalid(`Segment ${raw.id} has an invalid protected flag`);
  }
  return {
    id: raw.id,
    page: raw.page,
    part: raw.part,
    order: raw.order,
    version: raw.version,
    text: raw.text,
    cues: raw.cues,
    ...(raw.protected ? { protected: raw.protected } : {}),
  };
}

function resolvePageFile(dir, page) {
  const root = resolve(dir);
  const file = resolve(root, `${page}.json`);
  const rel = relative(root, file);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw notFound(page);
  }
  return file;
}

export async function loadPageSegments(page, options = {}) {
  if (typeof page !== "string" || !PAGE_ID_RE.test(page)) throw notFound(page);
  const config = options.config ?? (await loadAudioConfig());
  const narrationDir = options.narrationDir ?? config.narrationDir;
  const file = resolvePageFile(narrationDir, page);
  let raw;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") throw notFound(page);
    if (error instanceof SyntaxError) {
      invalid(`Narration file for ${page} is not valid JSON`);
    }
    throw error;
  }
  if (!Array.isArray(raw))
    invalid(`Narration file for ${page} must be an array`);
  const seen = new Set();
  const segments = raw.map((item) => validateSegment(item, page, seen));
  segments.sort((a, b) => a.order - b.order);
  return segments.map((segment) => ({
    ...segment,
    hash: clipHash({
      text: segment.text,
      version: segment.version,
      cues: segment.cues,
      voiceId: config.voiceId,
      modelId: config.modelId,
      voiceSettings: config.voiceSettings,
      outputFormat: config.outputFormat,
    }),
  }));
}

export async function findSegmentById(segmentId, options = {}) {
  if (typeof segmentId !== "string" || !SEGMENT_ID_RE.test(segmentId)) {
    return null;
  }
  const config = options.config ?? (await loadAudioConfig());
  const narrationDir = options.narrationDir ?? config.narrationDir;
  let names;
  try {
    names = await readdir(narrationDir);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const page = name.slice(0, -5);
    if (!PAGE_ID_RE.test(page)) continue;
    const segments = await loadPageSegments(page, {
      ...options,
      config,
      narrationDir,
    });
    const found = segments.find((segment) => segment.id === segmentId);
    if (found) return found;
  }
  return null;
}
