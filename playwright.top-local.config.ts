import { defineConfig, devices } from "@playwright/test";

const LOCAL_BASE_URL = process.env.PLAYWRIGHT_LOCAL_BASE_URL ?? "http://localhost:3100";
process.env.PLAYWRIGHT_LOCAL_BASE_URL = LOCAL_BASE_URL;

export default defineConfig({
  testDir: "./tests/playwright",
  testMatch: "top-login-modal.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: LOCAL_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  globalSetup: "./tests/playwright/local-global-setup.mjs",
  globalTeardown: "./tests/playwright/local-global-teardown.mjs",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1672, height: 941 }
      }
    }
  ],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: LOCAL_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
