import { HASH_RE, SEGMENT_ID_RE } from "./ids.mjs";
import { verifyAudioGrant } from "./grant.mjs";
import { readAudio, readMetadata } from "./library.mjs";
import { findSegmentById } from "./segments.mjs";

function jsonError(status, message) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function cacheControl(isProtected) {
  return isProtected ? "no-store" : "private, max-age=3600";
}

function etagMatches(header, hash) {
  if (!header) return false;
  const want = `"${hash}"`;
  return header.split(",").some((part) => {
    const token = part.trim().replace(/^W\//, "").trim();
    return token === want || token === hash;
  });
}

export function parseByteRange(rangeHeader, size) {
  if (!rangeHeader) return { type: "full" };
  if (!rangeHeader.startsWith("bytes=")) return { type: "full" };
  const spec = rangeHeader.slice(6).trim();
  if (spec.includes(",")) return { type: "full" };
  let match = /^(\d+)-(\d+)$/.exec(spec);
  if (match) {
    const start = Number(match[1]);
    let end = Number(match[2]);
    if (start >= size || start > end) return { type: "unsatisfiable" };
    end = Math.min(end, size - 1);
    return { type: "partial", start, end };
  }
  match = /^(\d+)-$/.exec(spec);
  if (match) {
    const start = Number(match[1]);
    if (start >= size) return { type: "unsatisfiable" };
    return { type: "partial", start, end: size - 1 };
  }
  match = /^-(\d+)$/.exec(spec);
  if (match) {
    const suffix = Number(match[1]);
    if (suffix === 0) return { type: "unsatisfiable" };
    if (suffix >= size) return { type: "partial", start: 0, end: size - 1 };
    return { type: "partial", start: size - suffix, end: size - 1 };
  }
  return { type: "full" };
}

function audioHeaders(hash, isProtected, extra = {}) {
  return {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    ETag: `"${hash}"`,
    "Cache-Control": cacheControl(isProtected),
    ...extra,
  };
}

export async function serveAudioClip(request, { segmentId, hash }) {
  if (!SEGMENT_ID_RE.test(segmentId || "") || !HASH_RE.test(hash || "")) {
    return jsonError(404, "غير موجود.");
  }
  const segment = await findSegmentById(segmentId);
  if (!segment) return jsonError(404, "غير موجود.");
  const metadata = await readMetadata(segment.page, segmentId, hash);
  if (!metadata || metadata.review?.status !== "approved") {
    return jsonError(404, "غير موجود.");
  }
  const isProtected = segment.protected === "answer";
  const grant = new URL(request.url).searchParams.get("grant");
  if (isProtected && !verifyAudioGrant(grant)) {
    return jsonError(403, "غير مصرّح.");
  }
  const audio = await readAudio(segment.page, segmentId, hash);
  if (!audio) return jsonError(404, "غير موجود.");
  const size = audio.length;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (etagMatches(ifNoneMatch, hash)) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: `"${hash}"`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl(isProtected),
      },
    });
  }
  const range = parseByteRange(request.headers.get("range"), size);
  if (range.type === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl(isProtected),
      },
    });
  }
  if (range.type === "partial") {
    const slice = audio.subarray(range.start, range.end + 1);
    return new Response(new Uint8Array(slice), {
      status: 206,
      headers: audioHeaders(hash, isProtected, {
        "Content-Length": String(slice.length),
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      }),
    });
  }
  return new Response(new Uint8Array(audio), {
    status: 200,
    headers: audioHeaders(hash, isProtected, {
      "Content-Length": String(size),
    }),
  });
}
