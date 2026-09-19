import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("main learning pages have no automated WCAG A/AA violations", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/grade/8/science",
    "/grade/8/science/nutrients",
    "/login?mode=register",
  ]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    if (path === '/') await expect(page.locator('.hero-copy > div')).toHaveCSS('opacity','1');
    if (path.endsWith('/nutrients')) await expect(page.locator('.nutrient-detail')).toHaveCSS('opacity','1');
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
      path,
    ).toEqual([]);
  }
});
