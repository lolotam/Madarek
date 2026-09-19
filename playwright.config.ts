import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
// E2E_PORT lets parallel worktrees run the suite without colliding.
const port = Number(process.env.E2E_PORT) || 3001;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      DATABASE_PATH: resolve(".data/browser-qa.sqlite"),
      AUDIO_LIBRARY_PATH: resolve(".data/audio-e2e"),
      NARRATION_DIR: resolve("tests/fixtures/narration"),
    },
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
