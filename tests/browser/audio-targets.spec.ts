import { test, expect, type Page } from "@playwright/test";
import {
  audioTargets,
  quizTargetsForQuestions,
  type AudioTarget,
  type PublicQuizQuestion,
} from "../../src/content/audio-targets";
import { foods, nutrients } from "../../src/content/nutrients";

const groupTab = {
  major: /المغذّيات الكبرى/,
  minor: /المغذّيات الصغرى/,
};

function allTargets(questions: PublicQuizQuestion[]): AudioTarget[] {
  return [...audioTargets, ...quizTargetsForQuestions(questions)];
}

async function expectOneVisibleTarget(page: Page, id: string) {
  const locator = page.locator(`[data-audio-target="${id}"]`);
  await expect(locator, id).toHaveCount(1);
  await expect(locator, id).toBeVisible();
}

async function revealTarget(
  page: Page,
  target: AudioTarget,
  questions: PublicQuizQuestion[],
) {
  const { reveal } = target;
  switch (reveal.kind) {
    case "always":
      return;
    case "concept-group":
      await page.getByRole("tab", { name: groupTab[reveal.group] }).click();
      return;
    case "concept-nutrient": {
      const nutrient = nutrients.find((n) => n.id === reveal.nutrient);
      if (!nutrient) throw new Error("Unknown nutrient " + reveal.nutrient);
      const group = nutrient.group === "minor" ? "minor" : "major";
      await page.getByRole("tab", { name: groupTab[group] }).click();
      await page
        .getByRole("button", { name: nutrient.name, exact: true })
        .click();
      return;
    }
    case "food": {
      const food = foods.find((f) => f.id === reveal.food);
      if (!food) throw new Error("Unknown food " + reveal.food);
      await page.getByRole("button", { name: food.name, exact: true }).click();
      return;
    }
    case "lab":
      await page
        .getByRole("button", {
          name: reveal.mode === "energy" ? "رحلة الطاقة" : "البناء والإصلاح",
          exact: true,
        })
        .click();
      for (let i = 0; i < reveal.step; i++) {
        await page
          .getByRole("button", { name: "الخطوة التالية", exact: true })
          .click();
      }
      return;
    case "quiz-question": {
      const index = questions.findIndex((q) => q.id === reveal.question);
      await page
        .getByRole("button", { name: `السؤال ${index + 1}`, exact: true })
        .click();
      return;
    }
    case "quiz-result":
      return;
  }
}

async function submitAnonymousPreview(page: Page) {
  await page.getByRole("button", { name: "السؤال 10", exact: true }).click();
  await page
    .getByRole("button", { name: "اكتشفي نتيجتك", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأكيد التسليم", exact: true })
    .click();
  await expect(page.locator(".result-score")).toBeVisible();
}

// Uniqueness is asserted here rather than under `npm test`: Node 24 can load
// a .ts file, but this registry imports `./nutrients` without a .ts extension,
// which Node cannot resolve without extra tooling.
test("audio target registry ids are unique", async ({ request }) => {
  const response = await request.get("/api/quiz");
  expect(response.ok()).toBeTruthy();
  const { questions } = (await response.json()) as {
    questions: PublicQuizQuestion[];
  };
  const ids = allTargets(questions).map((target) => target.id);
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

test("every nutrients-lesson audio target is reachable in the real UI", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/grade/8/science/nutrients");
  await expect(page.locator("h1")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "السؤال 1", exact: true }),
  ).toBeVisible();

  const { questions } = await page.request
    .get("/api/quiz")
    .then((res) => res.json());
  expect(questions).toHaveLength(10);
  const targets = allTargets(questions);
  const live = targets.filter((t) => t.reveal.kind !== "quiz-result");
  const results = targets.filter((t) => t.reveal.kind === "quiz-result");

  for (const target of live) {
    await revealTarget(page, target, questions);
    await expectOneVisibleTarget(page, target.id);
  }

  await submitAnonymousPreview(page);
  for (const target of results) {
    await expectOneVisibleTarget(page, target.id);
  }
});
