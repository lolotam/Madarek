import { test, expect } from "@playwright/test";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { writeVersion } from "../../src/server/audio/library.mjs";
import { loadPageSegments } from "../../src/server/audio/segments.mjs";

const LESSON = "/grade/8/science/nutrients";
const libraryPath = resolve(".data/audio-e2e");
const silentMp3Path = resolve("tests/fixtures/audio/silence-2s.mp3");
const e2eHash = "c0ffee00c0ffee00";

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

test.beforeAll(async () => {
  process.env.AUDIO_LIBRARY_PATH = libraryPath;
  process.env.NARRATION_DIR = resolve("tests/fixtures/narration");
  await rm(libraryPath, { recursive: true, force: true });
  const audio = await readFile(silentMp3Path);
  const segments = await loadPageSegments("nutrients");
  const intro = segments.find(
    (segment: { id: string }) => segment.id === "map.intro",
  );
  if (!intro) throw new Error("map.intro fixture segment is missing");
  await writeVersion({
    audio,
    alignment: {
      duration: 2,
      characters: [...intro.text],
      starts: [...intro.text].map((_: string, i: number) => i * 0.02),
      ends: [...intro.text].map((_: string, i: number) => (i + 1) * 0.02),
      cues: [
        {
          target: "concept-nutrient-vitamins",
          reveal: true,
          start: 0.2,
          end: 0.9,
        },
        { target: "food-lentils", reveal: true, start: 1.0, end: 1.8 },
      ],
    },
    libraryPath,
    metadata: {
      segmentId: intro.id,
      page: intro.page,
      part: intro.part,
      version: intro.version,
      text: intro.text,
      hash: e2eHash,
      voiceId: "e2e-voice",
      modelId: "eleven_multilingual_v2",
      voiceSettings: { stability: 0.5, similarity_boost: 0.75 },
      outputFormat: "mp3_44100_128",
      characters: intro.text.length,
      createdAt: "2026-09-01T00:00:00.000Z",
      review: { status: "approved", reviewedAt: "2026-09-02T00:00:00.000Z" },
    },
  });
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("real approved clip plays, highlights, and reveals without mocks", async ({
  page,
}) => {
  const manifestStatuses: number[] = [];
  const clipStatuses: number[] = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/audio/manifest")) {
      manifestStatuses.push(response.status());
    }
    if (url.includes("/api/audio/clip/")) {
      clipStatuses.push(response.status());
    }
  });

  await page.goto(LESSON);
  await expect(page.locator("h1")).toBeVisible();
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();

  const ended = page.locator("audio[data-audio-engine]").evaluate((node) => {
    const audio = node as HTMLAudioElement;
    return new Promise<void>((resolve) => {
      if (audio.ended) return resolve();
      audio.addEventListener("ended", () => resolve(), { once: true });
    });
  });
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect
    .poll(
      () =>
        page.locator("audio[data-audio-engine]").evaluate((node) => {
          const audio = node as HTMLAudioElement;
          return audio.paused === false && audio.ended === false;
        }),
      { timeout: 8000 },
    )
    .toBe(true);
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toBeVisible();

  const firstTarget = page.locator(
    '[data-audio-target="concept-nutrient-vitamins"]',
  );
  await expect(firstTarget).toHaveAttribute("data-audio-active", "true", {
    timeout: 8000,
  });
  const ring = page.locator("[data-audio-highlight-ring]");
  await expect(ring).toBeVisible();
  const ringBox = await ring.boundingBox();
  const targetBox = await firstTarget.boundingBox();
  expect(ringBox && targetBox && boxesOverlap(ringBox, targetBox)).toBe(true);
  await expect(
    page.getByRole("tab", { name: /المغذّيات الصغرى/ }),
  ).toHaveAttribute("data-state", "active");

  await expect(
    page.getByRole("button", { name: "العدس", exact: true }),
  ).toHaveAttribute("aria-pressed", "true", { timeout: 8000 });
  await expect(
    page.locator(
      '[data-audio-target="food-lentils"][data-audio-active="true"]',
    ),
  ).toBeVisible();

  await ended;
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await expect(page.locator("[data-audio-highlight-ring]")).not.toBeVisible();

  expect(manifestStatuses.some((status) => status === 200)).toBe(true);
  expect(clipStatuses.some((status) => status === 200 || status === 206)).toBe(
    true,
  );
});
