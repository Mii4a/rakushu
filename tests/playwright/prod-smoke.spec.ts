import { expect, test } from "@playwright/test";

const routes = [
  "/jobs",
  "/criteria",
  "/compare",
  "/resume",
  "/pricing",
  "/settings/account",
  "/settings/commute"
] as const;

test.describe("production authenticated smoke routes", () => {
  for (const route of routes) {
    test(route, async ({ page, baseURL }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const serverErrors: string[] = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });

      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      page.on("response", (response) => {
        const responseUrl = response.url();
        if (response.status() >= 500 && (!baseURL || responseUrl.startsWith(baseURL))) {
          serverErrors.push(`${response.status()} ${responseUrl}`);
        }
      });

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `missing main document response for ${route}`).not.toBeNull();
      expect(response?.status(), `unexpected main document status for ${route}`).toBeLessThan(400);

      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await expect(page).toHaveURL(`${baseURL}${route}`);

      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(/server-side application error|application error/i);
      expect(bodyText).not.toMatch(/Googleアカウントで始める|Googleでログイン/);
      expect(pageErrors, `uncaught page errors on ${route}`).toEqual([]);
      expect(serverErrors, `5xx responses on ${route}`).toEqual([]);

      const filteredConsoleErrors = consoleErrors.filter(
        (message) =>
          !message.includes("Failed to load resource: the server responded with a status of 404")
      );
      expect(filteredConsoleErrors, `console errors on ${route}`).toEqual([]);
    });
  }
});
