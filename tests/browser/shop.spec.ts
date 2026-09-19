import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const allCorrect = {
  q1: "macro", q2: "protein", q3: "fat", q4: "D", q5: "oxygen",
  q6: "bowel", q7: "الجلوكوز", q8: "الماء", q9: "الفيتامينات", q10: "الكالسيوم",
};

test("a student buys and wears a lab coat with coins earned from the quiz", async ({ page }) => {
  const stamp = Date.now();
  const username = `shop-${stamp}`;
  expect(
    (
      await page.request.post("/api/register", {
        data: {
          name: "ولي أمر المتجر",
          email: `shop-${stamp}@example.test`,
          password: "Test-password-9876",
          children: [{ name: "ريم", username, pin: "73918264", grade: 8, gender: "female" }],
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/shop");
  await expect(page).toHaveURL("/dashboard");
  expect(
    (await page.request.post("/api/student-login", { data: { username, pin: "73918264" } })).ok(),
  ).toBeTruthy();
  expect(
    (await page.request.post("/api/quiz", { data: { id: `attempt-shop-${stamp}`, answers: allCorrect } })).ok(),
  ).toBeTruthy();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /خصّصي شخصيتك/ }).click();
  await expect(page).toHaveURL("/shop");
  await expect(page.getByText("عملاتك: ١٢٠")).toBeVisible();

  const coat = page.locator(".shop-item", { hasText: "معطف المختبر" });
  await coat.getByRole("button", { name: /اشتري بـ ١٢٠ عملة/ }).click();
  await coat.getByRole("button", { name: /تأكيد الشراء/ }).click();
  await expect(page.getByText("عملاتك: ٠")).toBeVisible();
  await expect(coat.getByRole("button", { name: /ترتدينه/ })).toBeVisible();
  await page.getByRole("button", { name: "حفظ شخصيتي" }).click();
  await expect(page.getByText("حُفظت شخصيتك.")).toBeVisible();

  const goggles = page.locator(".shop-item", { hasText: "نظارة المختبر الواقية" });
  await page.getByRole("tab", { name: "الإضافات" }).click();
  await expect(goggles.getByRole("button", { name: "ارتدي" })).toBeVisible();
  await page.getByRole("tab", { name: "الإطار" }).click();
  await expect(page.locator(".shop-item", { hasText: "إطار شعلة الانتظام" })).toContainText("أيام دراسة متتالية");

  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

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
    "/shop",
  ).toEqual([]);
});
