import { expect, test, type ConsoleMessage, type Page, type Response } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const META_PATH = path.join(process.cwd(), "playwright/.auth/local-session-meta.json");

async function getFirstJobRoute() {
  const raw = await readFile(META_PATH, "utf8");
  const meta = JSON.parse(raw);
  if (!meta?.firstJobId) {
    throw new Error("No job found for local Playwright session; cannot verify /jobs/[id]");
  }
  return `/jobs/${meta.firstJobId}`;
}

async function assertRouteHealthy(page: Page, route: string, expectedUrlPart?: string) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on("pageerror", (error: Error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("response", (response: Response) => {
    const responseUrl = response.url();
    if (response.status() >= 500 && responseUrl.startsWith("http://127.0.0.1:3000")) {
      serverErrors.push(`${response.status()} ${responseUrl}`);
    }
  });

  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response, `missing main document response for ${route}`).not.toBeNull();
  expect(response?.status(), `unexpected main document status for ${route}`).toBeLessThan(400);

  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  if (expectedUrlPart) {
    await expect(page).toHaveURL(new RegExp(expectedUrlPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/server-side application error|application error/i);
  expect(bodyText).not.toMatch(/Googleアカウントで始める|Googleでログイン/);
  expect(pageErrors, `uncaught page errors on ${route}`).toEqual([]);
  expect(serverErrors, `5xx responses on ${route}`).toEqual([]);

  const filteredConsoleErrors = consoleErrors.filter((message) => {
    return !message.includes("Failed to load resource: the server responded with a status of 404");
  });
  expect(filteredConsoleErrors, `console errors on ${route}`).toEqual([]);
}

test.describe("local jobs route smoke", () => {
  test("/jobs", async ({ page }) => {
    await assertRouteHealthy(page, "/jobs", "/jobs");
    await expect(page.locator("body")).toContainText("保存した求人一覧");
  });

  test("/jobs/new", async ({ page }) => {
    await assertRouteHealthy(page, "/jobs/new", "/jobs/new");
    await expect(page.locator("body")).toContainText("新規求人登録");
  });

  test("/jobs/[id]", async ({ page }) => {
    const route = await getFirstJobRoute();
    await assertRouteHealthy(page, route, route);
    await expect(page.locator("body")).toContainText("求人解析結果");
  });
});
