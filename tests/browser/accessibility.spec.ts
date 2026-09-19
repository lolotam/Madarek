import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("main learning pages have no automated WCAG A/AA violations", async ({
  page,
}) => {
  await page.route("**/api/audio/manifest**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: "nutrients",
        segments: [
          {
            id: "map.intro",
            part: "map",
            order: 1,
            protected: false,
            status: "ready",
            url: "/api/audio/clip/map.intro/hash",
            duration: 1.5,
            cues: [
              {
                target: "concept-group-minor",
                reveal: true,
                start: 0,
                end: 1.4,
              },
            ],
          },
        ],
      }),
    }),
  );
  await page.route("**/api/audio/clip**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: Buffer.alloc(44),
    }),
  );
  for (const path of [
    "/",
    "/grade/8/science",
    "/grade/8/science/nutrients",
    "/login?mode=register",
  ]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    if (path === "/")
      await expect(page.locator(".hero-copy > div")).toHaveCSS("opacity", "1");
    if (path.endsWith("/nutrients")) {
      await expect(page.locator(".nutrient-detail")).toHaveCSS("opacity", "1");
      await expect(
        page.getByRole("button", { name: "تشغيل شرح: الصفحة" }),
      ).toBeVisible();
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
      path,
    ).toEqual([]);
  }
});
