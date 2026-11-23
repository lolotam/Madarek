import { expect, test } from "@playwright/test";
import { createStore } from "../../src/server/store.mjs";
import { activity, questions } from "../../src/server/english.mjs";
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
      const peak = this.buffer?.getChannelData(0).reduce((max, s) => Math.max(max, Math.abs(s)), 0);
      if (peak !== undefined) document.documentElement.dataset.applausePeak = peak.toFixed(2);
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
  const assistant = page.locator(".school-lesson .school-mascot");
  await expect(assistant).toHaveCount(0);
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
  await expect(assistant).toHaveAttribute("aria-label", /برق/);
  await expect(assistant).toContainText("حاول مرة تانية!");
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
  await expect(assistant).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: "Go to bed", exact: true }),
  ).toBeFocused();
  await page.getByRole("radio", { name: "Get up", exact: true }).check();
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  await expect(page.locator(".school-result")).toContainText(
    "إجابتك صحيحة · 100٪",
  );
  await expect(assistant).toContainText("أحسنت!");
  const reactionImage = await assistant.locator("img").boundingBox();
  expect(reactionImage?.width).toBeGreaterThan(100);
  await expect(page.locator(".school-confetti span")).toHaveCount(24);
  await expect(page.locator(".school-mascot img")).toHaveAttribute(
    "src",
    /barq\/correct\.gif$/,
  );
  await expect(page.locator("html")).toHaveAttribute("data-applause", "played");
  await expect(page.locator("html")).toHaveAttribute("data-applause-peak", "0.72");
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
  await expect(assistant).toHaveCount(0);
  await expect(firstQuestion).toHaveText("What do you carry to school?");
  await page.reload();
  await expect(page.locator(".school-confetti")).toHaveCount(0);
  await expect(assistant).toHaveCount(0);
  await expect(page.locator(".school-result")).toContainText("100٪");
  const diagramPlayer = page.locator("hyperframes-player");
  await expect(diagramPlayer).toHaveCount(1);
  await expect(diagramPlayer).toHaveAttribute("width", "570");
  await expect(diagramPlayer).toHaveAttribute("loop", "");
  await diagramPlayer.evaluate((player) => {
    let previousTime = 0;
    player.addEventListener("timeupdate", (event) => {
      const { currentTime } = (event as CustomEvent<{ currentTime: number }>)
        .detail;
      if (previousTime > 2.8 && currentTime < 0.8)
        player.dataset.testLooped = "true";
      previousTime = currentTime;
    });
  });
  await expect(diagramPlayer).toHaveAttribute("data-test-looped", "true", {
    timeout: 8500,
  });
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
  await expect(assistant).toHaveCount(0);
  await expect(page.getByRole("button", { name: "سجّل تهجئتك" })).toBeVisible();
  await page.getByRole("textbox", { name: "اكتب إجابتك بالإنجليزية" }).fill("shoes");
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  await expect(assistant).toHaveAttribute("aria-label", /لوز/);

  await page.goto("/grade/2/english/1");
  await expect(page.locator(".school-result")).toBeVisible();
  await next.click();
  await page.getByRole("radio", { name: "A school bag", exact: true }).check();
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  await expect(page.locator(".school-result")).toContainText("100٪");
  const reset = page.getByRole("button", {
    name: "ابدأ من الأول",
    exact: true,
  });
  await reset.click();
  const confirmation = page.getByRole("dialog", {
    name: "ابدأ الدرس من الأول؟",
  });
  await confirmation
    .getByRole("button", { name: "إلغاء", exact: true })
    .click();
  await expect(firstQuestion).toHaveText("What do you carry to school?");
  await expect(page.locator(".school-result")).toBeVisible();
  await reset.click();
  await confirmation
    .getByRole("button", { name: "امسح وابدأ من الأول" })
    .click();
  await expect(firstQuestion).toHaveText(question!);
  await expect(page.getByText("الدرس بدأ من الأول.")).toBeVisible();
  await expect(page.locator(".school-result")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".school-result")).toHaveCount(0);
  const remaining: { qid: string }[] = await (
    await page.request.get("/api/english/history")
  ).json();
  expect(remaining.some(({ qid }) => qid.startsWith("1-"))).toBe(false);
  expect(remaining.some(({ qid }) => qid.startsWith("17-"))).toBe(true);

  const firstLesson = activity(1);
  if (!firstLesson) throw new Error("Missing English lesson 1");
  for (const { id } of firstLesson.questions.slice(1)) {
    const question = questions.get(id);
    if (!question) throw new Error(`Missing English question ${id}`);
    const seeded = await page.request.post("/api/english/answer", {
      data: { qid: id, answer: question.answer, nonce: randomUUID() },
    });
    expect(seeded.ok()).toBe(true);
  }
  await page.goto("/dashboard");
  const map = page.getByRole("region", { name: "رحلة الإنجليزي" });
  const stops = map.locator("a.english-journey-stop");
  await expect(stops).toHaveCount(20);
  const firstStop = stops.first();
  await expect(firstStop).toHaveAttribute("aria-current", "step");
  await expect(map.locator(".english-journey-mascot img")).toHaveAttribute("src", /louz/);
  const [firstBox, secondBox] = await Promise.all([firstStop.boundingBox(), stops.nth(1).boundingBox()]);
  expect(secondBox!.y - firstBox!.y).toBeGreaterThan(350);
  await firstStop.click();
  await expect(page).toHaveURL(/english\/1\?from=map$/);
  await page.getByRole("radio", { name: "Get up", exact: true }).check();
  await page.getByRole("button", { name: "إرسال الإجابة" }).click();
  await expect(page.getByText("خلّصت الدرس! هترجع للخريطة بعد لحظات.")).toBeVisible();
  await expect(page).toHaveURL(/dashboard\?fromLesson=1#english-map$/, { timeout: 15000 });
  await expect(firstStop).toHaveAttribute("data-complete", "");
  await expect(firstStop.locator(".english-journey-score")).toBeVisible();
  await expect(stops.nth(1)).toHaveAttribute("aria-current", "step");
  const mapMascot = map.locator(".english-journey-mascot");
  await expect(mapMascot).toHaveAttribute("data-at-stage", "2");
  await expect.poll(async () => {
    const [actor, token] = await Promise.all([
      mapMascot.boundingBox(),
      stops.nth(1).locator(".english-journey-token").boundingBox(),
    ]);
    return actor && token ? Math.abs((actor.x + actor.width / 2) - (token.x + token.width / 2)) : Infinity;
  }).toBeLessThan(2);
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
  ).toContainText("١١٠ سؤالًا");
  await expect(page.locator(".school-grammar-card")).toHaveCount(3);
  await page
    .locator(".school-grammar-card")
    .filter({ hasText: "Present simple" })
    .click();
  await expect(
    page.getByRole("heading", { name: "المضارع البسيط", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("انتقل لسؤال").locator("option")).toHaveCount(
    110,
  );
  await page.getByLabel("انتقل لسؤال").selectOption("104");
  await expect(page.locator(".school-work h2")).toContainText("Sara");

  await page.goto("/grade/2/english/4");
  const next = page.getByRole("button", { name: "السؤال التالي" });
  await expect(page.locator("hyperframes-player")).toHaveAttribute(
    "width",
    "840",
  );
  const diagram = await page.locator(".school-diagram-frame").boundingBox();
  expect(diagram?.height).toBeGreaterThan(250);
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
  const assistant = page.locator(".school-lesson .school-mascot");
  await expect(assistant).toContainText("قربت! جرّب تاني.");
  expect((await assistant.locator("img").boundingBox())?.width).toBeGreaterThan(145);
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

test("touch activities give hints, allow retries, and explain English words", async ({
  browser,
  baseURL,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
  ]) {
    const context = await browser.newContext({
      baseURL,
      viewport,
      hasTouch: true,
      isMobile: true,
    });
    try {
      const page = await context.newPage();
      await page.goto("/grade/2/english/1");
      const word = page.locator('.school-heading [data-word="school"]');
      await word.hover();
      await expect(page.getByRole("tooltip")).toContainText("مدرسة");
      await page.keyboard.press("Escape");
      await word.tap();
      await expect(page.getByRole("tooltip")).toContainText("مدرسة");
      await expect(page.locator(".english-word-sprite")).toBeVisible();
      const jump = page.getByLabel("انتقل لسؤال");
      const submit = page.getByRole("button", {
        name: "إرسال الإجابة",
        exact: true,
      });
      const retry = page.getByRole("button", {
        name: "جرّب تاني",
        exact: true,
      });
      const result = page.locator(".school-result");
      const mascotHint = page.locator(".school-mascot-hint");

      await jump.selectOption("10");
      const bank = page.locator(".school-tile-bank");
      const addWord = (name: string) =>
        bank.getByRole("button", { name, exact: true }).tap();
      await addWord("wake up");
      await expect(submit).toBeDisabled();
      await addWord("early.");
      await addWord("I");
      await submit.tap();
      await expect(mascotHint).toContainText("مين اللي بيعمل الفعل");
      await retry.tap();
      await page.getByRole("button", { name: "امسح الترتيب" }).tap();
      for (const name of ["I", "wake up", "early."]) await addWord(name);
      await submit.tap();
      await expect(result).toContainText("100٪");

      await jump.selectOption("11");
      await page.getByRole("button", { name: "عدّل we", exact: true }).tap();
      await bank.getByRole("button", { name: "We", exact: true }).tap();
      await submit.tap();
      await expect(mascotHint).toContainText("علامة النهاية");
      await retry.tap();
      await page.getByRole("button", { name: "عدّل علامة الترقيم" }).tap();
      await bank.getByRole("button", { name: "نقطة", exact: true }).tap();
      await submit.tap();
      await expect(result).toContainText("100٪");

      await jump.selectOption("12");
      const board = page.locator(".school-place-board");
      const piece = board.locator("[data-place-item]");
      await expect(board).toHaveAttribute("data-model", "3d");
      await piece.tap();
      await board.locator('[data-position="right"]').tap();
      await submit.tap();
      await expect(mascotHint).toContainText("كلمة المكان");
      await retry.tap();
      await board.scrollIntoViewIfNeeded();
      const target = board.locator('[data-position="under"]');
      const from = await piece.boundingBox();
      const to = await target.boundingBox();
      if (!from || !to) throw Error("Placement board is not visible");
      const client = await context.newCDPSession(page);
      const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
      const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [start],
      });
      for (const t of [0.25, 0.5, 0.75, 1]) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: start.x + t * (end.x - start.x),
              y: start.y + t * (end.y - start.y),
            },
          ],
        });
      }
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect(target).toHaveAttribute("aria-pressed", "true");
      // The CDP drag already exercises touch events. Use a click for the separate submit gesture.
      await submit.click();
      await expect(result).toContainText("100٪");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      await context.close();
    }
  }
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
  await expect(content).toContainText("٦١٠ مقطعًا");
  await content.getByText("الدروس والأسئلة", { exact: true }).click();
  await expect(content.locator("li")).toHaveCount(20);
});
