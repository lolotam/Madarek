import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleAudioReview } from "../src/server/audio/review.mjs";
import { readMetadata, writeVersion } from "../src/server/audio/library.mjs";
import { loadPageSegments } from "../src/server/audio/segments.mjs";
import { buildPlan, summarizePlan } from "../src/server/audio/plan.mjs";
import { DEFAULT_VOICE_SETTINGS } from "../src/server/audio/config.mjs";

const repoRoot = join(import.meta.dirname, "..");
const fixtureDir = join(repoRoot, "tests", "fixtures", "narration");
const audioScript = join(repoRoot, "scripts", "audio.mjs");
const admin = { id: "admin-1", name: "مديرة", role: "admin" };
const parent = { id: "parent-1", name: "ولي أمر", role: "parent" };

async function withEnv(vars, fn) {
  const saved = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] == null) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (saved[key] == null) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function spawnAudio(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [audioScript, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("audio CLI timed out"));
    }, 15000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function reviewRequest(body, extra = {}) {
  const headers = new Headers({
    "content-type": extra.contentType ?? "application/json",
    host: extra.host ?? "127.0.0.1:3601",
  });
  if (extra.origin) headers.set("origin", extra.origin);
  const raw = extra.raw !== undefined ? extra.raw : JSON.stringify(body ?? {});
  return {
    headers,
    nextUrl: { protocol: extra.protocol ?? "http:" },
    text: async () => raw,
  };
}

async function jsonOf(res) {
  return { status: res.status, body: await res.json() };
}

function alignmentFor(text) {
  const characters = [...text];
  const step = 0.05;
  return {
    duration: characters.length * step,
    characters,
    starts: characters.map((_, i) => i * step),
    ends: characters.map((_, i) => (i + 1) * step),
    cues: [{ target: "fixture", reveal: true, start: 0, end: step }],
  };
}

async function seedCurrent(libraryPath, segment, status, extra = {}) {
  await writeVersion({
    audio: Buffer.from("clip-bytes"),
    alignment: alignmentFor(segment.text),
    libraryPath,
    metadata: {
      segmentId: segment.id,
      page: segment.page,
      part: segment.part,
      version: segment.version,
      text: segment.text,
      hash: segment.hash,
      voiceId: "voice-test",
      modelId: "eleven_multilingual_v2",
      voiceSettings: DEFAULT_VOICE_SETTINGS,
      outputFormat: "mp3_44100_128",
      characters: segment.text.length,
      createdAt: "2026-09-01T00:00:00.000Z",
      ...(segment.protected ? { protected: segment.protected } : {}),
      review:
        status === "rejected"
          ? {
              status,
              reviewedAt: "2026-09-02T00:00:00.000Z",
              reason: extra.reason ?? "نطق غير واضح",
            }
          : status === "approved"
            ? { status, reviewedAt: "2026-09-02T00:00:00.000Z" }
            : { status },
    },
  });
}

describe("audio review admin", { concurrency: 1 }, () => {
  test("review endpoint logic rejects non-admins and bad ids, and requires a reason for reject", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-rev-api-"));
    await withEnv(
      {
        NARRATION_DIR: fixtureDir,
        AUDIO_LIBRARY_PATH: libraryPath,
        ELEVENLABS_VOICE_ID: "voice-test",
        ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
        ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
      },
      async () => {
        const denied = await jsonOf(
          await handleAudioReview(reviewRequest({}), { user: parent }),
        );
        assert.equal(denied.status, 403);
        const anon = await jsonOf(
          await handleAudioReview(reviewRequest({}), { user: null }),
        );
        assert.equal(anon.status, 403);

        const badId = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: "../etc",
              hash: "aaaaaaaaaaaaaaaa",
              decision: "approve",
            }),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(badId.status, 404);

        const unknown = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: "map.unknown",
              hash: "aaaaaaaaaaaaaaaa",
              decision: "approve",
            }),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(unknown.status, 404);

        const noReason = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: "map.intro",
              hash: "aaaaaaaaaaaaaaaa",
              decision: "reject",
            }),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(noReason.status, 400);
        assert.match(noReason.body.error, /سبب/);

        const blankReason = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: "map.intro",
              hash: "aaaaaaaaaaaaaaaa",
              decision: "reject",
              reason: "   ",
            }),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(blankReason.status, 400);

        const origin = await jsonOf(
          await handleAudioReview(
            reviewRequest(
              { segmentId: "map.intro", hash: "aaaaaaaaaaaaaaaa" },
              { origin: "https://evil.example" },
            ),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(origin.status, 403);
      },
    );
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("approve then reject updates metadata", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-rev-meta-"));
    await withEnv(
      {
        NARRATION_DIR: fixtureDir,
        AUDIO_LIBRARY_PATH: libraryPath,
        ELEVENLABS_VOICE_ID: "voice-test",
        ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
        ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
      },
      async () => {
        const segments = await loadPageSegments("nutrients");
        const intro = segments.find((segment) => segment.id === "map.intro");
        await seedCurrent(libraryPath, intro, "pending");
        const approved = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: intro.id,
              hash: intro.hash,
              decision: "approve",
            }),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(approved.status, 200);
        assert.equal(approved.body.review.status, "approved");
        const storedApproved = await readMetadata(
          "nutrients",
          intro.id,
          intro.hash,
          { libraryPath },
        );
        assert.equal(storedApproved.review.status, "approved");
        assert.ok(storedApproved.review.reviewedAt);
        const rejected = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: intro.id,
              hash: intro.hash,
              decision: "reject",
              reason: "نطق المصطلح غير واضح",
            }),
            { user: admin, libraryPath },
          ),
        );
        assert.equal(rejected.status, 200);
        assert.equal(rejected.body.review.status, "rejected");
        assert.equal(rejected.body.review.reason, "نطق المصطلح غير واضح");
        const storedRejected = await readMetadata(
          "nutrients",
          intro.id,
          intro.hash,
          { libraryPath },
        );
        assert.equal(storedRejected.review.status, "rejected");
        assert.equal(storedRejected.review.reason, "نطق المصطلح غير واضح");
      },
    );
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("successful review notifies onReviewed without a reject reason", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-rev-audit-"));
    await withEnv(
      {
        NARRATION_DIR: fixtureDir,
        AUDIO_LIBRARY_PATH: libraryPath,
        ELEVENLABS_VOICE_ID: "voice-test",
        ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
        ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
      },
      async () => {
        const segments = await loadPageSegments("nutrients");
        const intro = segments.find((segment) => segment.id === "map.intro");
        await seedCurrent(libraryPath, intro, "pending");
        const seen = [];
        const approved = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: intro.id,
              hash: intro.hash,
              decision: "approve",
            }),
            {
              user: admin,
              libraryPath,
              onReviewed: (entry) => {
                seen.push(entry);
              },
            },
          ),
        );
        assert.equal(approved.status, 200);
        const rejected = await jsonOf(
          await handleAudioReview(
            reviewRequest({
              segmentId: intro.id,
              hash: intro.hash,
              decision: "reject",
              reason: "نطق المصطلح غير واضح",
            }),
            {
              user: admin,
              libraryPath,
              onReviewed: (entry) => {
                seen.push(entry);
              },
            },
          ),
        );
        assert.equal(rejected.status, 200);
        assert.deepEqual(seen, [
          { segmentId: intro.id, hash: intro.hash, decision: "approve" },
          { segmentId: intro.id, hash: intro.hash, decision: "reject" },
        ]);
        assert.equal(JSON.stringify(seen).includes("reason"), false);
        assert.equal(JSON.stringify(seen).includes("نطق"), false);
      },
    );
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("plan summary counts match the CLI plan on a temp library with the fixture narration", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-rev-plan-"));
    const env = {
      NARRATION_DIR: fixtureDir,
      AUDIO_LIBRARY_PATH: libraryPath,
      ELEVENLABS_VOICE_ID: "voice-test",
      ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
      ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
    };
    await withEnv(env, async () => {
      const segments = await loadPageSegments("nutrients");
      const byId = Object.fromEntries(segments.map((s) => [s.id, s]));
      await seedCurrent(libraryPath, byId["map.intro"], "pending");
      await seedCurrent(libraryPath, byId["explore.groups"], "approved");
      await seedCurrent(libraryPath, byId["result.explain.q1"], "rejected");
      const summary = summarizePlan(
        await buildPlan("nutrients", null, { libraryPath }),
      );
      assert.equal(summary.missing, 1);
      assert.equal(summary.pending, 1);
      assert.equal(summary.approved, 1);
      assert.equal(summary.rejected, 1);
      assert.equal(summary.neededSegments, 1);
      assert.equal(summary.neededCharacters, byId["quiz.q1"].text.length);
      const cli = await spawnAudio(["plan", "--page", "nutrients"], env);
      assert.equal(cli.code, 0);
      const needed = Number(/needed_characters=(\d+)/.exec(cli.stdout)[1]);
      const neededSeg = Number(/needed_segments=(\d+)/.exec(cli.stdout)[1]);
      assert.equal(needed, summary.neededCharacters);
      assert.equal(neededSeg, summary.neededSegments);
      const counts = { missing: 0, pending: 0, approved: 0, rejected: 0 };
      for (const line of cli.stdout.split(/\r?\n/)) {
        if (!line.includes("hash=")) continue;
        const match =
          /(?:^|\s)(missing|pending|approved|rejected)(?:\s|$)/.exec(line);
        if (match) counts[match[1]] += 1;
      }
      assert.deepEqual(counts, {
        missing: summary.missing,
        pending: summary.pending,
        approved: summary.approved,
        rejected: summary.rejected,
      });
    });
    await rm(libraryPath, { recursive: true, force: true });
  });
});
