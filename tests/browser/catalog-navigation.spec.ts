import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createStore } from "../../src/server/store.mjs";

const password = "valid-password-123";

async function publishOnFixture(
  page: import("@playwright/test").Page,
  published: boolean,
) {
  const email = `catalog-admin-${Date.now()}@example.test`;
  const register = await page.request.post("/api/register", {
    data: { name: "مديرة الفهرس", email, password, children: [] },
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
  const response = await page.request.post("/api/admin/publish", {
    data: { published },
  });
  expect(response.ok()).toBeTruthy();
}

test("stage-first grade eight journey", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#grades [data-grade]")).toHaveCount(12);
  await page.locator('#grades [data-grade="8"]').click();
  await expect(page).toHaveURL(/\/stage\/intermediate#grade-8$/);
  await page.locator('[data-grade="8"]').click();
  await expect(page).toHaveURL(/\/grade\/8$/);
  await page.locator("#main-content").getByRole("link", { name: /العلوم/ }).click();
  await expect(page).toHaveURL(/\/grade\/8\/science$/);
  await page.locator("a.lesson-card").click();
  await expect(page).toHaveURL(/\/grade\/8\/science\/nutrients$/);
});

test("homepage groups twelve grade cards 5/4/3 and upcoming cards are not links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "اختاري مرحلتك" })).toHaveAttribute(
    "href",
    /#grades$/,
  );
  await expect(
    page.locator('#grades [data-stage="primary"][data-grade]'),
  ).toHaveCount(5);
  await expect(
    page.locator('#grades [data-stage="intermediate"][data-grade]'),
  ).toHaveCount(4);
  await expect(
    page.locator('#grades [data-stage="secondary"][data-grade]'),
  ).toHaveCount(3);
  await expect(page.locator("#grades a[data-grade]")).toHaveCount(1);
  await expect(page.locator('#grades a[data-grade="8"]')).toHaveAttribute(
    "href",
    "/stage/intermediate#grade-8",
  );
  await expect(page.locator("#grades article[data-grade]")).toHaveCount(11);
  await expect(page.locator("#grades article[data-grade] a")).toHaveCount(0);
  await expect(page.locator('#grades article[data-grade="1"]')).toContainText(
    "في رحلتنا القادمة",
  );
  await expect(
    page.getByRole("link", { name: "اكتشفي المرحلة" }),
  ).toHaveCount(3);
});

test("stage pages are browsable and grade eight subjects hide unpublished cards", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/stage/primary", "المرحلة الابتدائية"],
    ["/stage/intermediate", "المرحلة المتوسطة"],
    ["/stage/secondary", "المرحلة الثانوية"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await page.goto("/stage/intermediate");
  await expect(page.locator('a[data-grade="8"]')).toHaveAttribute(
    "href",
    "/grade/8",
  );
  await expect(page.locator("article[data-grade] a")).toHaveCount(0);
  await page.goto("/grade/8");
  await expect(
    page.getByRole("heading", { name: "مواد الصف الثامن", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".catalog-heading p")).toContainText(
    "العلوم متاحة الآن",
  );
  await expect(page.locator(".subject-grid").getByRole("link", { name: /العلوم/ })).toHaveAttribute(
    "href",
    "/grade/8/science",
  );
  await expect(
    page.locator("article.subject-card").filter({ hasText: "في رحلتنا القادمة" }),
  ).toHaveCount(7);
  await expect(
    page.locator("article.subject-card", { hasText: "القرآن الكريم" }),
  ).toBeVisible();
  await expect(
    page.locator("article.subject-card", { hasText: "القرآن الكريم" }).locator("a"),
  ).toHaveCount(0);
  await expect(
    page.locator("article.subject-card", { hasText: "الاقتصاد المنزلي" }),
  ).toBeVisible();
  await expect(
    page.locator("article.subject-card", { hasText: "الاقتصاد المنزلي" }).locator("a"),
  ).toHaveCount(0);
});

test("header marks stages on catalog pages and science only on science routes", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "القائمة الرئيسية" });
  await page.goto("/stage/intermediate");
  await expect(nav.getByRole("link", { name: "المراحل الدراسية" })).toHaveClass(
    /active/,
  );
  await expect(
    nav.getByRole("link", { name: /استكشفي العلوم/ }),
  ).not.toHaveClass(/active/);
  await page.goto("/grade/8");
  await expect(nav.getByRole("link", { name: "المراحل الدراسية" })).toHaveClass(
    /active/,
  );
  await expect(
    nav.getByRole("link", { name: /استكشفي العلوم/ }),
  ).not.toHaveClass(/active/);
  await page.goto("/grade/8/science");
  await expect(nav.getByRole("link", { name: /استكشفي العلوم/ })).toHaveClass(
    /active/,
  );
  await expect(nav.getByRole("link", { name: "المراحل الدراسية" })).not.toHaveClass(
    /active/,
  );
});

test("unsupported catalog routes return 404", async ({ page }) => {
  for (const path of ["/stage/kindergarten", "/grade/3", "/grade/08"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("publication changes grade and subject availability together on the fixture db", async ({
  page,
}) => {
  try {
    await publishOnFixture(page, false);
    await page.goto("/");
    await expect(page.locator("#grades a[data-grade]")).toHaveCount(0);
    await expect(page.locator('#grades article[data-grade="8"]')).toContainText(
      "في رحلتنا القادمة",
    );
    await page.goto("/stage/intermediate");
    await expect(page.locator('a[data-grade="8"]')).toHaveCount(0);
    await expect(page.locator('article[data-grade="8"]')).toContainText(
      "في رحلتنا القادمة",
    );
    await page.goto("/grade/8");
    await expect(page.locator(".subject-grid").getByRole("link", { name: /العلوم/ })).toHaveCount(0);
    await expect(
      page.locator("article.subject-card", { hasText: "العلوم" }),
    ).toContainText("في رحلتنا القادمة");
    await expect(page.locator(".catalog-heading p")).not.toContainText(
      "العلوم متاحة الآن",
    );
    await expect(
      page.locator("article.subject-card").filter({ hasText: "في رحلتنا القادمة" }),
    ).toHaveCount(8);
  } finally {
    await publishOnFixture(page, true);
  }
  await page.goto("/");
  await expect(page.locator('#grades a[data-grade="8"]')).toBeVisible();
  await page.goto("/grade/8");
  await expect(page.locator(".subject-grid").getByRole("link", { name: /العلوم/ })).toBeVisible();
});
