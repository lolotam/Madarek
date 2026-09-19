import { loadAudioConfig } from "./config.mjs";
import { verifyAudioGrant } from "./grant.mjs";
import { pickNewestApproved, readAlignment } from "./library.mjs";
import { loadPageSegments } from "./segments.mjs";

export async function getAudioManifest(page, grant, options = {}) {
  const config = options.config ?? (await loadAudioConfig());
  const segments = await loadPageSegments(page, { ...options, config });
  const grantOk = verifyAudioGrant(grant);
  const items = [];
  for (const segment of segments) {
    const isProtected = segment.protected === "answer";
    if (isProtected && !grantOk) continue;
    const approved = await pickNewestApproved(segment.page, segment.id, {
      libraryPath: options.libraryPath ?? config.libraryPath,
    });
    const base = {
      id: segment.id,
      part: segment.part,
      order: segment.order,
      protected: isProtected,
    };
    if (!approved) {
      items.push({ ...base, status: "not_ready" });
      continue;
    }
    const alignment = await readAlignment(
      segment.page,
      segment.id,
      approved.hash,
      {
        libraryPath: options.libraryPath ?? config.libraryPath,
      },
    );
    if (!alignment) {
      items.push({ ...base, status: "not_ready" });
      continue;
    }
    let url = `/api/audio/clip/${segment.id}/${approved.hash}`;
    if (isProtected && grant) {
      url += `?grant=${encodeURIComponent(grant)}`;
    }
    items.push({
      ...base,
      status: "ready",
      url,
      duration: alignment.duration,
      cues: alignment.cues,
    });
  }
  return { page, segments: items };
}
