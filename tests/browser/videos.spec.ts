import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createStore } from "../../src/server/store.mjs";

const password = "valid-password-123";

async function signInAdmin(page: import("@playwright/test").Page) {
  const email = `video-admin-${Date.now()}@example.test`;
  const register = await page.request.post("/api/register", {
    data: { name: "مديرة الفيديو", email, password, children: [] },
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
}

test("an admin adds a lesson video and it opens after the quiz without autoplay", async ({
  page,
}) => {
  await signInAdmin(page);
  const title = `فيديو اختبار ${Date.now()}`;
  const save = await page.request.post("/api/admin/videos/save", {
    data: {
      lessonId: "nutrients",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title,
      goal: "نراجع المغذّيات بمثال من المطبخ.",
      kind: "review",
      duration: "3:20",
      position: 0,
      published: true,
    },
  });
  expect(save.ok()).toBeTruthy();
  const video = await save.json();
  try {
    await page.goto("/grade/8/science/nutrients");
    const card = page.getByRole("button", { name: new RegExp(title) });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    const frame = dialog.locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
    );
    await expect(frame).not.toHaveAttribute("src", /autoplay=1/);
    await dialog.getByRole("button", { name: "إغلاق" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/admin");
    await page.getByRole("tab", { name: /الفيديوهات/ }).click();
    await expect(page.getByText(title)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.request.post("/api/admin/videos/delete", {
      data: { id: video.id },
    });
  }
});
