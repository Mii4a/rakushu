import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

import { createLocalSession, cleanupLocalSession } from "../tests/playwright/local-auth.mjs";

const baseURL = process.env.PLAYWRIGHT_LOCAL_BASE_URL ?? "http://localhost:3002";
const artifactDir = path.join(process.cwd(), "playwright-artifacts", "criteria-chat-ui");
const screenshotPath = path.join(artifactDir, "criteria-chat-ui.png");

await mkdir(artifactDir, { recursive: true });
const session = await createLocalSession();

try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: session.storageStatePath, baseURL, viewport: { width: 1440, height: 1600 } });
  const page = await context.newPage();
  const response = await page.goto("/criteria", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 500);
  console.log(JSON.stringify({
    status: response?.status() ?? null,
    finalUrl: page.url(),
    screenshotPath,
    bodyExcerpt: bodyText
  }, null, 2));
  await context.close();
  await browser.close();
} finally {
  await cleanupLocalSession();
}
