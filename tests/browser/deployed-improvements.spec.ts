import { test, expect } from "@playwright/test";

test("Arabic search accepts everyday spelling and hides empty unit links", async ({
  page,
}) => {
  await page.goto("/grade/8/science");
  const search = page.getByLabel("ابحثي عن درس");
  await search.fill("المغذيات");
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  await expect(page.locator(".lesson-card")).toContainText("المغذّيات");
  await expect(page.locator(".unit-nav a")).toHaveCount(1);
  await expect(page.locator("#lesson-search-status")).toContainText("١ من ١٩");
  await search.fill("الايونيه");
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  await expect(page.locator(".lesson-card")).toContainText("الرابطة الأيونية");
  await search.fill("الهضمي   تركيب");
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  const href = await page.locator(".unit-nav a").getAttribute("href");
  await expect(page.locator(href!)).toBeVisible();
  await page.getByRole("button", { name: "مسح البحث" }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".lesson-card")).toHaveCount(19);
  await expect(page.locator(".unit-nav a")).toHaveCount(4);
});

test("mobile menu closes with Escape and outside click", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await page
    .getByRole("navigation", { name: "القائمة الرئيسية" })
    .getByRole("link", { name: "الرئيسية", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  const button = page.getByRole("button", { name: "فتح القائمة" });
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await page.locator(".hero-footnotes").click();
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("published pages have canonical share metadata and a public sitemap", async ({
  page,
  request,
}) => {
  const origin = "https://madarek.walidmohamed.com";
  for (const path of ["/", "/grade/8/science", "/grade/8/science/nutrients"]) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      path === "/"
        ? /^https:\/\/madarek\.walidmohamed\.com\/?$/
        : origin + path,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      path === "/"
        ? /^https:\/\/madarek\.walidmohamed\.com\/?$/
        : origin + path,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /https:\/\/madarek\.walidmohamed\.com\/images\/.+\.png/,
    );
  }
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain(`${origin}/grade/8/science/nutrients`);
  expect(xml).not.toMatch(/\/login|\/dashboard|\/admin/);
});
