import { test, expect, type Locator, type Page, type Route } from "@playwright/test";

const LESSON = "/grade/8/science/nutrients";
const CLIP = 4;

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
  return { target, reveal: true, start: 0, end: CLIP - 0.2 };
}

function ready(
  id: string,
  part: "map" | "explore" | "practice" | "quiz" | "result",
  order: number,
  target: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    part,
    order,
    protected: false,
    status: "ready" as const,
    url: `/api/audio/clip/${id}/hash-${id}`,
    duration: CLIP,
    cues: [cue(target)],
    ...extra,
  };
}

const threeSegmentManifest = {
  page: "nutrients",
  segments: [
    ready("map.groups", "map", 1, "concept-group-minor"),
    ready("map.vitamins", "map", 2, "concept-nutrient-vitamins"),
    ready("explore.lentils", "explore", 3, "food-lentils"),
    {
      id: "result.answer.q1",
      part: "result",
      order: 99,
      protected: true,
      status: "ready" as const,
      url: "/api/audio/clip/result.answer.q1/hash-protected",
      duration: CLIP,
      cues: [
        {
          target: "quiz-option-q1-proteins",
          reveal: true,
          start: 0,
          end: CLIP - 0.2,
        },
      ],
    },
  ],
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

function dock(page: Page) {
  return page.getByRole("region", { name: "التحكم الصوتي العائم" });
}

function mainPlayer(page: Page) {
  return page.getByRole("region", { name: "المشغّل الصوتي" });
}

async function openLesson(page: Page) {
  await page.goto(LESSON);
  await expect(page.locator("h1")).toBeVisible();
}

async function engineState(page: Page) {
  return page.locator("audio[data-audio-engine]").evaluate((node) => {
    const audio = node as HTMLAudioElement;
    return {
      src: audio.currentSrc || audio.getAttribute("src") || "",
      paused: audio.paused,
      currentTime: audio.currentTime,
      playbackRate: audio.playbackRate,
      count: document.querySelectorAll("audio[data-audio-engine]").length,
    };
  });
}

async function waitForPlaying(page: Page) {
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "playing",
  );
  await expect
    .poll(async () => (await engineState(page)).paused, { timeout: 8000 })
    .toBe(false);
}

async function playPage(page: Page) {
  await mainPlayer(page)
    .getByRole("button", { name: "تشغيل شرح: الصفحة" })
    .click();
  await waitForPlaying(page);
}

async function expectIndex(region: Locator, index: number, count: number) {
  await expect(region).toHaveAttribute("data-audio-segment-index", String(index));
  await expect(region).toHaveAttribute("data-audio-segment-count", String(count));
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("paused previous selects the prior segment at zero and stays paused", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "ready",
  );

  await playPage(page);
  await expectIndex(dock(page), 0, 3);
  await expect(dock(page).getByRole("button", { name: "المقطع السابق" })).toBeDisabled();

  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await waitForPlaying(page);
  await expectIndex(dock(page), 1, 3);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("map.vitamins");

  await page.locator("audio[data-audio-engine]").evaluate((node) => {
    (node as HTMLAudioElement).currentTime = 2;
  });
  await expect
    .poll(async () => (await engineState(page)).currentTime)
    .toBeGreaterThan(1.5);

  await dock(page).getByRole("button", { name: "إيقاف مؤقت" }).click();
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "paused",
  );

  await dock(page).getByRole("button", { name: "المقطع السابق" }).click();
  await expectIndex(dock(page), 0, 3);
  await expectIndex(mainPlayer(page), 0, 3);
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return {
        src: state.src,
        paused: state.paused,
        currentTime: state.currentTime,
      };
    })
    .toEqual(
      expect.objectContaining({
        paused: true,
        src: expect.stringContaining("map.groups"),
      }),
    );
  expect((await engineState(page)).currentTime).toBeLessThan(0.35);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
  await expect(
    page.locator(
      '[data-audio-target="concept-group-minor"][data-audio-active="true"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      '[data-audio-target="concept-nutrient-vitamins"][data-audio-active="true"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator("audio[data-audio-engine]")).toHaveCount(1);

  await dock(page).getByRole("button", { name: "إكمال" }).click();
  await waitForPlaying(page);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("map.groups");

  await dock(page).getByRole("button", { name: "إعادة المقطع" }).click();
  await expectIndex(dock(page), 0, 3);
  await expect
    .poll(async () => (await engineState(page)).currentTime)
    .toBeLessThan(0.4);
  await expect
    .poll(async () => (await engineState(page)).paused)
    .toBe(false);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("map.groups");
});

test("replay stays on the current segment while restart returns to the first", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await playPage(page);
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await waitForPlaying(page);
  await expectIndex(dock(page), 2, 3);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("explore.lentils");

  await page.locator("audio[data-audio-engine]").evaluate((node) => {
    (node as HTMLAudioElement).currentTime = 1.8;
  });
  await expect
    .poll(async () => (await engineState(page)).currentTime)
    .toBeGreaterThan(1.5);

  await mainPlayer(page).getByRole("button", { name: "إعادة المقطع" }).click();
  await expectIndex(mainPlayer(page), 2, 3);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("explore.lentils");
  await expect
    .poll(async () => (await engineState(page)).currentTime)
    .toBeLessThan(0.4);

  await mainPlayer(page).getByRole("button", { name: "من الأول" }).click();
  await waitForPlaying(page);
  await expectIndex(mainPlayer(page), 0, 3);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("map.groups");
});

test("first and last bounds disable manual previous and next", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await playPage(page);
  await expect(dock(page).getByRole("button", { name: "المقطع السابق" })).toBeDisabled();
  await expect(mainPlayer(page).getByRole("button", { name: "المقطع السابق" })).toBeDisabled();
  await expect(dock(page).getByRole("button", { name: "المقطع التالي" })).toBeEnabled();

  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await waitForPlaying(page);
  await expectIndex(dock(page), 2, 3);
  await expect(dock(page).getByRole("button", { name: "المقطع التالي" })).toBeDisabled();
  await expect(mainPlayer(page).getByRole("button", { name: "المقطع التالي" })).toBeDisabled();
  await expect(dock(page).getByRole("button", { name: "المقطع السابق" })).toBeEnabled();
});

test("part queues do not cross into other parts", async ({ page }) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await page
    .getByRole("button", { name: "تشغيل شرح: مختبرك الصغير" })
    .click();
  await waitForPlaying(page);
  await expectIndex(dock(page), 0, 1);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("explore.lentils");
  await expect(dock(page).getByRole("button", { name: "المقطع السابق" })).toBeDisabled();
  await expect(dock(page).getByRole("button", { name: "المقطع التالي" })).toBeDisabled();
});

test("ended auto-advance still repeats the active queue", async ({ page }) => {
  test.setTimeout(90000);
  await mockManifest(page, {
    page: "nutrients",
    segments: [
      ready("map.groups", "map", 1, "concept-group-minor"),
      ready("map.vitamins", "map", 2, "concept-nutrient-vitamins"),
    ],
  });
  await openLesson(page);
  await mainPlayer(page).getByLabel("تكرار التشغيل").selectOption("2");
  await playPage(page);
  await expect
    .poll(
      async () => {
        const state = await engineState(page);
        const status = await mainPlayer(page).getAttribute(
          "data-audio-player-status",
        );
        return { src: state.src, status };
      },
      { timeout: 40000 },
    )
    .toEqual(
      expect.objectContaining({
        src: expect.stringContaining("map.vitamins"),
        status: "playing",
      }),
    );
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "ready",
    { timeout: 40000 },
  );
});

test("pause during loading keeps paused after a stale play promise", async ({
  page,
}) => {
  let releaseClip: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseClip = resolve;
  });
  await page.route("**/api/audio/manifest**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(threeSegmentManifest),
    }),
  );
  await page.route("**/api/audio/clip**", async (route) => {
    await gate;
    return fulfillWav(route);
  });
  await openLesson(page);
  await mainPlayer(page)
    .getByRole("button", { name: "تشغيل شرح: الصفحة" })
    .click();
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "starting");
  await dock(page).getByRole("button", { name: "إيقاف مؤقت" }).click();
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
  releaseClip();
  await page.waitForTimeout(800);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "paused",
  );
  expect((await engineState(page)).paused).toBe(true);
});

test("rapid next then pause during load does not resume from a stale callback", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await mainPlayer(page)
    .getByRole("button", { name: "تشغيل شرح: الصفحة" })
    .click();
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await dock(page).getByRole("button", { name: "إيقاف مؤقت" }).click();
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
  await expectIndex(dock(page), 2, 3);
  await page.waitForTimeout(600);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
  expect((await engineState(page)).paused).toBe(true);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("explore.lentils");
});

test("shared dock and main player drive one engine and keep speed", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await playPage(page);
  await mainPlayer(page).getByLabel("سرعة التشغيل").selectOption("1.25");
  await dock(page).getByRole("button", { name: "إيقاف مؤقت" }).click();
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "paused",
  );
  await mainPlayer(page).getByRole("button", { name: "إكمال", exact: true }).click();
  await waitForPlaying(page);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "playing");
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await waitForPlaying(page);
  expect((await engineState(page)).playbackRate).toBeCloseTo(1.25);
  expect((await engineState(page)).count).toBe(1);
});

test("protected result answers stay out of the page queue and quiz choices", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  const firstChoice = page.locator(".quiz-choice").first();
  await firstChoice.click();
  await expect(firstChoice).toHaveClass(/selected/);
  await playPage(page);
  await expectIndex(dock(page), 0, 3);
  await expect
    .poll(async () => (await engineState(page)).src)
    .not.toContain("result.answer");
  await expect(
    page.locator('[data-audio-target="quiz-option-q1-proteins"][data-audio-active="true"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "السؤال 1 — مجاب" }).click();
  await expect(page.locator(".quiz-choice").first()).toHaveClass(/selected/);
});

test("honest loading, error, and not_ready dock states", async ({ page }) => {
  await page.route("**/api/audio/manifest**", async () => {
    await new Promise(() => {});
  });
  await page.goto(LESSON);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "loading");
  await expect(dock(page).getByText("جارٍ تجهيز الشرح الصوتي…")).toBeVisible();
  await expect(
    dock(page).getByRole("button", { name: "المقطع السابق" }),
  ).toHaveCount(0);

  await page.unroute("**/api/audio/manifest**");
  await page.route("**/api/audio/manifest**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "fail" }),
    }),
  );
  await page.goto(LESSON);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "error");
  await expect(
    dock(page).getByRole("button", { name: "إعادة المحاولة" }),
  ).toBeVisible();
  await expect(
    dock(page).getByRole("button", { name: "المقطع التالي" }),
  ).toHaveCount(0);

  await page.unroute("**/api/audio/manifest**");
  await mockManifest(page, notReadyManifest);
  await page.goto(LESSON);
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "not_ready");
  await expect(dock(page).getByText("الشرح الصوتي غير جاهز بعد")).toBeVisible();
  await expect(dock(page).locator("button")).toHaveCount(0);
});

test("dock stays in view at quiz on mobile and desktop without covering actions", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ] as const) {
    await page.setViewportSize(viewport);
    await mockManifest(page, threeSegmentManifest);
    await openLesson(page);
    await page.locator("#quiz").scrollIntoViewIfNeeded();
    await expect(dock(page)).toBeInViewport();
    await expect(page.locator("audio[data-audio-engine]")).toHaveCount(1);
    const nextQuestion = page.getByRole("button", { name: "التالي", exact: true });
    await expect(nextQuestion).toBeVisible();
    await nextQuestion.click();
    await expect(page.getByRole("button", { name: "السؤال 2", exact: true })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await playPage(page);
    await dock(page).getByRole("button", { name: "إيقاف مؤقت" }).click();
    await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
    if (viewport.width === 390) {
      const controls = dock(page).locator("button");
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const box = await controls.nth(i).boundingBox();
        expect(box, `dock control ${i} at 390`).toBeTruthy();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.unroute("**/api/audio/manifest**");
    await page.unroute("**/api/audio/clip**");
  }
});

test("minimize and expand keep the same audio engine", async ({ page }) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await playPage(page);
  await dock(page).getByRole("button", { name: "تصغير التحكم الصوتي" }).click();
  await expect(dock(page).getByRole("button", { name: "توسيع التحكم الصوتي" })).toBeVisible();
  await expect(page.locator("audio[data-audio-engine]")).toHaveCount(1);
  await dock(page).getByRole("button", { name: "توسيع التحكم الصوتي" }).click();
  await expect(dock(page).getByRole("button", { name: "إيقاف مؤقت" })).toBeVisible();
  expect((await engineState(page)).paused).toBe(false);
});

test("a stale play promise must not pause the next live segment", async ({
  page,
}) => {
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await page.locator("audio[data-audio-engine]").evaluate((node) => {
    const audio = node as HTMLAudioElement;
    const original = audio.play.bind(audio);
    let first = true;
    const pending: Array<() => void> = [];
    (
      window as Window & { __releaseOldestPlay?: () => void }
    ).__releaseOldestPlay = () => {
      pending.shift()?.();
    };
    audio.play = () => {
      if (first) {
        first = false;
        return new Promise<void>((resolve) => {
          pending.push(resolve);
        });
      }
      return original();
    };
  });
  await mainPlayer(page)
    .getByRole("button", { name: "تشغيل شرح: الصفحة" })
    .click();
  await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "starting");
  await dock(page).getByRole("button", { name: "المقطع التالي" }).click();
  await waitForPlaying(page);
  await expectIndex(dock(page), 1, 3);
  await expect
    .poll(async () => (await engineState(page)).src)
    .toContain("map.vitamins");
  await page.evaluate(() =>
    (window as Window & { __releaseOldestPlay?: () => void }).__releaseOldestPlay?.(),
  );
  await page.waitForTimeout(400);
  expect((await engineState(page)).paused).toBe(false);
  expect((await engineState(page)).src).toContain("map.vitamins");
  await expect(dock(page)).toHaveAttribute("data-audio-segment-index", "1");
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "playing",
  );
});

test("main starting control is pause, labeled إيقاف مؤقت, and resume is إكمال", async ({
  page,
}) => {
  let releaseClip: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseClip = resolve;
  });
  await page.route("**/api/audio/manifest**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(threeSegmentManifest),
    }),
  );
  await page.route("**/api/audio/clip**", async (route) => {
    await gate;
    return fulfillWav(route);
  });
  await openLesson(page);
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "ready",
  );
  await expect(dock(page).getByText("اضغطي تشغيل لنبدأ الشرح")).toBeVisible();
  await mainPlayer(page)
    .getByRole("button", { name: "تشغيل شرح: الصفحة" })
    .click();
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "starting",
  );
  await expect(
    mainPlayer(page).getByRole("button", { name: "إيقاف مؤقت", exact: true }),
  ).toBeVisible();
  await mainPlayer(page)
    .getByRole("button", { name: "إيقاف مؤقت", exact: true })
    .click();
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "paused",
  );
  releaseClip();
  await page.waitForTimeout(800);
  await expect(mainPlayer(page)).toHaveAttribute(
    "data-audio-player-status",
    "paused",
  );
  expect((await engineState(page)).paused).toBe(true);
  await expectIndex(dock(page), 0, 3);
  await expect(
    mainPlayer(page).getByRole("button", { name: "إكمال", exact: true }),
  ).toBeVisible();
  await expect(
    dock(page).getByRole("button", { name: "إكمال", exact: true }),
  ).toBeVisible();
});

function rectsOverlap(
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

async function visibleReadingBoxes(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      ".lesson-hero h1",
      ".lesson-nav a",
      ".lesson-body h2",
      ".learning-goals h2",
      "[data-audio-target]",
    ];
    const seen = new Set<Element>();
    const boxes: {
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
    }[] = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        if (
          rect.bottom <= 0 ||
          rect.top >= innerHeight ||
          rect.right <= 0 ||
          rect.left >= innerWidth
        ) {
          continue;
        }
        boxes.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          label: `${selector}:${(el.textContent || "").trim().slice(0, 28)}`,
        });
      }
    }
    return boxes;
  });
}

test("desktop rail keeps headings and targets clear of the dock", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  const positions = [
    async () => page.evaluate(() => window.scrollTo(0, 0)),
    async () =>
      page.evaluate(() =>
        window.scrollTo(0, Math.round(document.body.scrollHeight * 0.35)),
      ),
    async () => page.locator("#quiz").scrollIntoViewIfNeeded(),
  ];
  for (const move of positions) {
    await move();
    await expect(dock(page)).toBeInViewport();
    const panel = await dock(page).boundingBox();
    expect(panel).toBeTruthy();
    const boxes = await visibleReadingBoxes(page);
    const overlapping = boxes.filter((box) => rectsOverlap(box, panel!));
    expect(overlapping, overlapping.map((box) => box.label).join(" | ")).toEqual(
      [],
    );
  }
});

test("768 and 1024 use a lower dock that leaves quiz actions clickable", async ({
  page,
}) => {
  for (const viewport of [
    { width: 768, height: 900 },
    { width: 1024, height: 800 },
  ] as const) {
    await page.setViewportSize(viewport);
    await mockManifest(page, threeSegmentManifest);
    await openLesson(page);
    const hero = await page.locator(".lesson-hero h1").boundingBox();
    const panel = await dock(page).boundingBox();
    expect(hero && panel).toBeTruthy();
    expect(panel!.y).toBeGreaterThan(viewport.height * 0.4);
    expect(rectsOverlap(hero!, panel!)).toBe(false);
    await page.locator("#quiz").scrollIntoViewIfNeeded();
    const nextQuestion = page.getByRole("button", { name: "التالي", exact: true });
    await nextQuestion.scrollIntoViewIfNeeded();
    const actionBox = await nextQuestion.boundingBox();
    const dockNow = await dock(page).boundingBox();
    expect(actionBox && dockNow).toBeTruthy();
    expect(rectsOverlap(actionBox!, dockNow!)).toBe(false);
    await nextQuestion.click();
    await expect(
      page.getByRole("button", { name: "السؤال 2", exact: true }),
    ).toHaveAttribute("aria-current", "step");
    await page.unroute("**/api/audio/manifest**");
    await page.unroute("**/api/audio/clip**");
  }
});

test("mobile minimize shrinks width and clearance matches dock height", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockManifest(page, threeSegmentManifest);
  await openLesson(page);
  await playPage(page);
  await expect
    .poll(async () =>
      page.locator(".lesson-body").evaluate((el) =>
        Number.parseFloat(getComputedStyle(el).paddingBottom),
      ),
    )
    .toBeGreaterThan(40);
  const expanded = await dock(page).boundingBox();
  expect(expanded).toBeTruthy();
  const padding = await page.locator(".lesson-body").evaluate((el) => {
    return Number.parseFloat(getComputedStyle(el).paddingBottom);
  });
  expect(padding).toBeGreaterThanOrEqual(expanded!.height);
  await dock(page).getByRole("button", { name: "تصغير التحكم الصوتي" }).click();
  const minimized = await dock(page).boundingBox();
  expect(minimized).toBeTruthy();
  expect(minimized!.width).toBeLessThan(expanded!.width - 40);
  expect(minimized!.height).toBeLessThanOrEqual(64);
  expect(minimized!.width).toBeLessThanOrEqual(180);
  await page.locator("#quiz").scrollIntoViewIfNeeded();
  const nextQuestion = page.getByRole("button", { name: "التالي", exact: true });
  await nextQuestion.click();
  await expect(
    page.getByRole("button", { name: "السؤال 2", exact: true }),
  ).toHaveAttribute("aria-current", "step");
});

test("idle compact dock stays off quiz answers and expands when playback starts", async ({
  page,
}) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 1024, height: 900 },
  ] as const) {
    await page.setViewportSize(viewport);
    await mockManifest(page, threeSegmentManifest);
    await openLesson(page);
    await expect(mainPlayer(page)).toHaveAttribute(
      "data-audio-player-status",
      "ready",
    );
    await expect
      .poll(async () => {
        const box = await dock(page).boundingBox();
        return box?.height ?? 999;
      })
      .toBeLessThanOrEqual(64);
    await page.locator("#quiz").scrollIntoViewIfNeeded();
    const panel = await dock(page).boundingBox();
    expect(panel, `${viewport.width} dock`).toBeTruthy();
    expect(panel!.height).toBeLessThanOrEqual(64);
    if (viewport.width === 360) {
      expect(panel!.width).toBeLessThanOrEqual(180);
    }
    const quizTargets = [
      page.locator(".quiz-choice"),
      page.getByRole("button", { name: "التالي", exact: true }),
      page
        .locator(".quiz-actions")
        .getByRole("button", { name: "السابق", exact: true }),
    ];
    for (const target of quizTargets) {
      const count = await target.count();
      for (let i = 0; i < count; i++) {
        const node = target.nth(i);
        if (!(await node.isVisible())) continue;
        const box = await node.boundingBox();
        if (!box) continue;
        expect(
          rectsOverlap(panel!, box),
          `${viewport.width} dock vs ${await node.evaluate((el) => el.textContent?.slice(0, 24) || el.className)}`,
        ).toBe(false);
      }
    }
    await playPage(page);
    await expect(dock(page).getByRole("button", { name: "المقطع التالي" })).toBeVisible();
    const expanded = await dock(page).boundingBox();
    expect(expanded).toBeTruthy();
    expect(expanded!.height).toBeGreaterThan(64);
    await page.unroute("**/api/audio/manifest**");
    await page.unroute("**/api/audio/clip**");
  }
});
