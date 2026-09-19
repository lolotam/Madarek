import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Deterministic "no narration yet" state, independent of other specs that
  // seed approved clips into the e2e audio library.
  await page.route("**/api/audio/manifest*", (route) =>
    route.fulfill({
      json: {
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
      },
    }),
  );
});

test("complete-section feedback appears next to the pressed button, on screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/grade/8/science/nutrients");
  const button = page
    .getByRole("button", { name: "فهمت، أنجزت هذا المقطع", exact: true })
    .first();
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const note = page.locator(".complete-feedback").first();
  await expect(note).toContainText("يُحفظ الإنجاز لحساب الطالب فقط");
  await expect(note).toBeInViewport();
  await expect(note.getByRole("link", { name: "دخول الطالب" })).toHaveAttribute(
    "href",
    "/login?mode=student",
  );
});

test("with no narration ready the player shows one notice and no dead controls", async ({
  page,
}) => {
  await page.goto("/grade/8/science/nutrients");
  const player = page.locator('[data-audio-player-status="not_ready"]');
  await expect(player).toContainText("الشرح الصوتي غير جاهز بعد");
  await expect(player.locator("button, select, input")).toHaveCount(0);
  await expect(page.locator(".audio-part-play")).toHaveCount(0);
});
