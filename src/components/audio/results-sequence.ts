import type {
  ManifestSegment,
  NarrationPart,
} from "@/content/narration-contract";

export type ReadySegment = Extract<ManifestSegment, { status: "ready" }>;

export type ResultNarration = {
  correct: number;
  review: string[];
  details: { id: string; correct: boolean; concept: string }[];
};

export function isReadySegment(
  segment: ManifestSegment,
): segment is ReadySegment {
  return segment.status === "ready";
}

export function pageQueue(segments: ManifestSegment[]): ReadySegment[] {
  return segments
    .filter(isReadySegment)
    .filter((segment) => segment.part !== "result")
    .sort((a, b) => a.order - b.order);
}

export function partQueue(
  segments: ManifestSegment[],
  part: NarrationPart,
  segmentId?: string,
): ReadySegment[] {
  const ready = segments
    .filter(isReadySegment)
    .filter((segment) => segment.part === part)
    .sort((a, b) => a.order - b.order);
  if (!segmentId) return ready;
  return ready.filter((segment) => segment.id === segmentId);
}

export function resultSequenceIds(result: ResultNarration): string[] {
  const ids: string[] = ["result.intro", `result.score.${result.correct}`];
  for (const detail of result.details) {
    if (detail.correct) ids.push("result.correct");
    else ids.push("result.answer-is", `result.answer.${detail.id}`);
    ids.push(`result.explanation.${detail.id}`);
  }
  const seen = new Set<string>();
  for (const concept of result.review) {
    if (seen.has(concept)) continue;
    seen.add(concept);
    const first = result.details.find((detail) => detail.concept === concept);
    if (first) ids.push(`result.review.${first.id}`);
  }
  return ids;
}

export function resultsQueue(
  segments: ManifestSegment[],
  result: ResultNarration,
): ReadySegment[] {
  const byId = new Map(
    segments.filter(isReadySegment).map((segment) => [segment.id, segment]),
  );
  return resultSequenceIds(result).flatMap((id) => {
    const segment = byId.get(id);
    return segment ? [segment] : [];
  });
}
