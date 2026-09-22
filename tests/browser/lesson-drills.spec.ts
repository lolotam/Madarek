import { test, expect } from "@playwright/test";

const lesson = "/grade/8/science/nutrients";

test("the journey art follows the lab steps and the relationship map lights the links a food belongs to", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(lesson);

  // The art is decorative: the captions and the caption text carry the lesson.
  await expect(page.locator(".journey-art")).toHaveCount(1);
  await expect(page.locator(".journey-art")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".energy-step.lit")).toHaveCount(1);
  await page
    .getByRole("button", { name: "الخطوة التالية", exact: true })
    .click();
  await expect(page.locator(".energy-step.lit")).toHaveCount(2);
  await expect(page.locator(".experiment-caption")).toContainText("الجلوكوز");

  // Milk is the opening selection: four links, two of them "main".
  await expect(page.locator(".relation-line.active")).toHaveCount(4);
  await expect(page.locator(".relation-reading")).toContainText("الحليب");
  await page
    .getByRole("button", { name: "زيت الزيتون — اعرضي مغذّياته" })
    .click();
  await expect(page.locator(".relation-line.active")).toHaveCount(2);
  await expect(page.locator(".relation-reading")).toContainText("الدهون");
  await page
    .getByRole("button", { name: "الدهون — اعرضي الأطعمة التي تحتويه" })
    .click();
  await expect(page.locator(".relation-reading")).toContainText("زيت الزيتون");

  expect(errors).toEqual([]);
});

test("ordering marks every card and sorting corrects a wrong row without losing the card", async ({
  page,
}) => {
  await page.goto(lesson);

  // The opening scramble is wrong on purpose, so checking marks all three.
  await page
    .getByRole("button", { name: "تحقّقي من الترتيب", exact: true })
    .click();
  await expect(page.locator(".order-card.wrong")).toHaveCount(3);
  // Energy scramble [2, 0, 1]: two moves put it back in order.
  await page.getByRole("button", { name: "حرّكي الكربوهيدرات لأعلى" }).click();
  await page.getByRole("button", { name: "حرّكي الجلوكوز لأعلى" }).click();
  await page
    .getByRole("button", { name: "تحقّقي من الترتيب", exact: true })
    .click();
  await expect(page.locator(".order-card.right")).toHaveCount(3);
  await expect(page.locator(".order-drill .feedback.success")).toContainText(
    "طاقة للخلايا",
  );

  await page
    .getByRole("button", { name: "الفيتامينات — اختاريها للتصنيف" })
    .click();
  await page.getByRole("button", { name: /المغذّيات الكبرى/ }).click();
  const feedback = page.locator(".sort-drill .feedback");
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText("المغذّيات الصغرى");
  // A wrong answer never swallows the card.
  await expect(
    page.getByRole("button", { name: "الفيتامينات — اختاريها للتصنيف" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /المغذّيات الصغرى/ }).click();
  await expect(feedback).toHaveClass(/success/);
  await expect(page.locator(".sort-bin.minor .sort-chip.placed")).toHaveCount(
    1,
  );
  await expect(page.locator(".sort-drill .sort-progress")).toContainText(
    "1 من 6",
  );
});

test("the drills keep working at 360px and every control stays tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(lesson);
  await expect(page.locator(".relation-map")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const selector of [
    ".order-moves button",
    ".sort-chip",
    ".relation-node",
  ]) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("choosing a food starts the journey its main nutrient belongs to", async ({
  page,
}) => {
  await page.goto(lesson);
  await page.getByRole("button", { name: "العدس", exact: true }).click();
  await expect(page.locator(".food-follow")).toContainText("البناء والإصلاح");
  await page
    .getByRole("button", { name: "تابعي البناء والإصلاح", exact: true })
    .click();
  await expect(page.locator(".energy-lab")).toHaveClass(/repair/);
  await expect(page.locator(".experiment-caption")).toContainText("البروتين");
  // Olive oil does not pretend to travel the carbohydrate path.
  await page.getByRole("button", { name: "زيت الزيتون", exact: true }).click();
  await expect(page.locator(".food-follow")).toContainText(
    "النظام الغذائي المتوازن",
  );
  await expect(page.getByRole("button", { name: /^تابعي / })).toHaveCount(0);
});
