import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { resolveAlignment } from "../src/server/audio/align.mjs";
import {
  DEFAULT_VOICE_SETTINGS,
  loadAudioConfig,
} from "../src/server/audio/config.mjs";
import { synthesizeSpeech } from "../src/server/audio/elevenlabs.mjs";
import {
  signAudioGrant,
  verifyAudioGrant,
} from "../src/server/audio/grant.mjs";
import {
  listVersions,
  pickNewestApproved,
  readAudio,
  readMetadata,
  updateReview,
  writeVersion,
} from "../src/server/audio/library.mjs";
import { clipHash, loadPageSegments } from "../src/server/audio/segments.mjs";
import { buildPlan, generateOne } from "../scripts/audio.mjs";

const repoRoot = join(import.meta.dirname, "..");
const fixtureDir = join(repoRoot, "tests", "fixtures", "narration");
const audioScript = join(repoRoot, "scripts", "audio.mjs");
const testConfig = {
  hasApiKey: false,
  voiceId: "voice-test",
  modelId: "eleven_multilingual_v2",
  outputFormat: "mp3_44100_128",
  maxCharacters: 1000,
  libraryPath: join(repoRoot, ".data", "audio"),
  narrationDir: fixtureDir,
  voiceSettings: DEFAULT_VOICE_SETTINGS,
};

function timedAlignment(text, step = 0.05) {
  const characters = [...text];
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * step),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * step),
  };
}

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

describe("audio narration server", { concurrency: 1 }, () => {
  test("loadAudioConfig hides the API key and does not default max characters", async () => {
    await withEnv(
      {
        ELEVENLABS_API_KEY: "super-secret-test-key-xyz",
        ELEVENLABS_VOICE_ID: "voice-1",
        ELEVENLABS_MAX_CHARACTERS: "",
        ELEVENLABS_MODEL_ID: "",
        ELEVENLABS_OUTPUT_FORMAT: "",
      },
      async () => {
        const config = await loadAudioConfig();
        assert.equal(config.hasApiKey, true);
        assert.equal("apiKey" in config, false);
        assert.ok(
          !JSON.stringify(config).includes("super-secret-test-key-xyz"),
        );
        assert.equal(config.maxCharacters, null);
        assert.equal(config.modelId, "eleven_multilingual_v2");
        assert.equal(config.outputFormat, "mp3_44100_128");
        assert.equal(config.voiceId, "voice-1");
      },
    );
    await withEnv(
      {
        ELEVENLABS_API_KEY: "",
        ELEVENLABS_MAX_CHARACTERS: "2500",
      },
      async () => {
        const config = await loadAudioConfig();
        assert.equal(config.hasApiKey, false);
        assert.equal(config.maxCharacters, 2500);
      },
    );
  });

  test("segment validation requires ids, cue phrases, and a legal protected flag", async () => {
    const dir = await mkdtemp(join(tmpdir(), "narration-"));
    const write = (name, body) => writeFile(join(dir, name), body);
    await write(
      "bad.json",
      JSON.stringify([
        {
          id: "OK",
          page: "bad",
          part: "map",
          order: 1,
          version: 1,
          text: "hello",
          cues: [{ phrase: "hello", target: "t" }],
        },
      ]),
    );
    await assert.rejects(
      () =>
        loadPageSegments("bad", {
          config: { ...testConfig, narrationDir: dir },
        }),
      /Invalid segment id/,
    );
    await write(
      "missing-cue.json",
      JSON.stringify([
        {
          id: "map.intro",
          page: "missing-cue",
          part: "map",
          order: 1,
          version: 1,
          text: "hello world",
          cues: [{ phrase: "goodbye", target: "t" }],
        },
      ]),
    );
    await assert.rejects(
      () =>
        loadPageSegments("missing-cue", {
          config: { ...testConfig, narrationDir: dir },
        }),
      /phrase is not present/,
    );
    await write(
      "protected.json",
      JSON.stringify([
        {
          id: "result.x",
          page: "protected",
          part: "result",
          order: 1,
          version: 1,
          text: "secret",
          protected: "yes",
          cues: [{ phrase: "secret", target: "t" }],
        },
      ]),
    );
    await assert.rejects(
      () =>
        loadPageSegments("protected", {
          config: { ...testConfig, narrationDir: dir },
        }),
      /invalid protected flag/,
    );
    await rm(dir, { recursive: true, force: true });
  });

  test("clip hash is stable for the same inputs and changes when text or version changes", async () => {
    const segments = await loadPageSegments("nutrients", {
      config: testConfig,
    });
    assert.equal(segments.length, 4);
    const intro = segments[0];
    const again = clipHash({
      text: intro.text,
      version: intro.version,
      cues: intro.cues,
      voiceId: testConfig.voiceId,
      modelId: testConfig.modelId,
      voiceSettings: testConfig.voiceSettings,
      outputFormat: testConfig.outputFormat,
    });
    assert.equal(intro.hash, again);
    assert.match(intro.hash, /^[0-9a-f]{16}$/);
    const changed = clipHash({
      text: intro.text + "!",
      version: intro.version,
      cues: intro.cues,
      voiceId: testConfig.voiceId,
      modelId: testConfig.modelId,
      voiceSettings: testConfig.voiceSettings,
      outputFormat: testConfig.outputFormat,
    });
    assert.notEqual(changed, intro.hash);
    const bumped = clipHash({
      text: intro.text,
      version: intro.version + 1,
      cues: intro.cues,
      voiceId: testConfig.voiceId,
      modelId: testConfig.modelId,
      voiceSettings: testConfig.voiceSettings,
      outputFormat: testConfig.outputFormat,
    });
    assert.notEqual(bumped, intro.hash);
    assert.ok(segments.some((s) => s.protected === "answer"));
  });

  test("library writes atomically, lists versions, and picks the newest approved", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-lib-"));
    const alignment = {
      duration: 0.4,
      characters: ["a"],
      starts: [0],
      ends: [0.4],
      cues: [],
    };
    const base = {
      segmentId: "map.intro",
      page: "nutrients",
      part: "map",
      version: 1,
      text: "a",
      voiceId: "v",
      modelId: "m",
      voiceSettings: {},
      outputFormat: "mp3_44100_128",
      characters: 1,
    };
    await writeVersion({
      audio: Buffer.from("one"),
      alignment,
      libraryPath,
      metadata: {
        ...base,
        hash: "aaaaaaaaaaaaaaaa",
        createdAt: "2020-01-01T00:00:00.000Z",
        review: { status: "approved", reviewedAt: "2020-01-02T00:00:00.000Z" },
      },
    });
    await writeVersion({
      audio: Buffer.from("two"),
      alignment,
      libraryPath,
      metadata: {
        ...base,
        hash: "bbbbbbbbbbbbbbbb",
        createdAt: "2024-01-01T00:00:00.000Z",
        review: { status: "pending" },
      },
    });
    await writeVersion({
      audio: Buffer.from("three"),
      alignment,
      libraryPath,
      metadata: {
        ...base,
        hash: "cccccccccccccccc",
        createdAt: "2022-06-01T00:00:00.000Z",
        review: { status: "approved", reviewedAt: "2022-06-02T00:00:00.000Z" },
      },
    });
    const dest = join(
      libraryPath,
      "nutrients",
      "map.intro",
      "cccccccccccccccc",
    );
    assert.equal(existsSync(join(dest, "audio.mp3")), true);
    assert.equal(existsSync(join(dest, "alignment.json")), true);
    assert.equal(existsSync(join(dest, "metadata.json")), true);
    const versions = await listVersions("nutrients", "map.intro", {
      libraryPath,
    });
    assert.equal(versions.length, 3);
    const newest = await pickNewestApproved("nutrients", "map.intro", {
      libraryPath,
    });
    assert.equal(newest.hash, "cccccccccccccccc");
    await assert.rejects(
      () =>
        writeVersion({
          audio: Buffer.from("no"),
          alignment,
          libraryPath,
          metadata: { ...base, hash: "deadbeef", segmentId: "../etc" },
        }),
      /Invalid segment id/,
    );
    assert.equal(existsSync(join(libraryPath, "etc")), false);
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("review updates status, reviewedAt, and optional reject reason", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-rev-"));
    await writeVersion({
      audio: Buffer.from("clip"),
      alignment: {
        duration: 0.1,
        characters: ["a"],
        starts: [0],
        ends: [0.1],
        cues: [],
      },
      libraryPath,
      metadata: {
        segmentId: "map.intro",
        page: "nutrients",
        part: "map",
        version: 1,
        text: "a",
        hash: "dddddddddddddddd",
        voiceId: "v",
        modelId: "m",
        voiceSettings: {},
        outputFormat: "mp3_44100_128",
        characters: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        review: { status: "pending" },
      },
    });
    const approved = await updateReview(
      "nutrients",
      "map.intro",
      "dddddddddddddddd",
      { status: "approved", libraryPath },
    );
    assert.equal(approved.review.status, "approved");
    assert.ok(approved.review.reviewedAt);
    assert.equal(approved.review.reason, undefined);
    await assert.rejects(
      () =>
        updateReview("nutrients", "map.intro", "dddddddddddddddd", {
          status: "rejected",
          libraryPath,
        }),
      /reason is required/,
    );
    const rejected = await updateReview(
      "nutrients",
      "map.intro",
      "dddddddddddddddd",
      { status: "rejected", reason: "نطق المصطلح غير واضح", libraryPath },
    );
    assert.equal(rejected.review.status, "rejected");
    assert.equal(rejected.review.reason, "نطق المصطلح غير واضح");
    const stored = await readMetadata(
      "nutrients",
      "map.intro",
      "dddddddddddddddd",
      { libraryPath },
    );
    assert.equal(stored.review.status, "rejected");
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("alignment resolves Arabic tashkeel, repeated phrases, and punctuation", () => {
    const text = "الكبرى ثم الكبرى، والمَيّه.";
    const provider = timedAlignment(text, 0.1);
    const resolved = resolveAlignment(text, provider, [
      { phrase: "الكبرى", occurrence: 1, target: "group.macro" },
      { phrase: "الكبرى", occurrence: 2, target: "group.macro.again" },
      { phrase: "المَيّه", target: "water" },
      { phrase: "،", target: "comma" },
      { phrase: ".", target: "stop", reveal: false },
    ]);
    assert.equal(resolved.characters.join(""), text);
    assert.equal(resolved.cues.length, 5);
    const first = text.indexOf("الكبرى");
    const second = text.indexOf("الكبرى", first + 1);
    assert.equal(resolved.cues[0].start, first * 0.1);
    assert.equal(resolved.cues[0].end, (first + "الكبرى".length) * 0.1);
    assert.equal(resolved.cues[1].start, second * 0.1);
    assert.equal(resolved.cues[2].target, "water");
    assert.ok(resolved.cues[2].end > resolved.cues[2].start);
    assert.equal(resolved.cues[4].reveal, false);
    assert.equal(resolved.duration, text.length * 0.1);
  });

  test("alignment throws on any mismatch and never estimates", () => {
    const text = "المغذّيات";
    const provider = timedAlignment(text);
    assert.throws(
      () =>
        resolveAlignment(text, {
          ...provider,
          characters: [...text, "x"],
        }),
      /same length/,
    );
    assert.throws(
      () =>
        resolveAlignment(text, {
          characters: [..."other"],
          character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4],
          character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5],
        }),
      /do not match/,
    );
    const decreasing = timedAlignment(text);
    decreasing.character_start_times_seconds[1] = 0;
    decreasing.character_end_times_seconds[1] = 0.01;
    decreasing.character_start_times_seconds[2] = 0.5;
    assert.throws(() => resolveAlignment(text, decreasing), /non-decreasing/);
    assert.throws(
      () =>
        resolveAlignment(text, provider, [
          { phrase: "المغذّيات", occurrence: 2, target: "t" },
        ]),
      /not found/,
    );
  });

  test("ElevenLabs client uses mocked fetch and never leaks the key", async () => {
    const alignment = timedAlignment("مرحبا");
    const audio = Buffer.from("mp3-bytes");
    await withEnv({ ELEVENLABS_API_KEY: "leaked-secret-key-abc" }, async () => {
      const fetchOk = async (url, init) => {
        assert.match(String(url), /with-timestamps/);
        assert.match(String(url), /output_format=mp3_44100_128/);
        assert.equal(init.method, "POST");
        assert.equal(init.headers["xi-api-key"], "leaked-secret-key-abc");
        const body = JSON.parse(init.body);
        assert.equal(body.text, "مرحبا");
        assert.equal(body.model_id, "eleven_multilingual_v2");
        return new Response(
          JSON.stringify({
            audio_base64: audio.toString("base64"),
            alignment,
            normalized_alignment: { characters: ["nope"] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };
      const ok = await synthesizeSpeech(
        {
          text: "مرحبا",
          voiceId: "voice-1",
          modelId: "eleven_multilingual_v2",
          outputFormat: "mp3_44100_128",
          voiceSettings: DEFAULT_VOICE_SETTINGS,
          config: testConfig,
        },
        { fetch: fetchOk },
      );
      assert.deepEqual(ok.audio, audio);
      assert.equal(ok.alignment.characters.join(""), "مرحبا");
      assert.equal("normalized_alignment" in ok, false);

      const fetch401 = async () =>
        new Response(
          JSON.stringify({
            detail: {
              status: "invalid_api_key",
              message: "Invalid API key",
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      await assert.rejects(
        () =>
          synthesizeSpeech(
            {
              text: "مرحبا",
              voiceId: "voice-1",
              config: testConfig,
            },
            { fetch: fetch401 },
          ),
        (error) => {
          assert.match(error.message, /401/);
          assert.match(error.message, /invalid_api_key/);
          assert.match(error.message, /Invalid API key/);
          assert.ok(!error.message.includes("leaked-secret-key-abc"));
          return true;
        },
      );

      const fetchBad = async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      await assert.rejects(
        () =>
          synthesizeSpeech(
            { text: "مرحبا", voiceId: "voice-1", config: testConfig },
            { fetch: fetchBad },
          ),
        /malformed response/,
      );
    });
  });

  test("CLI plan reports missing hashes and generate aborts at the character cap", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-cli-"));
    const env = {
      NARRATION_DIR: fixtureDir,
      AUDIO_LIBRARY_PATH: libraryPath,
      ELEVENLABS_API_KEY: "test-key-not-real",
      ELEVENLABS_VOICE_ID: "voice-test",
      ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
      ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
      ELEVENLABS_MAX_CHARACTERS: "1",
    };
    const plan = await spawnAudio(["plan", "--page", "nutrients"], env);
    assert.equal(plan.code, 0);
    assert.match(plan.stdout, /map\.intro\s+missing/);
    assert.match(plan.stdout, /result\.explain\.q1\s+missing/);
    assert.match(plan.stdout, /needed_characters=\d+/);
    const needed = Number(/needed_characters=(\d+)/.exec(plan.stdout)[1]);
    assert.ok(needed > 1);
    assert.doesNotMatch(plan.stdout, /--retry-rejected/);
    const generate = await spawnAudio(
      ["generate", "--page", "nutrients", "--yes"],
      env,
    );
    assert.notEqual(generate.code, 0);
    assert.match(
      generate.stderr + generate.stdout,
      /exceeds ELEVENLABS_MAX_CHARACTERS=1/,
    );
    assert.match(generate.stderr + generate.stdout, /No requests sent/);
    const refused = await spawnAudio(["generate", "--yes"], {
      ...env,
      ELEVENLABS_API_KEY: "",
      ELEVENLABS_MAX_CHARACTERS: "100000",
    });
    assert.notEqual(refused.code, 0);
    assert.match(refused.stderr, /ELEVENLABS_API_KEY is not set/);
    const noCap = await spawnAudio(["generate", "--yes"], {
      ...env,
      ELEVENLABS_MAX_CHARACTERS: "",
    });
    assert.notEqual(noCap.code, 0);
    assert.match(noCap.stderr, /ELEVENLABS_MAX_CHARACTERS is not set/);
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("generate --retry-rejected recounts rejected clips, replaces them, and never overwrites approved", async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), "audio-retry-"));
    const env = {
      NARRATION_DIR: fixtureDir,
      AUDIO_LIBRARY_PATH: libraryPath,
      ELEVENLABS_API_KEY: "test-key-not-real",
      ELEVENLABS_VOICE_ID: "voice-test",
      ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
      ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
      ELEVENLABS_MAX_CHARACTERS: "1",
    };
    await withEnv(env, async () => {
      const config = {
        ...testConfig,
        hasApiKey: true,
        libraryPath,
        narrationDir: fixtureDir,
      };
      const segments = await loadPageSegments("nutrients", { config });
      const byId = Object.fromEntries(segments.map((s) => [s.id, s]));
      const intro = byId["map.intro"];
      const groups = byId["explore.groups"];
      const quiz = byId["quiz.q1"];
      const explain = byId["result.explain.q1"];
      const oldIntro = Buffer.from("old-rejected-bytes");
      const approvedBytes = Buffer.from("approved-must-stay");
      const seed = async (segment, status, audio, reviewExtra = {}) => {
        await writeVersion({
          audio,
          alignment: {
            duration: 0.2,
            characters: [...segment.text],
            starts: [...segment.text].map((_, i) => i * 0.01),
            ends: [...segment.text].map((_, i) => (i + 1) * 0.01),
            cues: [],
          },
          libraryPath,
          metadata: {
            segmentId: segment.id,
            page: segment.page,
            part: segment.part,
            version: segment.version,
            text: segment.text,
            hash: segment.hash,
            voiceId: config.voiceId,
            modelId: config.modelId,
            voiceSettings: config.voiceSettings,
            outputFormat: config.outputFormat,
            characters: segment.text.length,
            createdAt: "2026-01-01T00:00:00.000Z",
            ...(segment.protected ? { protected: segment.protected } : {}),
            review: { status, ...reviewExtra },
          },
        });
      };
      await seed(intro, "rejected", oldIntro, {
        reviewedAt: "2026-01-02T00:00:00.000Z",
        reason: "نطق المصطلح غير واضح",
      });
      await seed(groups, "approved", approvedBytes, {
        reviewedAt: "2026-01-02T00:00:00.000Z",
      });
      await seed(quiz, "pending", Buffer.from("pending-bytes"));
      await seed(explain, "approved", Buffer.from("explain-ok"), {
        reviewedAt: "2026-01-03T00:00:00.000Z",
      });

      const plan = await spawnAudio(["plan", "--page", "nutrients"], env);
      assert.equal(plan.code, 0);
      assert.match(plan.stdout, /map\.intro\s+rejected/);
      assert.match(plan.stdout, /reason=نطق المصطلح غير واضح/);
      assert.match(plan.stdout, /hint: use --retry-rejected/);
      assert.match(plan.stdout, /needed_characters=0/);

      const generate = await spawnAudio(
        ["generate", "--page", "nutrients", "--yes"],
        env,
      );
      assert.equal(generate.code, 0);
      assert.match(generate.stdout, /needed_characters=0/);
      assert.match(generate.stdout, /Nothing to generate/);

      const retryCap = await spawnAudio(
        ["generate", "--page", "nutrients", "--retry-rejected", "--yes"],
        env,
      );
      assert.notEqual(retryCap.code, 0);
      assert.match(retryCap.stdout, /map\.intro\s+retry/);
      assert.match(retryCap.stdout, /reason=نطق المصطلح غير واضح/);
      assert.match(
        retryCap.stdout,
        new RegExp(`needed_characters=${intro.text.length}`),
      );
      assert.match(
        retryCap.stderr + retryCap.stdout,
        /exceeds ELEVENLABS_MAX_CHARACTERS=1/,
      );
      assert.match(retryCap.stderr + retryCap.stdout, /No requests sent/);
      assert.deepEqual(
        await readAudio("nutrients", intro.id, intro.hash, { libraryPath }),
        oldIntro,
      );

      const imported = await buildPlan("nutrients", null, {
        retryRejected: true,
      });
      assert.deepEqual(
        imported.needed.map((row) => row.id),
        ["map.intro"],
      );
      assert.equal(imported.neededCharacters, intro.text.length);
      const withoutFlag = await buildPlan("nutrients");
      assert.equal(withoutFlag.needed.length, 0);

      const freshAudio = Buffer.from("new-retry-audio");
      let fetches = 0;
      const fetchOk = async () => {
        fetches += 1;
        return new Response(
          JSON.stringify({
            audio_base64: freshAudio.toString("base64"),
            alignment: timedAlignment(intro.text),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };
      await generateOne(
        imported.needed[0],
        { ...config, libraryPath },
        { fetch: fetchOk },
      );
      assert.equal(fetches, 1);
      const retried = await readMetadata("nutrients", intro.id, intro.hash, {
        libraryPath,
      });
      assert.equal(retried.review.status, "pending");
      assert.equal(retried.review.reason, undefined);
      assert.notEqual(retried.createdAt, "2026-01-01T00:00:00.000Z");
      assert.equal(retried.previousReviews.length, 1);
      assert.equal(retried.previousReviews[0].status, "rejected");
      assert.equal(retried.previousReviews[0].reason, "نطق المصطلح غير واضح");
      assert.deepEqual(
        await readAudio("nutrients", intro.id, intro.hash, { libraryPath }),
        freshAudio,
      );

      let approvedFetches = 0;
      const groupsRow = withoutFlag.rows.find((row) => row.id === groups.id);
      await assert.rejects(
        () =>
          generateOne(
            groupsRow,
            { ...config, libraryPath },
            {
              fetch: async () => {
                approvedFetches += 1;
                return new Response("nope");
              },
            },
          ),
        /approved/,
      );
      assert.equal(approvedFetches, 0);
      const stillApproved = await readMetadata(
        "nutrients",
        groups.id,
        groups.hash,
        { libraryPath },
      );
      assert.equal(stillApproved.review.status, "approved");
      assert.deepEqual(
        await readAudio("nutrients", groups.id, groups.hash, { libraryPath }),
        approvedBytes,
      );
    });
    await rm(libraryPath, { recursive: true, force: true });
  });

  test("grant tokens sign, verify, expire, and reject tampering", () => {
    const token = signAudioGrant({ now: 1_000_000, ttlMs: 50 });
    assert.match(token, /^v1\.\d+\.[A-Za-z0-9_-]+$/);
    assert.equal(verifyAudioGrant(token, { now: 1_000_049 }), true);
    assert.equal(verifyAudioGrant(token, { now: 1_000_050 }), false);
    const [v, exp, sig] = token.split(".");
    const tampered = `${v}.${exp}.${sig.slice(0, -1)}${sig.at(-1) === "A" ? "B" : "A"}`;
    assert.equal(verifyAudioGrant(tampered, { now: 1_000_000 }), false);
    assert.equal(verifyAudioGrant("nope", { now: 1_000_000 }), false);
    assert.equal(verifyAudioGrant("v2.1.abc", { now: 1_000_000 }), false);
    assert.equal(verifyAudioGrant("v1.abc.def", { now: 1_000_000 }), false);
  });
});
