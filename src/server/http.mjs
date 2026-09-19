export const JSON_BODY_LIMIT = 16000;

function firstHeader(req, name) {
  return req.headers.get(name)?.split(",")[0].trim() || "";
}

export function expectedOriginFrom(req) {
  // Next normalizes loopback hosts to localhost in nextUrl. The actual Host
  // header preserves the browser origin; APP_ORIGIN pins it for deployment.
  // Behind a TLS-terminating proxy (Dokploy/Traefik) the app sees plain HTTP,
  // so fall back to the proxy's X-Forwarded-* headers when APP_ORIGIN is unset.
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  const proto = firstHeader(req, "x-forwarded-proto");
  const host =
    firstHeader(req, "x-forwarded-host") || req.headers.get("host") || "";
  return `${proto ? proto + ":" : req.nextUrl.protocol}//${host}`;
}

/** Whether the browser reached us over HTTPS, for the session cookie's Secure flag. */
export function isSecureRequest(req) {
  try {
    return new URL(expectedOriginFrom(req)).protocol === "https:";
  } catch {
    return false;
  }
}

export function originForbidden(req) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return new URL(origin).origin !== new URL(expectedOriginFrom(req)).origin;
}

/**
 * Shared POST guards used by /api/[...action] and admin JSON endpoints:
 * same-origin, JSON content-type, 16KB body cap, and a plain object body.
 * Returns `{ ok: false, status, error }` or `{ ok: true, body }`.
 */
export async function readJsonBody(req) {
  if (originForbidden(req)) {
    return { ok: false, status: 403, error: "طلب غير مسموح." };
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, status: 415, error: "صيغة غير صحيحة." };
  }
  const raw = await req.text();
  if (raw.length > JSON_BODY_LIMIT) {
    return { ok: false, status: 413, error: "الطلب أكبر من المسموح." };
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "بيانات غير صحيحة." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "بيانات غير صحيحة." };
  }
  return { ok: true, body };
}

export function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
