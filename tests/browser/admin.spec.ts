import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";
import { createStore } from "../../src/server/store.mjs";

const password = "valid-password-123";

async function signInAdmin(page: import("@playwright/test").Page) {
  const email = `admin-${Date.now()}@example.test`;
  const register = await page.request.post("/api/register", {
    data: {
      name: "مديرة الاختبار",
      email,
      password,
      children: [],
    },
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

async function expectNoAxeViolations(
  page: import("@playwright/test").Page,
  label: string,
  include?: string,
) {
  await page.evaluate(() => document.fonts.ready);
  let builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21aa",
  ]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    label,
  ).toEqual([]);
}

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("a parent cannot open the admin page", async ({ page }) => {
  const email = `parent-${Date.now()}@example.test`;
  const register = await page.request.post("/api/register", {
    data: { name: "ولي أمر", email, password, children: [] },
  });
  expect(register.ok()).toBeTruthy();
  const login = await page.request.post("/api/login", {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  const denied = await page.request.get("/api/admin/users");
  expect(denied.status()).toBe(403);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "هذه الصفحة غير موجودة" }),
  ).toBeVisible();
});

test("admin dashboard links to /admin and the page stays within 360px", async ({
  page,
}) => {
  await signInAdmin(page);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "فتح لوحة الإدارة" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(
    page.getByRole("heading", { name: /لوحة الإدارة/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "مراجعة الصوت" }),
  ).toHaveAttribute("href", "/admin/audio");

  await page.setViewportSize({ width: 360, height: 800 });
  for (const tab of ["المستخدمون", "إعدادات الخدمات", "المحتوى", "السجل"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.getByRole("tab", { name: tab })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    if (tab === "المستخدمون") {
      await expect(page.locator(".family-card").last()).toHaveCSS(
        "opacity",
        "1",
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      tab,
    ).toBe(true);
    await expectNoAxeViolations(page, tab);
  }

  await page.getByRole("tab", { name: "المستخدمون" }).click();
  await page.getByRole("button", { name: "إنشاء أسرة" }).click();
  const dialog = page.getByRole("dialog", { name: "إنشاء أسرة" });
  await expect(dialog).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expectNoAxeViolations(page, "create-family-dialog", ".admin-dialog");
  await dialog.getByLabel("اسم ولي الأمر (مطلوب)").fill("أسرة تجريبية");
  const familyEmail = `family-${Date.now()}@example.test`;
  await dialog.getByLabel("البريد الإلكتروني (مطلوب)").fill(familyEmail);
  await dialog
    .getByLabel("كلمة المرور (مطلوب، 10 أحرف على الأقل)")
    .fill("family-pass-99");
  await dialog.getByLabel("اسم الطالب").fill("هنا التجريبية");
  await dialog
    .getByLabel("اسم المستخدم", { exact: true })
    .fill(`kid-${Date.now()}`);
  await dialog.getByLabel("الصف").selectOption("8");
  await dialog.getByRole("radio", { name: "بنت" }).check();
  await dialog.getByLabel("رمز الدخول (٦–١٢ رقمًا)").fill("12345678");
  await dialog.getByRole("button", { name: "إنشاء الأسرة" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "أُنشئت الأسرة" }),
  ).toBeVisible();

  await page
    .getByLabel("بحث بالاسم أو البريد أو اسم المستخدم")
    .fill(familyEmail);
  await page.getByRole("button", { name: "بحث" }).click();
  await expect(
    page.getByRole("heading", { name: "أسرة تجريبية" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "المحتوى" }).click();
  await expect(page.getByText("أولياء الأمور")).toBeVisible();
  try {
    await page
      .getByRole("button", { name: /نشر الدرس|إلغاء نشر الدرس/ })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "تم تحديث حالة نشر الدرس" }),
    ).toBeVisible();
  } finally {
    const restored = await page.request.post("/api/admin/publish", {
      data: { published: true },
    });
    expect(restored.ok()).toBeTruthy();
  }
});
