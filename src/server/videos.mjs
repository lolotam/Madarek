const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "youtube-nocookie.com"]);

export const VIDEO_KINDS = ["explain", "experiment", "review", "guide"];

/** The YouTube video id in a link the admin pasted, or null. */
export function parseYouTubeId(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (HOSTS.has(host))
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null);
  return id && VIDEO_ID.test(id) ? id : null;
}

/** Seconds from "m:ss", "h:mm:ss" or plain seconds; null when empty, NaN when invalid. */
export function parseDuration(value) {
  if (value == null || String(value).trim() === "") return null;
  const parts = String(value).trim().split(":");
  const valid =
    parts.length <= 3 &&
    /^\d{1,3}$/.test(parts[0]) &&
    parts.slice(1).every((p) => /^[0-5]\d$/.test(p));
  if (!valid) return NaN;
  const seconds = parts.reduce((total, p) => total * 60 + Number(p), 0);
  return seconds > 0 && seconds <= 6 * 3600 ? seconds : NaN;
}
