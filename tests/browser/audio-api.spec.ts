import { test, expect } from "@playwright/test";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { writeVersion } from "../../src/server/audio/library.mjs";

const libraryPath = resolve(".data/audio-e2e");
const publicHash = "a1b2c3d4e5f60789";
const pendingHash = "b1b2c3d4e5f60789";
const protectedHash = "c1b2c3d4e5f60789";
const publicBytes = Buffer.alloc(32, 7);
const pendingBytes = Buffer.alloc(32, 8);
const protectedBytes = Buffer.alloc(32, 9);

function alignmentFor(text: string, duration: number) {
  const characters = [...text];
  const step = duration / characters.length;
  return {
    duration,
    characters,
    starts: characters.map((_, i) => i * step),
    ends: characters.map((_, i) => (i + 1) * step),
    cues: [
      {
        target: "fixture",
        reveal: true,
        start: 0,
        end: duration,
      },
    ],
  };
}

test.beforeAll(async () => {
  process.env.AUDIO_LIBRARY_PATH = libraryPath;
  process.env.NARRATION_DIR = resolve("tests/fixtures/narration");
  await rm(libraryPath, { recursive: true, force: true });
  const segments = JSON.parse(
    await readFile(resolve("tests/fixtures/narration/nutrients.json"), "utf8"),
  ) as Array<{
    id: string;
    page: string;
    part: string;
    version: number;
    text: string;
    protected?: string;
  }>;
  const byId = Object.fromEntries(segments.map((s) => [s.id, s]));
  const stamp = (id: string, hash: string, status: "approved" | "pending") => ({
    segmentId: id,
    page: byId[id].page,
    part: byId[id].part,
    version: byId[id].version,
    text: byId[id].text,
    hash,
    voiceId: "e2e-voice",
    modelId: "eleven_multilingual_v2",
    voiceSettings: { stability: 0.5, similarity_boost: 0.75 },
    outputFormat: "mp3_44100_128",
    characters: byId[id].text.length,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...(byId[id].protected ? { protected: byId[id].protected } : {}),
    review:
      status === "approved"
        ? { status, reviewedAt: "2026-09-02T00:00:00.000Z" }
        : { status },
  });
  await writeVersion({
    audio: publicBytes,
    alignment: alignmentFor(byId["map.intro"].text, 1.2),
    libraryPath,
    metadata: stamp("map.intro", publicHash, "approved"),
  });
  await writeVersion({
    audio: pendingBytes,
    alignment: alignmentFor(byId["explore.groups"].text, 0.8),
    libraryPath,
    metadata: stamp("explore.groups", pendingHash, "pending"),
  });
  await writeVersion({
    audio: protectedBytes,
    alignment: alignmentFor(byId["result.explain.q1"].text, 1.5),
    libraryPath,
    metadata: stamp("result.explain.q1", protectedHash, "approved"),
  });
});

test("audio manifest and clip routes honour review, grants, and HTTP Range", async ({
  request,
}) => {
  const missingPage = await request.get("/api/audio/manifest?page=unknown");
  expect(missingPage.status()).toBe(404);

  const manifestRes = await request.get("/api/audio/manifest?page=nutrients");
  expect(manifestRes.status()).toBe(200);
  expect(manifestRes.headers()["cache-control"]).toBe("no-store");
  const manifest = await manifestRes.json();
  expect(manifest.page).toBe("nutrients");
  expect(manifest.segments.map((s: { id: string }) => s.id)).toEqual([
    "map.intro",
    "explore.groups",
    "quiz.q1",
  ]);
  expect(
    manifest.segments.find((s: { id: string }) => s.id === "result.explain.q1"),
  ).toBeUndefined();
  const intro = manifest.segments.find(
    (s: { id: string }) => s.id === "map.intro",
  );
  expect(intro).toMatchObject({
    part: "map",
    order: 1,
    protected: false,
    status: "ready",
    url: `/api/audio/clip/map.intro/${publicHash}`,
  });
  expect(typeof intro.duration).toBe("number");
  expect(Array.isArray(intro.cues)).toBe(true);
  const pending = manifest.segments.find(
    (s: { id: string }) => s.id === "explore.groups",
  );
  expect(pending).toMatchObject({ status: "not_ready", protected: false });
  const quiz = manifest.segments.find(
    (s: { id: string }) => s.id === "quiz.q1",
  );
  expect(quiz).toMatchObject({ status: "not_ready" });

  const quizRes = await request.post("/api/quiz", { data: { answers: {} } });
  expect(quizRes.status()).toBe(200);
  const quizBody = await quizRes.json();
  expect(quizBody.preview).toBe(true);
  expect(quizBody.audioGrant).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]+$/);

  const grantedRes = await request.get(
    `/api/audio/manifest?page=nutrients&grant=${encodeURIComponent(quizBody.audioGrant)}`,
  );
  expect(grantedRes.status()).toBe(200);
  const granted = await grantedRes.json();
  expect(granted.segments.map((s: { id: string }) => s.id)).toEqual([
    "map.intro",
    "explore.groups",
    "quiz.q1",
    "result.explain.q1",
  ]);
  const protectedSeg = granted.segments.find(
    (s: { id: string }) => s.id === "result.explain.q1",
  );
  expect(protectedSeg.status).toBe("ready");
  expect(protectedSeg.protected).toBe(true);
  expect(protectedSeg.url).toBe(
    `/api/audio/clip/result.explain.q1/${protectedHash}?grant=${encodeURIComponent(quizBody.audioGrant)}`,
  );

  const full = await request.get(`/api/audio/clip/map.intro/${publicHash}`);
  expect(full.status()).toBe(200);
  expect(full.headers()["content-type"]).toContain("audio/mpeg");
  expect(full.headers()["accept-ranges"]).toBe("bytes");
  expect(full.headers()["content-length"]).toBe("32");
  expect(full.headers()["etag"]).toBe(`"${publicHash}"`);
  expect(full.headers()["cache-control"]).toBe("private, max-age=3600");
  expect(Buffer.from(await full.body())).toEqual(publicBytes);

  const partial = await request.get(`/api/audio/clip/map.intro/${publicHash}`, {
    headers: { Range: "bytes=0-3" },
  });
  expect(partial.status()).toBe(206);
  expect(partial.headers()["content-range"]).toBe("bytes 0-3/32");
  expect(partial.headers()["content-length"]).toBe("4");
  expect(Buffer.from(await partial.body())).toEqual(publicBytes.subarray(0, 4));

  const suffix = await request.get(`/api/audio/clip/map.intro/${publicHash}`, {
    headers: { Range: "bytes=-4" },
  });
  expect(suffix.status()).toBe(206);
  expect(suffix.headers()["content-range"]).toBe("bytes 28-31/32");
  expect(Buffer.from(await suffix.body())).toEqual(publicBytes.subarray(28));

  const openEnd = await request.get(`/api/audio/clip/map.intro/${publicHash}`, {
    headers: { Range: "bytes=10-" },
  });
  expect(openEnd.status()).toBe(206);
  expect(openEnd.headers()["content-range"]).toBe("bytes 10-31/32");

  const cached = await request.get(`/api/audio/clip/map.intro/${publicHash}`, {
    headers: { "If-None-Match": `"${publicHash}"` },
  });
  expect(cached.status()).toBe(304);

  const unsatisfiable = await request.get(
    `/api/audio/clip/map.intro/${publicHash}`,
    { headers: { Range: "bytes=99-120" } },
  );
  expect(unsatisfiable.status()).toBe(416);
  expect(unsatisfiable.headers()["content-range"]).toBe("bytes */32");

  const denied = await request.get(
    `/api/audio/clip/result.explain.q1/${protectedHash}`,
  );
  expect(denied.status()).toBe(403);

  const allowed = await request.get(
    `/api/audio/clip/result.explain.q1/${protectedHash}?grant=${encodeURIComponent(quizBody.audioGrant)}`,
  );
  expect(allowed.status()).toBe(200);
  expect(allowed.headers()["cache-control"]).toBe("no-store");
  expect(Buffer.from(await allowed.body())).toEqual(protectedBytes);

  const pendingClip = await request.get(
    `/api/audio/clip/explore.groups/${pendingHash}`,
  );
  expect(pendingClip.status()).toBe(404);

  const traversal = await request.get(
    "/api/audio/clip/..%2fetc/aaaaaaaaaaaaaaaa",
  );
  expect(traversal.status()).toBe(404);
});
