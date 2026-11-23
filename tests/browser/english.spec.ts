import { expect, test } from "@playwright/test";
import { createStore } from "../../src/server/store.mjs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

test("a mobile pupil opens a school-day lesson, submits and reloads a saved answer", async ({
  page,
}) => {
  const unique = randomUUID().slice(0, 8),
    name = "pupil-" + unique,
    secret = "practice-" + unique;
  const family = await page.request.post("/api/register", {
    data: {
      name: "English family",
      username: "family-" + unique,
      password: "family-pass-" + unique,
      children: [
        {
          name: "Pupil",
          username: name,
          pin: secret,
          englishMascot: "barq",
          grade: 2,
          gender: "male",
        },
      ],
    },
  });
  expect(family.status()).toBe(200);
  await page.request.post("/api/logout", { data: {} });
  await page.addInitScript(() => {
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      start.apply(this, args);
      document.documentElement.dataset.applause = "played";
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/grade/2");
  await page.getByRole("link", { name: /اللغة الإنجليزية/ }).click();
  await expect(page.locator(".school-index a")).toHaveCount(20);
  await page.getByRole("link", { name: "ابدأ الوحدة" }).click();
  await page
    .getByRole("link", { name: "ادخل بحساب الطالب لحفظ الإجابة" })
    .click();
  await page.getByLabel("اسم مستخدم الطالب").fill(name);
  await page.getByLabel("كلمة المرور أو رمز الدخول").fill(secret);
  await page.getByRole("button", { name: "دخول إلى مساحتي" }).click();
  await expect(page).toHaveURL(/\/grade\/2\/english\/1$/);
  await expect(page.locator(".school-mascot")).toHaveAttribute(
    "aria-label",
    /برق/,
  );
  const firstQuestion = page.locator(".school-work h2");
  const question = await firstQuestion.textContent();
  const next = page.getByRole("button", { name: "السؤال التالي" });

  await page.getByRole("radio", { name: "Go to bed", exact: true }).check();
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  await expect(page.locator(".school-result")).toHaveAttribute(
    "data-outcome",
    "incorrect",
  );
  await expect(page.locator(".school-miss")).toHaveText("×");
  await expect(page.locator(".school-mascot img")).toHaveAttribute(
    "src",
    /barq\/retry\.gif$/,
  );
  await expect(page.locator(".school-work")).toHaveAttribute(
    "data-answer-shake",
    "",
  );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-applause",
    "played",
  );
  await expect(firstQuestion).toHaveText(question!);
  await expect(next).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".school-miss")).toBeHidden();
  await expect(page.locator(".school-result")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.getByRole("button", { name: "تعديل الإجابة" }).click();
  await expect(
    page.getByRole("radio", { name: "Go to bed", exact: true }),
  ).toBeFocused();
  await page.getByRole("radio", { name: "Get up", exact: true }).check();
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  await expect(page.locator(".school-result")).toContainText(
    "أحسنت! إجابتك صحيحة · 100٪",
  );
  await expect(page.locator(".school-confetti span")).toHaveCount(24);
  await expect(page.locator(".school-mascot img")).toHaveAttribute(
    "src",
    /barq\/correct\.gif$/,
  );
  await expect(page.locator("html")).toHaveAttribute("data-applause", "played");
  await expect(firstQuestion).toHaveText(question!);
  const attempts = await (
    await page.request.get("/api/english/history")
  ).json();
  expect(
    attempts
      .filter((attempt: { qid: string }) => attempt.qid === "1-1")
      .map((attempt: { score: number }) => attempt.score),
  ).toEqual([100, 0]);
  await next.click();
  await expect(firstQuestion).toHaveText("What do you carry to school?");
  await page.reload();
  await expect(page.locator(".school-confetti")).toHaveCount(0);
  await expect(page.locator(".school-result")).toContainText("100٪");
  await expect(page.locator("hyperframes-player")).toHaveCount(1);
  await expect
    .poll(() => page.frames().some((f) => f.url() === "about:srcdoc"))
    .toBe(true);
  await expect
    .poll(async () => {
      const frame = page.frames().find((f) => f.url() === "about:srcdoc");
      return frame
        ? frame.evaluate(
            () =>
              (
                window as unknown as {
                  __timelines?: { diagram?: { time(): number } };
                }
              ).__timelines?.diagram?.time() || 0,
          )
        : 0;
    })
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/grade/2/english/6");
  await expect(page.locator(".school-pencils canvas")).toHaveCount(1);
  await expect(page.locator(".school-pencils canvas")).toBeVisible();
  await page.goto("/grade/2/english/17");
  await page.getByRole("textbox").fill("I like english.");
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  const result = page.locator(".school-result");
  await expect(result).toContainText("80٪");
  await expect(result).toContainText("0.8 / 1");
  await expect(result).toContainText("Pupil");
  await page.screenshot({
    path: "tmp/english-pupil-mobile.png",
    fullPage: true,
  });
  await page.goto("/dashboard");
  await expect(page.getByText("درجات Pupil", { exact: false })).toBeVisible();
  await page.locator(".history details").first().locator("summary").click();
  await expect(
    page.getByText("I like english.", { exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/english/models")).status()).toBe(403);
  await page.getByText("غيّر شخصيتك", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "برق" })).toBeChecked();
  await page.getByRole("radio", { name: "لوز" }).check();
  await page.getByRole("button", { name: "حفظ الشخصية" }).click();
  await expect(page.getByText("تم حفظ شخصيتك.", { exact: true })).toBeVisible();
  await page.goto("/grade/2/english/9");
  await expect(page.locator(".school-mascot")).toHaveAttribute(
    "aria-label",
    /لوز/,
  );
  await expect(page.getByRole("button", { name: "سجّل تهجئتك" })).toBeVisible();
});

test("a visitor submits and sees each question graded before moving on", async ({
  page,
}) => {
  await page.goto("/grade/2/english/4");
  const submit = page.getByRole("button", { name: "إرسال الإجابة" });
  const prompt = page.locator(".school-work h2");
  const result = page.locator(".school-result");

  await expect(submit).toBeVisible();
  await expect(submit).toBeDisabled();
  await page.getByRole("radio", { name: "In the lab", exact: true }).check();
  await submit.click();
  await expect(result).toContainText("100٪");
  await expect(result).not.toContainText("محفوظة باسم");
  await expect(prompt).toHaveText("Where can we do science experiments?");
  expect((await page.request.get("/api/english/history")).status()).toBe(401);

  await page.getByRole("button", { name: "السؤال التالي" }).click();
  await expect(prompt).toHaveText("We play sports in ___ class.");
  await expect(result).toHaveCount(0);
  await page.getByRole("textbox").fill("PE");
  await submit.click();
  await expect(result).toContainText("100٪");
  await expect(prompt).toHaveText("We play sports in ___ class.");
});

test("iPad practice shows counts, lets pupils drag and swap matches, and opens grammar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/grade/2/english");
  await expect(
    page.locator(".school-index .school-question-count"),
  ).toHaveCount(20);
  await expect(
    page.locator(".school-index a").filter({ hasText: "Every day" }),
  ).toContainText("٥٥ سؤالًا");
  await expect(page.locator(".school-grammar-card")).toHaveCount(3);
  await page
    .locator(".school-grammar-card")
    .filter({ hasText: "Present simple" })
    .click();
  await expect(
    page.getByRole("heading", { name: "المضارع البسيط", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("انتقل لسؤال").locator("option")).toHaveCount(
    55,
  );
  await page.getByLabel("انتقل لسؤال").selectOption("54");
  await expect(page.locator(".school-work h2")).toContainText("Sara");

  await page.goto("/grade/2/english/4");
  const next = page.getByRole("button", { name: "السؤال التالي" });
  await next.click();
  await next.click();
  const board = page.locator(".school-match-board");
  const left = board.locator("[data-match-left]");
  const right = board.locator("[data-match-right]");
  async function dragMatch(fromText: string, toText: string) {
    const from = await left.filter({ hasText: fromText }).boundingBox();
    const to = await right.filter({ hasText: toText }).boundingBox();
    expect(from && to).toBeTruthy();
    await page.mouse.move(
      from!.x + from!.width / 2,
      from!.y + from!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
  }
  await board.scrollIntoViewIfNeeded();
  await dragMatch("Library", "Play basketball");
  await left.filter({ hasText: "Gym" }).click();
  await right.filter({ hasText: "Read a book" }).click();
  await dragMatch("Science lab", "Do an experiment");
  const submit = page.getByRole("button", { name: "إرسال الإجابة" });
  await submit.click();
  await expect(page.locator(".school-result")).toContainText("33٪");
  await page.getByRole("button", { name: "تعديل الإجابة" }).click();
  await board.scrollIntoViewIfNeeded();
  await dragMatch("Library", "Read a book");
  await submit.click();
  await expect(page.locator(".school-result")).toContainText("100٪");
  await expect(board.locator("canvas")).toBeVisible();
  const workWidth = await page
    .locator(".school-work")
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(workWidth).toBeGreaterThan(730);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(820);

  await page.goto("/grade/2/english/grammar/past");
  await expect(
    page.getByRole("heading", { name: "الماضي البسيط", exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".school-guide-steps article")).toHaveCount(5);
  await page.locator('a[href="#practice"]').click();
  await expect(page.locator("#practice .school-work h2")).toHaveText(
    "Yesterday, we ___ basketball.",
  );

  await page.goto("/grade/2/english/3");
  await page.locator(".school-clock summary").click();
  await expect(page.locator(".school-clock canvas")).toBeVisible();
});

test("English audio plays at the selected pronunciation speed across lessons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const clips: HTMLAudioElement[] = [];
    Object.assign(window, {
      Audio: function (source: string) {
        const audio = new NativeAudio(source);
        clips.push(audio);
        return audio;
      },
      englishTestClips: clips,
    });
  });
  function playback(filename: string) {
    return page.evaluate((name) => {
      const { englishTestClips } = window as unknown as {
        englishTestClips: HTMLAudioElement[];
      };
      const clip = englishTestClips.find((audio) => audio.src.endsWith(name));
      if (!clip) return null;
      return {
        playing: clip.readyState >= 2 && !clip.paused,
        speed: clip.playbackRate,
        preservesPitch: clip.preservesPitch,
      };
    }, filename);
  }
  async function play(label: string, filename: string, speed: number) {
    const downloaded = page.waitForResponse((response) =>
      response.url().endsWith(filename),
    );
    await page
      .getByRole("button", { name: label, exact: true })
      .first()
      .click();
    expect((await downloaded).ok()).toBe(true);
    await expect.poll(() => playback(filename)).toEqual({
      playing: true,
      speed,
      preservesPitch: true,
    });
  }
  await page.goto("/grade/2/english/4");
  const speed = page.getByRole("combobox", { name: "سرعة النطق" });
  await expect(speed).toBeVisible();
  await expect(speed).toHaveValue("1");
  await speed.selectOption("0.75");
  await play("اسمع السؤال", "/4-1-prompt.mp3", 0.75);
  await play("اسمع الاختيارات", "/4-1-options.mp3", 0.75);
  await page.getByRole("button", { name: "السؤال التالي" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const { englishTestClips } = window as unknown as {
          englishTestClips: HTMLAudioElement[];
        };
        return englishTestClips.every((clip) => clip.paused);
      }),
    )
    .toBe(true);
  await page.goto("/grade/2/english/7");
  await expect(speed).toHaveValue("0.75");
  await play("اسمع التسجيل", "/7-1-listening.mp3", 0.75);
  await speed.selectOption("1.25");
  await expect.poll(() => playback("/7-1-listening.mp3")).toMatchObject({
    speed: 1.25,
  });
  await page.goto("/grade/2/english/11");
  await play("اسمع القطعة", "/11-1-passage.mp3", 1.25);
  await page.goto("/grade/2/english/grammar/pronouns");
  await expect(speed.last()).toHaveValue("1.25");
  await speed.first().selectOption("0.5");
  await expect(speed.last()).toHaveValue("0.5");
  await play("اسمع المثال", "/grammar-pronouns-1-1.mp3", 0.5);
  await page.reload();
  await expect(speed.first()).toHaveValue("0.5");
  await expect(speed.last()).toHaveValue("0.5");
});

test("AI Settings opens the device flow and fills the model selector after authentication", async ({
  page,
}) => {
  const name = "ai-admin-" + randomUUID().slice(0, 8),
    password = "testing-" + randomUUID();
  expect(
    (
      await page.request.post("/api/register", {
        data: { name: "Test admin", username: name, password, children: [] },
      })
    ).ok(),
  ).toBe(true);
  const store = createStore(resolve(".data/browser-qa.sqlite"));
  try {
    store.promoteAdmin(name);
  } finally {
    store.close();
  }
  await page.request.post("/api/login", { data: { username: name, password } });
  let linked = false,
    model = "";
  await page.route("**/api/english/status", (r) =>
    r.fulfill({ json: { connected: linked, model } }),
  );
  await page.route("**/api/english/connect", (r) =>
    r.fulfill({
      json: {
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "TEST-CODE",
      },
    }),
  );
  await page.route("**/api/english/models", (r) =>
    r.fulfill({
      json: [
        { id: "model-a", name: "Model A", hidden: false },
        { id: "model-b", name: "Model B", hidden: true },
      ],
    }),
  );
  await page.route("**/api/english/model", (r) => {
    model = r.request().postDataJSON().model;
    return r.fulfill({ json: { ok: true } });
  });
  await page.goto("/admin");
  await page.getByRole("tab", { name: "AI Settings" }).click();
  await page.getByRole("button", { name: "ربط ChatGPT عبر Codex" }).click();
  await expect(page.getByText("TEST-CODE")).toBeVisible();
  linked = true;
  const select = page.getByLabel("موديل تقييم الكتابة");
  await expect(select).toBeVisible({ timeout: 12000 });
  await expect(select.locator("option")).toHaveCount(3);
  await select.selectOption("model-b");
  await page.getByRole("button", { name: "حفظ الموديل" }).click();
  await expect.poll(() => model).toBe("model-b");
  await page.goto("/admin?tab=content");
  const content = page.locator(".admin-english-content");
  await expect(
    content.getByRole("heading", { name: "إنجليزي الصف الثاني" }),
  ).toBeVisible();
  await expect(content).toContainText("٥٣١ مقطعًا");
  await content.getByText("الدروس والأسئلة", { exact: true }).click();
  await expect(content.locator("li")).toHaveCount(20);
});
