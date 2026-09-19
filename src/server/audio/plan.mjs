import { listVersions } from "./library.mjs";
import { loadPageSegments } from "./segments.mjs";

export async function buildPlan(
  page,
  onlyIds,
  { retryRejected = false, libraryPath } = {},
) {
  const segments = await loadPageSegments(page);
  const selected = onlyIds
    ? segments.filter((segment) => onlyIds.includes(segment.id))
    : segments;
  const rows = [];
  for (const segment of selected) {
    const versions = await listVersions(segment.page, segment.id, {
      libraryPath,
    });
    const current = versions.find((version) => version.hash === segment.hash);
    const status = current ? current.review.status : "missing";
    const retry = retryRejected && status === "rejected";
    rows.push({
      id: segment.id,
      hash: segment.hash,
      status,
      retry,
      reason: current?.review?.reason,
      characters: segment.text.length,
      protected: segment.protected === "answer",
      segment,
    });
  }
  const needed = rows.filter((row) => row.status === "missing" || row.retry);
  const neededCharacters = needed.reduce((sum, row) => sum + row.characters, 0);
  return { rows, needed, neededCharacters };
}

export function summarizePlan(plan) {
  const counts = { missing: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of plan.rows) {
    if (Object.hasOwn(counts, row.status)) counts[row.status] += 1;
  }
  return {
    missing: counts.missing,
    pending: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
    neededCharacters: plan.neededCharacters,
    neededSegments: plan.needed.length,
  };
}
