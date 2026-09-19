export const SEGMENT_ID_RE = /^[a-z0-9][a-z0-9._-]{0,80}$/;
export const HASH_RE = /^[0-9a-f]{16}$/;
export const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,80}$/;
export const PARTS = new Set(["map", "explore", "practice", "quiz", "result"]);

export function assertSegmentId(id) {
  if (typeof id !== "string" || !SEGMENT_ID_RE.test(id)) {
    throw new Error("Invalid segment id");
  }
  return id;
}

export function assertHash(hash) {
  if (typeof hash !== "string" || !HASH_RE.test(hash)) {
    throw new Error("Invalid clip hash");
  }
  return hash;
}

export function assertPageId(page) {
  if (typeof page !== "string" || !PAGE_ID_RE.test(page)) {
    throw new Error("Invalid page id");
  }
  return page;
}
