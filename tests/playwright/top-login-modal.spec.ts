import { expect, test, type BrowserContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import * as path from "node:path";

const localStorageStatePath = path.join(process.cwd(), "playwright/.auth/local-user.json");

type StorageCookie = Parameters<BrowserContext["addCookies"]>[0][number];

async function addLocalAuthCookie(context: BrowserContext) {
  const raw = await readFile(localStorageStatePath, "utf8");
  const storageState = JSON.parse(raw) as { cookies: StorageCookie[] };
  await context.addCookies(storageState.cookies);
}

test.describe("top page login CTA modal", () => {
  test("renders mock-aligned top page before modal", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "らくしゅう" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "トップページ" })).toContainText("機能");
    await expect(page.getByRole("navigation", { name: "トップページ" })).toContainText("料金");
    await expect(page.getByRole("button", { name: "無料で始める" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();

    await expect(page.getByRole("heading", { name: /確実に一つの企業への/ })).toBeVisible();
    await expect(page.getByText("選考を完遂する")).toBeVisible();
    await expect(page.getByText("求人チェックから企業研究、履歴書作成、面接対策まで")).toBeVisible();

    await expect(page.getByLabel("求人チェッカーのプレビュー").getByRole("heading", { name: "求人チェッカー" })).toBeVisible();
    const previewNav = page.getByRole("navigation", { name: "プレビュー内ナビゲーション" });
    await expect(previewNav.getByRole("button", { name: "求人チェッカー" })).toHaveAttribute("aria-pressed", "true");
    await expect(previewNav.getByRole("button", { name: "企業研究" })).toHaveAttribute("aria-pressed", "false");
    const jobTextInput = page.getByLabel("求人票テキスト");
    await expect(jobTextInput).toHaveValue("");
    await expect(jobTextInput).toHaveAttribute("placeholder", "求人内容をコピー＆ペーストしてください");
    await jobTextInput.fill("求人票サンプル");
    await expect(jobTextInput).toHaveValue("求人票サンプル");
    await expect(page.getByText("求人票のURLからも入力できます")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "チェックする" })).toBeVisible();

    await previewNav.getByRole("button", { name: "企業研究" }).click();
    await expect(page.getByLabel("企業研究のプレビュー").getByRole("heading", { name: "企業研究" })).toBeVisible();
    await expect(previewNav.getByRole("button", { name: "求人チェッカー" })).toHaveAttribute("aria-pressed", "false");
    await expect(previewNav.getByRole("button", { name: "企業研究" })).toHaveAttribute("aria-pressed", "true");
    const companyUrlInput = page.getByLabel("企業のURL");
    await expect(companyUrlInput).toHaveValue("");
    await expect(companyUrlInput).toHaveAttribute("placeholder", "https://company.example.com");
    await companyUrlInput.fill("https://example.com");
    await expect(companyUrlInput).toHaveValue("https://example.com");
    const companyPreview = page.getByLabel("企業研究のプレビュー");
    await expect(companyPreview.getByText("分析する内容（自動で調査・分析します）")).toBeVisible();
    await expect(companyPreview.getByText("会社概要")).toBeVisible();
    await expect(companyPreview.getByText("事業内容", { exact: true })).toBeVisible();
    await expect(companyPreview.getByText("志望動機に使えるポイント")).toBeVisible();
    await expect(page.getByRole("button", { name: "企業研究を開始する" })).toBeVisible();

    await previewNav.getByRole("button", { name: "求人チェッカー" }).click();
    await expect(page.getByLabel("求人チェッカーのプレビュー").getByRole("heading", { name: "求人チェッカー" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "らくしゅうでできること" })).toBeVisible();
    await expect(page.getByText("就活のあらゆる場面で、あなたの可能性を最大化します")).toBeVisible();
    await expect(page.locator("#features").getByRole("heading", { name: "企業研究" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "履歴書 AI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI 面接" })).toBeVisible();
  });

  test("opens and closes login modal without route navigation", async ({ page }) => {
    await page.goto("/");

    const startButton = page.getByRole("button", { name: "無料で始める" }).first();
    await startButton.click();
    await expect(page).toHaveURL(/\/$/);

    const dialog = page.getByRole("dialog", { name: "ログインして始める" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("続行するにはログインしてください")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Google.*ログイン/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(startButton).toBeFocused();

    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "ログインモーダルを閉じる" }).click();
    await expect(dialog).toBeHidden();

    await startButton.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(20, 20);
    await expect(dialog).toBeHidden();
  });

  test("uses the job checker as the default post-login destination", async ({ page }) => {
    await page.goto("/");

    const signInCalls: unknown[] = [];
    await page.route("**/api/auth/sign-in/social", async (route) => {
      signInCalls.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null }) });
    });

    await page.getByRole("button", { name: "ログイン" }).click();
    await page.getByRole("dialog", { name: "ログインして始める" }).getByRole("button", { name: /Google.*ログイン/ }).click();

    await expect.poll(() => signInCalls.length).toBe(1);
    expect(signInCalls[0]).toMatchObject({
      provider: "google",
      callbackURL: "http://localhost:3100/jobs/new"
    });
  });

  test("preserves job checker demo input through login CTA and restores it on the job form", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("求人票テキスト").fill("フロントエンドエンジニアの求人本文です。React と TypeScript を使います。");
    await page.getByRole("button", { name: "チェックする" }).click();

    const dialog = page.getByRole("dialog", { name: "ログインして始める" });
    await expect(dialog).toBeVisible();
    await expect(
      page.evaluate(() => {
        const saved = window.sessionStorage.getItem("rakushu:top-demo-intent");
        return saved ? JSON.parse(saved) : null;
      })
    ).resolves.toMatchObject({
      feature: "job-checker",
      payload: {
        jobText: "フロントエンドエンジニアの求人本文です。React と TypeScript を使います。"
      }
    });

    const signInCalls: unknown[] = [];
    await page.route("**/api/auth/sign-in/social", async (route) => {
      signInCalls.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null }) });
    });
    await dialog.getByRole("button", { name: /Google.*ログイン/ }).click();
    await expect.poll(() => signInCalls.length).toBe(1);
    expect(signInCalls[0]).toMatchObject({
      provider: "google",
      callbackURL: "http://localhost:3100/jobs/new?restoreDemo=1"
    });

    await addLocalAuthCookie(page.context());
    await page.goto("/jobs/new?restoreDemo=1");
    await expect(page.getByRole("textbox", { name: /求人票の全文を貼り付けると/ })).toHaveValue("フロントエンドエンジニアの求人本文です。React と TypeScript を使います。");
    await expect(page.getByText("トップページで入力した求人本文を引き継ぎました。")).toBeVisible();
    await expect(page.evaluate(() => window.sessionStorage.getItem("rakushu:top-demo-intent"))).resolves.toBeNull();
  });

  test("preserves company research demo input through login CTA and restores it on the research form", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("navigation", { name: "プレビュー内ナビゲーション" }).getByRole("button", { name: "企業研究" }).click();
    await page.getByLabel("企業のURL").fill("https://company.example.com");
    await page.getByRole("button", { name: "企業研究を開始する" }).click();

    const dialog = page.getByRole("dialog", { name: "ログインして始める" });
    await expect(dialog).toBeVisible();
    await expect(
      page.evaluate(() => {
        const saved = window.sessionStorage.getItem("rakushu:top-demo-intent");
        return saved ? JSON.parse(saved) : null;
      })
    ).resolves.toMatchObject({
      feature: "company-research",
      payload: {
        companyUrl: "https://company.example.com"
      }
    });

    const signInCalls: unknown[] = [];
    await page.route("**/api/auth/sign-in/social", async (route) => {
      signInCalls.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null }) });
    });
    await dialog.getByRole("button", { name: /Google.*ログイン/ }).click();
    await expect.poll(() => signInCalls.length).toBe(1);
    expect(signInCalls[0]).toMatchObject({
      provider: "google",
      callbackURL: "http://localhost:3100/company-research?restoreDemo=1"
    });

    await addLocalAuthCookie(page.context());
    await page.goto("/company-research?restoreDemo=1");
    await expect(page.getByRole("tab", { name: "新規企業を入力" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("企業の公式サイトURL")).toHaveValue("https://company.example.com");
    await expect(page.getByText("トップページで入力した企業URLを引き継ぎました。")).toBeVisible();
    await expect(page.evaluate(() => window.sessionStorage.getItem("rakushu:top-demo-intent"))).resolves.toBeNull();
  });
});
