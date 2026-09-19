import { test, expect } from "@playwright/test";

test("a student earns XP for a lesson step and the daily mission shows as done", async ({
  page,
}) => {
  const stamp = Date.now();
  const username = `rw-${stamp}`;
  const register = await page.request.post("/api/register", {
    data: {
      name: "ولي أمر المكافآت",
      email: `rw-${stamp}@example.test`,
      password: "Test-password-9876",
      children: [
        { name: "نور", username, pin: "73918264", grade: 8, gender: "female" },
      ],
    },
  });
  expect(register.ok()).toBeTruthy();
  const login = await page.request.post("/api/student-login", {
    data: { username, pin: "73918264" },
  });
  expect(login.ok()).toBeTruthy();

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "مستكشفة مبتدئة", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "أنجزي نشاطًا واحدًا اليوم" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "ابدئي مهمة اليوم" }).click();
  await page
    .getByRole("button", { name: "فهمت، أنجزت هذا المقطع", exact: true })
    .first()
    .click();
  await expect(page.getByText(/خبرة!/)).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "أنجزتِ مهمة اليوم، نكمّل بكرة" }),
  ).toBeVisible();
  await expect(page.getByText("مقطع من الدرس")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
