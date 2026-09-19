import { test, expect, type Page, type Route } from "@playwright/test";
import { resolve } from "node:path";
import { createStore } from "../../src/server/store.mjs";

const password = "valid-password-123";
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

async function mockReadyNarration(page: Page) {
  await page.route("**/api/audio/manifest**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: "nutrients",
        segments: [
          {
            id: "map.groups",
            part: "map",
            order: 1,
            protected: false,
            status: "ready",
            url: "/api/audio/clip/map.groups/hash-map",
            duration: CLIP,
            cues: [
              {
                target: "concept-group-minor",
                reveal: true,
                start: 0,
                end: CLIP - 0.2,
              },
            ],
          },
        ],
      }),
    }),
  );
  await page.route("**/api/audio/clip**", (route) => fulfillWav(route));
}

function dock(page: Page) {
  return page.getByRole("region", { name: "التحكم الصوتي العائم" });
}

async function enginePaused(page: Page) {
  return page.locator("audio[data-audio-engine]").evaluate((node) => {
    return (node as HTMLAudioElement).paused;
  });
}

async function signInAdmin(page: Page) {
  const email = `video-admin-${Date.now()}@example.test`;
  const register = await page.request.post("/api/register", {
    data: { name: "مديرة الفيديو", email, password, children: [] },
  });
  expect(register.ok()).toBeTruthy();
  const store = createStore(resolve(".data/browser-qa.sqlite"));
  try {
    store.promoteAdmin(email);
  } finally {
    store.close();
  }
  const login = await page.request.post("/api/login", {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  return email;
}

async function saveVideo(
  page: Page,
  lessonId: string,
  title: string,
) {
  const save = await page.request.post("/api/admin/videos/save", {
    data: {
      lessonId,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title,
      goal: "نراجع المغذّيات بمثال من المطبخ.",
      kind: lessonId === "platform" ? "guide" : "review",
      duration: "3:20",
      position: 0,
      published: true,
    },
  });
  expect(save.ok()).toBeTruthy();
  return save.json() as Promise<{ id: string }>;
}

async function setDockExpanded(page: Page, expanded: boolean) {
  const region = dock(page);
  const restore = region.getByRole("button", { name: "توسيع التحكم الصوتي" });
  const minimize = region.getByRole("button", { name: "تصغير التحكم الصوتي" });
  if (expanded) {
    if (await restore.isVisible()) await restore.click();
    await expect(minimize).toBeVisible();
  } else if (await minimize.isVisible()) {
    await minimize.click();
    await expect(restore).toBeVisible();
  }
}

async function hitAt(page: Page, x: number, y: number) {
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { dock: false, dialog: false, overlay: false };
    return {
      dock: Boolean(el.closest(".audio-dock")),
      dialog: Boolean(el.closest("[role='dialog']")),
      overlay: Boolean(el.closest(".admin-dialog-overlay, .admin-dialog-layer")),
    };
  }, { x, y });
}

async function assertModalAboveDock(page: Page, label: string) {
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "إغلاق" });
  const player = dialog.locator(".video-frame");
  const dockEl = page.locator(".audio-dock");
  await expect(dialog).toBeVisible();
  await expect(close).toBeVisible();
  await expect(player).toBeVisible();
  await expect(dockEl).toBeAttached();

  const stack = await page.evaluate(() => {
    const layerEl = document.querySelector(".admin-dialog-layer");
    const dialogEl = document.querySelector(".admin-dialog");
    const overlayEl = document.querySelector(".admin-dialog-overlay");
    const dockNode = document.querySelector(".audio-dock");
    return {
      layer: Number(getComputedStyle(layerEl!).zIndex),
      dialog: Number(getComputedStyle(dialogEl!).zIndex),
      overlay: Number(getComputedStyle(overlayEl!).zIndex),
      dock: Number(getComputedStyle(dockNode!).zIndex),
    };
  });
  expect(stack.layer, `${label} layer z-index`).toBeGreaterThan(stack.dock);
  expect(stack.dialog, `${label} dialog z-index`).toBeGreaterThan(stack.dock);
  expect(stack.overlay, `${label} overlay z-index`).toBeGreaterThan(stack.dock);

  const dockBox = await dockEl.boundingBox();
  expect(dockBox, `${label} dock box`).toBeTruthy();
  const dockHit = await hitAt(
    page,
    dockBox!.x + dockBox!.width / 2,
    dockBox!.y + dockBox!.height / 2,
  );
  expect(dockHit.dock, `${label} dock center must be under the modal`).toBe(false);
  expect(
    dockHit.dialog || dockHit.overlay,
    `${label} dock center covered by modal`,
  ).toBe(true);

  for (const [name, target] of [
    ["close", close],
    ["player", player],
  ] as const) {
    const box = await target.boundingBox();
    expect(box, `${label} ${name} box`).toBeTruthy();
    const samples = [
      { x: box!.x + Math.min(12, box!.width / 2), y: box!.y + Math.min(12, box!.height / 2) },
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
      { x: box!.x + box!.width - Math.min(12, box!.width / 2), y: box!.y + box!.height / 2 },
    ];
    for (const point of samples) {
      const hit = await hitAt(page, point.x, point.y);
      expect(hit.dock, `${label} dock covering ${name} at ${point.x},${point.y}`).toBe(
        false,
      );
    }
  }
}

async function assertNoHorizontalScroll(page: Page, label: string) {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(sizes.scrollWidth, label).toBeLessThanOrEqual(sizes.innerWidth);
}

test("an admin adds a lesson video and it opens after the quiz without autoplay", async ({
  page,
}) => {
  await signInAdmin(page);
  const title = `فيديو اختبار ${Date.now()}`;
  const save = await page.request.post("/api/admin/videos/save", {
    data: {
      lessonId: "nutrients",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title,
      goal: "نراجع المغذّيات بمثال من المطبخ.",
      kind: "review",
      duration: "3:20",
      position: 0,
      published: true,
    },
  });
  expect(save.ok()).toBeTruthy();
  const video = await save.json();
  try {
    await page.goto("/grade/8/science/nutrients");
    const card = page.getByRole("button", { name: new RegExp(title) });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    const frame = dialog.locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
    );
    await expect(frame).not.toHaveAttribute("src", /autoplay=1/);
    await dialog.getByRole("button", { name: "إغلاق" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/admin");
    await page.getByRole("tab", { name: /الفيديوهات/ }).click();
    await expect(page.getByText(title)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.request.post("/api/admin/videos/delete", {
      data: { id: video.id },
    });
  }
});

test("opening a lesson video pauses narration and does not resume when the modal closes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAdmin(page);
  const title = `فيديو إيقاف ${Date.now()}`;
  const video = await saveVideo(page, "nutrients", title);
  try {
    await mockReadyNarration(page);
    await page.goto(LESSON);
    const play = page.getByRole("button", { name: "تشغيل شرح: الصفحة" });
    await expect(play).toBeVisible();
    await play.click();
    await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "playing");
    await expect
      .poll(async () => enginePaused(page), { timeout: 8000 })
      .toBe(false);

    const card = page.getByRole("button", { name: new RegExp(title) });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    const dockRoot = page.locator(".audio-dock");
    await expect(dockRoot).toHaveAttribute("data-audio-dock-status", "paused");
    await expect(dockRoot.locator('[aria-label="إكمال"]')).toBeAttached();
    await expect.poll(async () => enginePaused(page)).toBe(true);

    await dialog.getByRole("button", { name: "إغلاق" }).click();
    await expect(dialog).toBeHidden();
    await expect(dock(page)).toHaveAttribute("data-audio-dock-status", "paused");
    await expect(dock(page).getByRole("button", { name: "إكمال" })).toBeVisible();
    await expect.poll(async () => enginePaused(page)).toBe(true);
  } finally {
    await page.request.post("/api/admin/videos/delete", {
      data: { id: video.id },
    });
  }
});

test("the audio dock does not cover the video modal player or close button", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAdmin(page);
  const title = `فيديو طبقات ${Date.now()}`;
  const video = await saveVideo(page, "nutrients", title);
  try {
    await mockReadyNarration(page);
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 1024, height: 900 },
      { width: 1440, height: 900 },
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto(LESSON);
      await expect(dock(page)).toBeVisible();
      const card = page.getByRole("button", { name: new RegExp(title) });
      for (const expanded of [false, true]) {
        await setDockExpanded(page, expanded);
        await card.scrollIntoViewIfNeeded();
        await card.click();
        await assertModalAboveDock(
          page,
          `${viewport.width} ${expanded ? "expanded" : "idle"}`,
        );
        await page.getByRole("dialog", { name: title }).getByRole("button", { name: "إغلاق" }).click();
        await expect(page.getByRole("dialog", { name: title })).toBeHidden();
      }
    }
  } finally {
    await page.request.post("/api/admin/videos/delete", {
      data: { id: video.id },
    });
  }
});

test("lesson videos and student dashboard stay within 360 390 768 1440", async ({
  page,
}) => {
  const username = `vd-${Date.now()}`;
  const register = await page.request.post("/api/register", {
    data: {
      name: "ولي أمر العرض",
      email: `vd-${Date.now()}@example.test`,
      password: "Test-password-9876",
      children: [
        { name: "سارة", username, pin: "73918264", grade: 8, gender: "female" },
      ],
    },
  });
  expect(register.ok()).toBeTruthy();
  const adminEmail = await signInAdmin(page);
  const lessonTitle = `فيديو عرض ${Date.now()}`;
  const guideTitle = `دليل عرض ${Date.now()}`;
  const lessonVideo = await saveVideo(page, "nutrients", lessonTitle);
  const guideVideo = await saveVideo(page, "platform", guideTitle);
  try {
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto(LESSON);
      await expect(
        page.getByRole("button", { name: new RegExp(lessonTitle) }),
      ).toBeVisible();
      await assertNoHorizontalScroll(page, `lesson ${viewport.width}`);

      const student = await page.request.post("/api/student-login", {
        data: { username, pin: "73918264" },
      });
      expect(student.ok()).toBeTruthy();
      await page.goto("/dashboard");
      await expect(page.locator(".rewards-hero")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "أنجزي نشاطًا واحدًا اليوم" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(guideTitle) }),
      ).toBeVisible();
      await assertNoHorizontalScroll(page, `dashboard ${viewport.width}`);
    }
  } finally {
    const login = await page.request.post("/api/login", {
      data: { email: adminEmail, password },
    });
    expect(login.ok()).toBeTruthy();
    await page.request.post("/api/admin/videos/delete", {
      data: { id: lessonVideo.id },
    });
    await page.request.post("/api/admin/videos/delete", {
      data: { id: guideVideo.id },
    });
  }
});
