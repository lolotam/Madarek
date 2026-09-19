export const JSON_BODY_LIMIT = 16000;

export function expectedOriginFrom(req) {
  // Next normalizes loopback hosts to localhost in nextUrl. The actual Host
  // header preserves the browser origin; APP_ORIGIN pins it for deployment.
  return (
    process.env.APP_ORIGIN ||
    `${req.nextUrl.protocol}//${req.headers.get("host")}`
  );
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
