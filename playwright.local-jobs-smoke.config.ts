import { defineConfig, devices } from "@playwright/test";

const LOCAL_BASE_URL = process.env.PLAYWRIGHT_LOCAL_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/playwright",
  testMatch: "local-jobs-routes.spec.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./tests/playwright/local-global-setup.mjs",
  globalTeardown: "./tests/playwright/local-global-teardown.mjs",
  use: {
    baseURL: LOCAL_BASE_URL,
    storageState: "playwright/.auth/local-user.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  webServer: {
    command: `npx next dev --hostname 127.0.0.1 --port ${new URL(LOCAL_BASE_URL).port || "3000"}`,
    url: LOCAL_BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
