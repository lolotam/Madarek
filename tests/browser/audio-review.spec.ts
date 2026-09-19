import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { writeVersion } from "../../src/server/audio/library.mjs";
import { loadPageSegments } from "../../src/server/audio/segments.mjs";

const libraryPath = resolve(".data/audio-e2e");
const dbPath = resolve(".data/browser-qa.sqlite");
const stamp = Date.now();
const adminEmail = `audio-admin-${stamp}@example.test`;
const parentEmail = `audio-parent-${stamp}@example.test`;
const password = "Test-password-9876";

const pendingBytes = Buffer.alloc(32, 7);

function alignmentFor(text: string, duration: number) {
  const characters = [...text];
  const step = duration / characters.length;
  return {
    duration,
    characters,
    starts: characters.map((_, i) => i * step),
    ends: characters.map((_, i) => (i + 1) * step),
    cues: [
      {
        target: "fixture",
        reveal: true,
        start: 0,
        end: duration,
      },
    ],
  };
}

function runCreateAdmin(email: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>(
    (done, reject) => {
      const child = spawn(
        process.execPath,
        [resolve("scripts/create-admin.mjs"), email],
        {
          cwd: resolve("."),
          env: { ...process.env, DATABASE_PATH: dbPath },
          windowsHide: true,
        },
      );
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("create-admin timed out"));
      }, 15000);
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        done({ code: code ?? 1, stdout, stderr });
      });
    },
  );
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول إلى مساحتي" }).click();
  await expect(page).toHaveURL("/dashboard");
}

async function applyLocalEnv() {
  try {
    const raw = await readFile(resolve(".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  } catch {
    // CI and some worktrees have no .env.local
  }
}

test.beforeAll(async ({ request }) => {
  await applyLocalEnv();
  process.env.AUDIO_LIBRARY_PATH = libraryPath;
  process.env.NARRATION_DIR = resolve("tests/fixtures/narration");
  await rm(libraryPath, { recursive: true, force: true });
  const segments = await loadPageSegments("nutrients");
  const byId = Object.fromEntries(
    segments.map((s: { id: string }) => [s.id, s]),
  );
  const stampVersion = (
    id: string,
    status: "pending" | "approved" | "rejected",
    reason?: string,
  ) => ({
    segmentId: id,
    page: byId[id].page,
    part: byId[id].part,
    version: byId[id].version,
    text: byId[id].text,
    hash: byId[id].hash,
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || "",
    modelId:
      process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2",
    voiceSettings: { stability: 0.5, similarity_boost: 0.75 },
    outputFormat:
      process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128",
    characters: byId[id].text.length,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...(byId[id].protected ? { protected: byId[id].protected } : {}),
    review:
      status === "rejected"
        ? {
            status,
            reviewedAt: "2026-09-02T00:00:00.000Z",
            reason: reason ?? "نطق غير واضح",
          }
        : status === "approved"
          ? { status, reviewedAt: "2026-09-02T00:00:00.000Z" }
          : { status },
  });
  await writeVersion({
    audio: pendingBytes,
    alignment: alignmentFor(byId["map.intro"].text, 1.2),
    libraryPath,
    metadata: stampVersion("map.intro", "pending"),
  });
  await writeVersion({
    audio: pendingBytes,
    alignment: alignmentFor(byId["explore.groups"].text, 0.8),
    libraryPath,
    metadata: stampVersion("explore.groups", "pending"),
  });
  await writeVersion({
    audio: pendingBytes,
    alignment: alignmentFor(byId["result.explain.q1"].text, 1.5),
    libraryPath,
    metadata: stampVersion("result.explain.q1", "rejected", "نطق الإجابة"),
  });

  const adminRegister = await request.post("/api/register", {
    data: {
      name: "مديرة الصوت",
      email: adminEmail,
      password,
      children: [],
    },
  });
  expect(adminRegister.ok()).toBeTruthy();
  const promoted = await runCreateAdmin(adminEmail);
  expect(promoted.code, promoted.stderr).toBe(0);

  const parentRegister = await request.post("/api/register", {
    data: {
      name: "ولي أمر الاختبار",
      email: parentEmail,
      password,
      children: [],
    },
  });
  expect(parentRegister.ok()).toBeTruthy();
});

test("non-admin cannot open the audio review page", async ({ page }) => {
  await login(page, parentEmail);
  const response = await page.goto("/admin/audio");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "هذه الصفحة غير موجودة" }),
  ).toBeVisible();
});

test("admin reviews clips in the browser", async ({ page }) => {
  await login(page, adminEmail);
  await page.goto("/admin/audio");
  await expect(
    page.getByRole("heading", { name: "مراجعة الصوت" }),
  ).toBeVisible();
  const summary = page.getByRole("region", { name: "ملخص الحالة الحالية" });
  await expect(
    summary.locator("li").filter({ hasText: "غير مولَّد" }).locator("b"),
  ).toHaveText("1");
  await expect(
    summary.locator("li").filter({ hasText: "بانتظار المراجعة" }).locator("b"),
  ).toHaveText("2");
  await expect(
    summary.locator("li").filter({ hasText: "معتمد" }).locator("b"),
  ).toHaveText("0");
  await expect(
    summary.locator("li").filter({ hasText: "مرفوض" }).locator("b"),
  ).toHaveText("1");
  await expect(page.getByText("حروف بانتظار التوليد:")).toBeVisible();
  await expect(page.locator("pre")).toContainText("npm run audio -- generate");

  const intro = await loadPageSegments("nutrients");
  const introHash = intro.find(
    (s: { id: string; hash: string }) => s.id === "map.intro",
  )!.hash;
  const ranged = await page.request.get(
    `/api/admin/audio/clip/map.intro/${introHash}`,
    { headers: { Range: "bytes=0-3" } },
  );
  expect(ranged.status()).toBe(206);
  expect(ranged.headers()["content-range"]).toBe("bytes 0-3/32");
  expect(ranged.headers()["cache-control"]).toBe("no-store");

  const introCard = page.locator("article").filter({ hasText: "map.intro" });
  await introCard.getByRole("button", { name: "اعتماد" }).click();
  await expect(introCard.getByRole("status")).toContainText("اعتُمد المقطع");
  await expect(introCard.getByText("معتمد", { exact: true })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("tab", { name: "السجل" }).click();
  // The QA database persists across runs, so earlier runs leave older
  // entries; the log is newest first, so check the latest one.
  const auditEntry = page
    .locator("li.panel")
    .filter({ hasText: "مراجعة مقطع صوتي" })
    .filter({ hasText: "map.intro" })
    .first();
  await expect(
    auditEntry.getByRole("heading", { name: "مراجعة مقطع صوتي" }),
  ).toBeVisible();
  await expect(auditEntry.getByText("map.intro · اعتماد")).toBeVisible();

  await page.goto("/admin/audio");
  await expect(
    page.getByRole("heading", { name: "مراجعة الصوت" }),
  ).toBeVisible();

  const manifest = await page.request.get("/api/audio/manifest?page=nutrients");
  expect(manifest.ok()).toBeTruthy();
  const body = await manifest.json();
  const ready = body.segments.find((s: { id: string }) => s.id === "map.intro");
  expect(ready).toMatchObject({
    status: "ready",
    url: `/api/audio/clip/map.intro/${introHash}`,
  });

  const groupsCard = page
    .locator("article")
    .filter({ hasText: "explore.groups" });
  await groupsCard.getByRole("button", { name: "رفض" }).press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "تأكيد الرفض" }).press("Enter");
  await expect(dialog.getByRole("alert")).toContainText("مطلوب");
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("سبب الرفض (مطلوب)")
    .pressSequentially("النطق غير واضح");
  await dialog.getByRole("button", { name: "تأكيد الرفض" }).press("Enter");
  await expect(groupsCard.getByText("مرفوض", { exact: true })).toBeVisible();
  await expect(groupsCard.getByRole("status")).toContainText("رُفض المقطع");

  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

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
  ).toEqual([]);
});
