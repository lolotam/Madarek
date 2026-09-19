import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MS = 2 * 60 * 60 * 1000;
const globals = globalThis;

function secret() {
  return (globals.__audioGrantSecret ??= randomBytes(32));
}

function signatureFor(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function equal(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signAudioGrant({ now = Date.now(), ttlMs = TTL_MS } = {}) {
  const expiresMs = now + ttlMs;
  const payload = `v1.${expiresMs}`;
  return `${payload}.${signatureFor(payload)}`;
}

export function verifyAudioGrant(token, { now = Date.now() } = {}) {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresRaw, sig] = parts;
  if (version !== "v1" || !/^[0-9]+$/.test(expiresRaw) || !sig) return false;
  const expiresMs = Number(expiresRaw);
  if (expiresMs <= now) return false;
  const payload = `v1.${expiresRaw}`;
  return equal(sig, signatureFor(payload));
}
