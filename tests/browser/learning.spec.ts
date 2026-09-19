import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public pages, verified curriculum and interactive lesson work at four sizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const size of [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 980 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    for (const path of [
      "/",
      "/grade/8/science",
      "/grade/8/science/nutrients",
      "/login",
      "/login?mode=register",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path + " " + size.width,
      ).toBe(true);
    }
  }
  await page.goto("/grade/8/science");
  await expect(page.locator(".lesson-card")).toHaveCount(19);
  await page.getByLabel("ابحثي عن درس").fill("المغذّيات");
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  await page.locator(".lesson-card.available").click();
  await page.getByRole("tab", { name: /المغذّيات الصغرى/ }).click();
  await expect(page.locator(".nutrient-node")).toHaveCount(2);
  await page
    .getByRole("button", { name: "الأملاح المعدنية", exact: true })
    .click();
  await expect(page.locator(".nutrient-detail")).toContainText("الحديد");
  await page.getByRole("button", { name: "العدس", exact: true }).click();
  await expect(page.locator(".food-reveal")).toContainText(
    "البروتينات النباتية",
  );
  await page
    .getByRole("button", { name: "الخطوة التالية", exact: true })
    .click();
  await expect(page.locator(".experiment-caption")).toContainText("الجلوكوز");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("parent adds child, child completes quiz, parent reviews persisted answers", async ({
  page,
}) => {
  const stamp = Date.now();
  const email = `qa-${stamp}@example.test`,
    username = `qa-${stamp}`;
  await page.goto("/login?mode=register");
  await page
    .getByLabel("اسم ولي الأمر", { exact: true })
    .fill("ولي أمر الاختبار");
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(email);
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("Test-password-9876");
  await page
    .getByRole("group", { name: "الطالب ١" })
    .getByLabel("اسم الطالب")
    .fill("هنا التجريبية");
  await page
    .getByRole("group", { name: "الطالب ١" })
    .getByLabel("الصف")
    .selectOption("8");
  await page.getByRole("radio", { name: "بنت", exact: true }).check();
  await page
    .getByRole("group", { name: "الطالب ١" })
    .getByLabel("اسم المستخدم")
    .fill(username);
  await page
    .getByRole("group", { name: "الطالب ١" })
    .getByLabel("رمز الدخول")
    .fill("73918264");
  await page.getByRole("button", { name: "إنشاء الحساب", exact: true }).click();
  await expect(page).toHaveURL("/dashboard");
  await expect(
    page.getByRole("heading", { name: "هنا التجريبية", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "إضافة طالب", exact: true }).click();
  await page.getByLabel("اسم الطالب", { exact: true }).fill("أخ الاختبار");
  await page
    .getByRole("combobox", { name: "الصف", exact: true })
    .selectOption("5");
  await page.getByRole("radio", { name: "ولد", exact: true }).check();
  await page
    .getByLabel("اسم المستخدم للدخول", { exact: true })
    .fill(`${username}-b`);
  await page.getByLabel("رمز الدخول", { exact: true }).fill("24681357");
  await page
    .getByRole("button", { name: "حفظ ملف الطالب", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "أخ الاختبار", exact: true }),
  ).toBeVisible();
  const parentCookie = (await page.context().cookies()).find(
    (c) => c.name === "hana_session",
  );
  expect(parentCookie?.httpOnly).toBe(true);
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/login?mode=student");
  await page.getByLabel("اسم مستخدم الطالب", { exact: true }).fill(username);
  await page.getByLabel("رمز الدخول", { exact: true }).fill("73918264");
  await page
    .getByRole("button", { name: "دخول إلى مساحتي", exact: true })
    .click();
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("link", { name: "ابدئي الدرس", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "فهمت، أنجزت هذا المقطع", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "أنجزتِ هذا المقطع", exact: true }),
    ).toHaveCount(i + 1);
  }
  await page
    .getByLabel("اكتبي الفكرة بأسلوبك", { exact: true })
    .fill("لأن البروتينات تصلح الأنسجة وتساعد على التئام الجروح.");
  await page
    .getByRole("button", { name: "قارني بالإجابة النموذجية", exact: true })
    .click();
  await expect(
    page.getByText("الفكرة الأساسية", { exact: true }),
  ).toBeVisible();
  const choices = [
    "المغذّيات الكبرى",
    "البروتينات",
    "الدهون",
    "فيتامين D",
    "المساعدة في نقل الأكسجين في الدم",
    "لتسهيل حركة الأمعاء والوقاية من الإمساك",
  ];
  for (const label of choices) {
    await page.getByRole("radio", { name: label, exact: false }).check();
    await page.getByRole("button", { name: "التالي", exact: true }).click();
  }
  for (const [i, value] of [
    "الجلوكوز",
    "الماء",
    "الفيتامينات",
    "الكالسيوم",
  ].entries()) {
    await page.getByLabel("إجابتك", { exact: true }).fill(value);
    if (i < 3)
      await page.getByRole("button", { name: "التالي", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "اكتشفي نتيجتك", exact: true })
    .click();
  await expect(page.locator(".result-score")).toContainText("١٠٠");
  await expect(
    page.getByText("حُفظت محاولتك ويمكن لولي أمرك متابعتها.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.goto("/dashboard");
  await expect(
    page.getByText("أفضل درجة مسجلة", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".attempt")).toHaveCount(1);
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(email);
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("Test-password-9876");
  await page
    .getByRole("button", { name: "دخول إلى مساحتي", exact: true })
    .click();
  await expect(page).toHaveURL("/dashboard");
  const firstChild = page
    .locator(".child-panel")
    .filter({ hasText: "هنا التجريبية" });
  await expect(firstChild).toContainText("٤");
  await firstChild.locator(".attempt>summary").click();
  await expect(firstChild.locator(".result-details details")).toHaveCount(10);
  await firstChild
    .locator(".result-details details")
    .first()
    .locator("summary")
    .click();
  await expect(
    firstChild.locator(".result-details details").first(),
  ).toContainText("إجابتك: المغذّيات الكبرى");
  const denied = await page.request.post("/api/admin/publish", {
    data: { published: false },
  });
  expect(denied.status()).toBe(403);
  const csrf = await page.request.post("/api/children", {
    headers: { Origin: "https://untrusted.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
});

test("register child rows keep typed values after removal and stay within 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login?mode=register");
  await page
    .getByRole("button", { name: "إضافة ابن/ابنة", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "الطالب ٢" }).getByLabel("اسم الطالب"),
  ).toBeFocused();
  const second = page.getByRole("group", { name: "الطالب ٢" });
  await second.getByLabel("اسم الطالب").fill("صفية المحفوظة");
  await second.getByLabel("اسم المستخدم").fill("safiya-keep");
  await page
    .getByRole("button", { name: "إزالة الطالب ١", exact: true })
    .click();
  await expect(page.getByRole("group", { name: /^الطالب / })).toHaveCount(1);
  const kept = page.getByRole("group", { name: "الطالب ١" });
  await expect(kept.getByLabel("اسم الطالب")).toHaveValue("صفية المحفوظة");
  await expect(kept.getByLabel("اسم المستخدم")).toHaveValue("safiya-keep");
  await expect(
    page.getByRole("button", { name: "إضافة ابن/ابنة", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "إضافة ابن/ابنة", exact: true })
    .click();
  await page
    .getByRole("button", { name: "إضافة ابن/ابنة", exact: true })
    .click();
  await expect(page.getByRole("group", { name: "الطالب ٣" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
