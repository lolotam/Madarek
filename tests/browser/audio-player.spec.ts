import { test, expect, type Page, type Route } from "@playwright/test";

const LESSON = "/grade/8/science/nutrients";
const CLIP = 1.5;

function buildWav(durationSec = CLIP, sampleRate = 8000): Buffer {
  const numSamples = Math.round(durationSec * sampleRate);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(
      Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 6000,
    );
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

const wav = buildWav();

function cue(target: string) {
  return { target, reveal: true, start: 0, end: CLIP - 0.05 };
}

function ready(
  id: string,
  part: "map" | "explore" | "practice" | "quiz",
  order: number,
  target: string,
) {
  return {
    id,
    part,
    order,
    protected: false,
    status: "ready" as const,
    url: `/api/audio/clip/${id}/hash`,
    duration: CLIP,
    cues: [cue(target)],
  };
}

const pageManifest = {
  page: "nutrients",
  segments: [
    ready("map.groups", "map", 1, "concept-group-minor"),
    ready("map.vitamins", "map", 2, "concept-nutrient-vitamins"),
    ready("explore.lentils", "explore", 3, "food-lentils"),
    ready("explore.lab", "explore", 4, "lab-step-energy-1"),
  ],
};

const quizManifest = {
  page: "nutrients",
  segments: [ready("quiz.q2", "quiz", 1, "quiz-question-q2")],
};

const notReadyManifest = {
  page: "nutrients",
  segments: [
    {
      id: "map.intro",
      part: "map",
      order: 1,
      protected: false,
      status: "not_ready",
    },
  ],
};

async function fulfillWav(route: Route) {
  const range = route.request().headers()["range"];
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] === "" ? wav.length - 1 : Number(match[2]);
      const slice = wav.subarray(start, end + 1);
      return route.fulfill({
        status: 206,
        contentType: "audio/wav",
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${start + slice.length - 1}/${wav.length}`,
          "Content-Length": String(slice.length),
        },
        body: slice,
      });
    }
  }
  return route.fulfill({
    status: 200,
    contentType: "audio/wav",
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(wav.length),
    },
    body: wav,
  });
}

async function mockManifest(page: Page, body: unknown, status = 200) {
  await page.route("**/api/audio/manifest**", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
  await page.route("**/api/audio/clip**", (route) => fulfillWav(route));
}

async function openLesson(page: Page) {
  await page.goto(LESSON);
  await expect(page.locator("h1")).toBeVisible();
}

async function instrumentEnded(page: Page) {
  await page.locator("audio[data-audio-engine]").evaluate((audio) => {
    (window as Window & { __audioEnded?: number }).__audioEnded = 0;
    audio.addEventListener("ended", () => {
      const w = window as Window & { __audioEnded?: number };
      w.__audioEnded = (w.__audioEnded || 0) + 1;
    });
  });
}

function endedCount(page: Page) {
  return page.evaluate(
    () => (window as Window & { __audioEnded?: number }).__audioEnded || 0,
  );
}

async function documentBox(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  });
}

function expectSameBox(
  before: { x: number; y: number; width: number; height: number },
  during: { x: number; y: number; width: number; height: number },
) {
  expect(Math.abs(before.x - during.x)).toBeLessThan(1);
  expect(Math.abs(before.y - during.y)).toBeLessThan(1);
  expect(Math.abs(before.width - during.width)).toBeLessThan(1);
  expect(Math.abs(before.height - during.height)).toBeLessThan(1);
}

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

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("page play highlights each cue and reveals its state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockManifest(page, pageManifest);
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toBeVisible();

  await expect(
    page.locator(
      '[data-audio-target="concept-group-minor"][data-audio-active="true"]',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: /المغذّيات الصغرى/ }),
  ).toHaveAttribute("data-state", "active");

  await expect(
    page.locator(
      '[data-audio-target="concept-nutrient-vitamins"][data-audio-active="true"]',
    ),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole("button", { name: "الفيتامينات", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await expect(
    page.locator(
      '[data-audio-target="food-lentils"][data-audio-active="true"]',
    ),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole("button", { name: "العدس", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await expect(
    page.locator(
      '[data-audio-target="lab-step-energy-1"][data-audio-active="true"]',
    ),
  ).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".experiment-caption")).toContainText("الجلوكوز");
  expect(errors).toEqual([]);
});

test("pause, resume, and stop clear the highlight", async ({ page }) => {
  await mockManifest(page, pageManifest);
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toBeVisible();
  await expect(page.locator("[data-audio-active=true]")).toHaveCount(1);
  await expect(page.locator("[data-audio-highlight-ring]")).toBeVisible();

  await page.getByRole("button", { name: "إيقاف مؤقت", exact: true }).click();
  await expect(
    page.locator('[data-audio-player-status="paused"]'),
  ).toBeVisible();
  await expect(page.locator("[data-audio-highlight-ring]")).toBeVisible();
  await page.getByRole("button", { name: "تشغيل", exact: true }).click();
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toBeVisible();

  await page.getByRole("button", { name: "إيقاف", exact: true }).click();
  await expect(page.locator("[data-audio-active=true]")).toHaveCount(0);
  await expect(page.locator("[data-audio-highlight-ring]")).not.toBeVisible();
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
});

test("repeat twice plays the queue twice and continuous stops immediately", async ({
  page,
}) => {
  test.setTimeout(90000);
  await mockManifest(page, pageManifest);
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await instrumentEnded(page);

  await page.getByLabel("تكرار التشغيل").selectOption("2");
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect
    .poll(() => endedCount(page), { timeout: 40000 })
    .toBe(pageManifest.segments.length * 2);
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toHaveCount(0);

  await page.getByLabel("تكرار التشغيل").selectOption("loop");
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toBeVisible();
  const beforeStop = await endedCount(page);
  await page.getByRole("button", { name: "إيقاف", exact: true }).click();
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page.waitForTimeout(1800);
  expect(await endedCount(page)).toBe(beforeStop);
});

test("a manual food click during playback stops audio", async ({ page }) => {
  await mockManifest(page, pageManifest);
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "العدس", exact: true }).click();
  await expect(
    page.locator('[data-audio-player-status="playing"]'),
  ).toHaveCount(0);
  await expect(page.locator("[data-audio-active=true]")).toHaveCount(0);
});

test("a not-ready manifest shows the message and the lesson still works", async ({
  page,
}) => {
  await mockManifest(page, notReadyManifest);
  await openLesson(page);
  await expect(
    page.getByText("الشرح الصوتي غير جاهز بعد", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /المغذّيات الصغرى/ }).click();
  await expect(
    page.getByRole("button", { name: "الفيتامينات", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "العدس", exact: true }).click();
  await expect(page.locator(".food-reveal")).toContainText(
    "البروتينات النباتية",
  );
});

test("a manifest 500 shows an error with retry", async ({ page }) => {
  let hits = 0;
  await page.route("**/api/audio/manifest**", (route) => {
    hits += 1;
    if (hits === 1) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "fail" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pageManifest),
    });
  });
  await page.route("**/api/audio/clip**", (route) => fulfillWav(route));
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="error"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
});

test("a quiz-question cue navigates without changing a selected answer", async ({
  page,
}) => {
  await mockManifest(page, quizManifest);
  await openLesson(page);
  await expect(
    page.getByRole("button", { name: "السؤال 1", exact: true }),
  ).toBeVisible();
  const firstChoice = page.locator(".quiz-choice").first();
  await firstChoice.click();
  await expect(firstChoice).toHaveClass(/selected/);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "تشغيل شرح: حان وقت الاكتشاف" })
    .click();
  await expect(
    page.getByRole("button", { name: "السؤال 2", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await page.getByRole("button", { name: "السؤال 1 — مجاب" }).click();
  await expect(page.locator(".quiz-choice").first()).toHaveClass(/selected/);
});

test("player does not cause horizontal scroll at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockManifest(page, pageManifest);
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("overlay tracks a late-mounted concept detail card", async ({ page }) => {
  await mockManifest(page, {
    page: "nutrients",
    segments: [
      ready("map.vitamins-detail", "map", 1, "concept-detail-vitamins"),
    ],
  });
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect(
    page.locator(
      '[data-audio-target="concept-detail-vitamins"][data-audio-active="true"]',
    ),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole("button", { name: "الفيتامينات", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const ring = page.locator("[data-audio-highlight-ring]");
  await expect(ring).toBeVisible();
  const ringBox = await ring.boundingBox();
  const cardBox = await page
    .locator('[data-audio-target="concept-detail-vitamins"]')
    .boundingBox();
  expect(ringBox && cardBox && boxesOverlap(ringBox, cardBox)).toBe(true);
});

test("a quiz-fill cue draws a ring over the input", async ({ page }) => {
  await mockManifest(page, {
    page: "nutrients",
    segments: [ready("quiz.fill", "quiz", 1, "quiz-fill-q7")],
  });
  await openLesson(page);
  await expect(
    page.getByRole("button", { name: "السؤال 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "تشغيل شرح: حان وقت الاكتشاف" })
    .click();
  const fill = page.locator('[data-audio-target="quiz-fill-q7"]');
  await expect(fill).toBeVisible({ timeout: 8000 });
  await expect(fill).toHaveAttribute("data-audio-active", "true");
  const ring = page.locator("[data-audio-highlight-ring]");
  await expect(ring).toBeVisible();
  const ringBox = await ring.boundingBox();
  const inputBox = await fill.boundingBox();
  expect(ringBox && inputBox && boxesOverlap(ringBox, inputBox)).toBe(true);
});

test("highlighting does not change the hero or food-detail layout", async ({
  page,
}) => {
  await mockManifest(page, {
    page: "nutrients",
    segments: [
      ready("map.hero", "map", 1, "lesson-hero"),
      ready("explore.oats-detail", "explore", 2, "food-detail-oats"),
    ],
  });
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  const heroBefore = await documentBox(
    page,
    '[data-audio-target="lesson-hero"]',
  );
  const foodBefore = await documentBox(
    page,
    '[data-audio-target="food-detail-oats"]',
  );
  await page.getByRole("button", { name: "تشغيل شرح: الصفحة" }).click();
  await expect(
    page.locator('[data-audio-target="lesson-hero"][data-audio-active="true"]'),
  ).toBeVisible();
  expectSameBox(
    heroBefore,
    await documentBox(page, '[data-audio-target="lesson-hero"]'),
  );
  await expect(
    page.locator(
      '[data-audio-target="food-detail-oats"][data-audio-active="true"]',
    ),
  ).toBeVisible({ timeout: 8000 });
  expectSameBox(
    foodBefore,
    await documentBox(page, '[data-audio-target="food-detail-oats"]'),
  );
});

test("player controls are at least 44px at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockManifest(page, pageManifest);
  await openLesson(page);
  await expect(
    page.locator('[data-audio-player-status="ready"]'),
  ).toBeVisible();
  const controls = page.locator(
    ".audio-player button, .audio-player select, .audio-player .audio-follow, .audio-player input[type='range']",
  );
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    expect(box, `control ${i}`).toBeTruthy();
    expect(box!.height, `control ${i} height`).toBeGreaterThanOrEqual(44);
    expect(box!.width, `control ${i} width`).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
