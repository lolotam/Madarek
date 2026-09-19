import { jsonResponse, readJsonBody } from "../http.mjs";
import { HASH_RE, SEGMENT_ID_RE } from "./ids.mjs";
import { updateReview } from "./library.mjs";
import { findSegmentById } from "./segments.mjs";

const REASON_MAX = 300;

function notFound() {
  return jsonResponse({ error: "غير موجود." }, 404);
}

function forbidden() {
  return jsonResponse({ error: "غير مصرّح." }, 403);
}

function badRequest(message) {
  return jsonResponse({ error: message }, 400);
}

export async function handleAudioReview(
  req,
  { user, libraryPath, onReviewed } = {},
) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status);
  if (!user || user.role !== "admin") return forbidden();
  const { segmentId, hash, decision, reason } = parsed.body;
  if (typeof segmentId !== "string" || typeof hash !== "string") {
    return notFound();
  }
  if (!SEGMENT_ID_RE.test(segmentId) || !HASH_RE.test(hash)) {
    return notFound();
  }
  if (decision !== "approve" && decision !== "reject") {
    return badRequest("قرار غير صحيح.");
  }
  let rejectReason;
  if (decision === "reject") {
    if (typeof reason !== "string") {
      return badRequest("سبب الرفض مطلوب.");
    }
    rejectReason = reason.trim();
    if (rejectReason.length < 1 || rejectReason.length > REASON_MAX) {
      return badRequest("سبب الرفض يجب أن يكون بين حرف واحد و300 حرف.");
    }
  }
  const segment = await findSegmentById(segmentId);
  if (!segment) return notFound();
  let metadata;
  try {
    metadata = await updateReview(segment.page, segmentId, hash, {
      status: decision === "approve" ? "approved" : "rejected",
      reason: rejectReason,
      libraryPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Clip version was not found") return notFound();
    if (message.includes("reason is required")) {
      return badRequest("سبب الرفض مطلوب.");
    }
    throw error;
  }
  if (typeof onReviewed === "function") {
    await onReviewed({ segmentId, hash, decision });
  }
  return jsonResponse({
    ok: true,
    segmentId,
    hash,
    review: metadata.review,
  });
}
