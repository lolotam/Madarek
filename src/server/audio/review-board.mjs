import { cueTextRange } from "./align.mjs";
import { listVersions, readAlignment } from "./library.mjs";
import { buildPlan, summarizePlan } from "./plan.mjs";
import { loadPageSegments } from "./segments.mjs";

export const PART_ORDER = ["map", "explore", "practice", "quiz", "result"];

function previewCues(text, alignment) {
  if (!alignment?.cues?.length) return [];
  const joined = Array.isArray(alignment.characters)
    ? alignment.characters.join("")
    : "";
  if (joined && joined !== text) return [];
  return alignment.cues.map((cue) => {
    const range = cueTextRange(alignment, cue);
    return {
      start: cue.start,
      end: cue.end,
      target: cue.target,
      textStart: range?.start ?? 0,
      textEnd: range?.end ?? 0,
    };
  });
}

export async function loadReviewBoard(
  page = "nutrients",
  { libraryPath } = {},
) {
  const plan = await buildPlan(page, null, { libraryPath });
  const summary = summarizePlan(plan);
  const segments = await loadPageSegments(page);
  const items = [];
  for (const segment of segments) {
    const versions = await listVersions(segment.page, segment.id, {
      libraryPath,
    });
    const currentMeta = versions.find(
      (version) => version.hash === segment.hash,
    );
    const older = versions
      .filter((version) => version.hash !== segment.hash)
      .sort(
        (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0),
      )
      .map((version) => ({
        hash: version.hash,
        status: version.review?.status ?? "pending",
        createdAt: version.createdAt ?? "",
        reason: version.review?.reason,
        version: version.version,
      }));
    let alignment = null;
    if (currentMeta) {
      alignment = await readAlignment(segment.page, segment.id, segment.hash, {
        libraryPath,
      });
    }
    items.push({
      id: segment.id,
      part: segment.part,
      order: segment.order,
      text: segment.text,
      protected: segment.protected === "answer",
      hash: segment.hash,
      currentStatus: currentMeta ? currentMeta.review.status : "missing",
      current: currentMeta
        ? {
            hash: currentMeta.hash,
            status: currentMeta.review.status,
            reason: currentMeta.review.reason,
            reviewedAt: currentMeta.review.reviewedAt,
            createdAt: currentMeta.createdAt,
            duration: alignment?.duration ?? null,
            cues: previewCues(segment.text, alignment),
          }
        : null,
      older,
    });
  }
  const parts = PART_ORDER.map((part) => ({
    part,
    segments: items.filter((item) => item.part === part),
  })).filter((group) => group.segments.length > 0);
  return { page, summary, parts };
}
