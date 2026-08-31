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

async function getFirstJobId() {
  const raw = await readFile(META_PATH, "utf8");
  const meta = JSON.parse(raw);
  if (!meta?.firstJobId) {
    throw new Error("No job found for local Playwright session; cannot verify jobId pipeline context");
  }
  return String(meta.firstJobId);
}

async function assertWorkspaceShell(page: Page, route: string) {
  const metrics = await page.evaluate(() => {
    const bodyStyle = window.getComputedStyle(document.body);
    return {
      hasDashboardFrame: Boolean(document.querySelector(".dashboard-frame")),
      hasDashboardMockFrame: Boolean(document.querySelector(".dashboard-mock-frame")),
      hasJobsMockSurface: Boolean(document.querySelector(".jobs-mock-surface")),
      bodyOverflowY: bodyStyle.overflowY
    };
  });

  expect(
    metrics.hasDashboardFrame || metrics.hasDashboardMockFrame || metrics.hasJobsMockSurface,
    `${route} should render one of the mock/workspace shells`
  ).toBe(true);

  if (metrics.hasDashboardFrame || metrics.hasDashboardMockFrame) {
    expect(metrics.bodyOverflowY, `${route} should prevent page-level vertical scrolling and use internal panels`).toBe("hidden");
  }
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
    if (response.status() >= 500 && (responseUrl.startsWith("http://localhost:3000") || responseUrl.startsWith("http://127.0.0.1:3000"))) {
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
  test("/dashboard redirects to the job checker", async ({ page }) => {
    await assertRouteHealthy(page, "/dashboard", "/jobs/new");
    await expect(page.getByRole("heading", { name: "求人チェッカー" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ダッシュボード" })).toHaveCount(0);
  });

  test("/onboarding preview", async ({ page, context }) => {
    await context.clearCookies();
    await assertRouteHealthy(page, "/onboarding?preview=1", "/onboarding\?preview=1");
    await expect(page.locator("body")).toContainText("らくしゅうが");
    await expect(page.locator("body")).toContainText("スキル");
    await expect(page.locator("body")).toContainText("やっほ〜、らくもだよ");
    await expect(page.locator("body")).toContainText("あとから変えられるから、気楽でOK〜");
    await expect(page.locator("body")).toContainText("はじめる");
  });

  test("/criteria", async ({ page }) => {
    await assertRouteHealthy(page, "/criteria", "/criteria");
    await assertWorkspaceShell(page, "/criteria");
    await expect(page.locator("body")).toContainText("チェック基準");
    await expect(page.locator("body")).toContainText("人気の基準プリセット");
    await expect(page.getByRole("region", { name: "人気のチェック基準" })).toBeVisible();
    await expect(page.getByRole("region", { name: "人気のチェック基準" }).getByRole("link")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "前の基準" })).toBeVisible();
    await expect(page.getByRole("button", { name: "次の基準" })).toBeVisible();
    await expect(page.locator("body")).toContainText("選択した条件");
    await expect(page.locator("body")).toContainText("スコアにどう反映される？");
    await expect(page.getByRole("link", { name: "ダッシュボード" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "チェック基準", exact: true })).toBeVisible();
  });

  test("/company-research", async ({ page }) => {
    const firstJobId = await getFirstJobId();
    await assertRouteHealthy(page, `/company-research?jobId=${firstJobId}`, "/company-research");
    await assertWorkspaceShell(page, "/company-research");
    await expect(page.locator("body")).toContainText("企業研究");
    const hasResultState = (await page.getByRole("button", { name: /レポートを開く|レポート全文を見る/ }).count()) > 0;
    if (hasResultState) {
      await expect(page.getByRole("region", { name: "企業研究レポートチャット" })).toBeVisible();
      await expect(page.getByRole("button", { name: /レポートを開く|レポート全文を見る/ })).toBeVisible();
      await expect(page.locator("body")).toContainText("企業分析レポート");
      await expect(page.locator("body")).toContainText("企業研究の履歴");
      await expect(page.getByRole("button", { name: "新規リサーチ" })).toBeVisible();
      await page.getByRole("button", { name: "新規リサーチ" }).click();
      await expect(page.getByRole("tab", { name: "新規企業を入力" })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByLabel("企業の公式サイトURL")).toBeVisible();
      await expect(page.getByLabel("企業の公式サイトURL")).toHaveValue("");
      await expect(page.getByRole("button", { name: "企業研究を開始する" })).toBeVisible();
      await expect(page.locator("body")).toContainText("企業研究の履歴");
      await expect(page.getByRole("button", { name: "新規リサーチ" })).toBeVisible();
    } else {
      await expect(page.getByRole("tab", { name: "チェック済みの企業から選ぶ" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "新規企業を入力" })).toBeVisible();
      await expect(page.getByLabel("チェック済み企業")).toBeVisible();
      await expect(page.getByLabel("企業の公式サイトURL")).toBeVisible();
      await expect(page.getByRole("button", { name: "企業研究を開始する" })).toBeVisible();
      await expect(page.getByText("研究結果は履歴として保存され")).toBeVisible();
      await expect(page.locator("body")).toContainText("企業研究の履歴");
      await expect(page.getByRole("button", { name: "新規リサーチ" })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "企業研究" })).toBeVisible();
  });

  test("/ai-interview", async ({ page }) => {
    await assertRouteHealthy(page, "/ai-interview", "/ai-interview");
    await expect(page.locator("body")).toContainText("AI面接");
    await expect(page.locator("body")).toContainText("AI面接の初期設定");
    await expect(page.locator("body")).toContainText("設定方法を選択");
    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(page.locator("body")).toContainText(/質問\s+\d+\s*\/\s*(22|26|28)/);
    await expect(page.locator("body")).not.toContainText(/質問\s+\d+\s*\/\s*10/);
    await expect(page.locator("body")).toContainText("クリックして録音を開始");
    await expect(page.locator("body")).toContainText("面接シナリオの概要");
    await expect(page.locator("body")).toContainText("セッション履歴");
    await expect(page.locator("body")).not.toContainText("完了日");
    await expect(page.locator("body")).not.toContainText("最終更新");
    await expect(page.getByRole("link", { name: "AI面接" }).first()).toBeVisible();
  });

  test("/jobs", async ({ page }) => {
    await assertRouteHealthy(page, "/jobs", "/jobs");
    await assertWorkspaceShell(page, "/jobs");
    await expect(page.locator("body")).toContainText("求人一覧");
    await expect(page.locator("body")).toContainText("求人チェック");
    await expect(page.locator("body")).toContainText("企業研究");
    await expect(page.locator("body")).toContainText("レジュメAI");
    await expect(page.locator("body")).not.toContainText("カード全体をクリックすると詳細を開けます");
    await expect(page.getByLabel("企業名・職種・キーワードで検索")).toBeVisible();
    await expect(page.getByLabel("勤務地で絞り込み")).toBeVisible();
    await expect(page.getByLabel("年収で絞り込み")).toBeVisible();
    await expect(page.getByLabel("雇用形態で絞り込み")).toBeVisible();
    await expect(page.getByRole("option", { name: "マッチ度が低い順" })).toHaveCount(1);
    await expect(page.getByRole("option", { name: "お気に入り済み" })).toHaveCount(1);
    const favoriteButton = page.getByRole("button", { name: /お気に入りに追加|お気に入りから外す/ }).first();
    await expect(favoriteButton).toBeVisible();
    const beforeLabel = await favoriteButton.getAttribute("aria-label");
    await favoriteButton.click();
    await expect(page.getByRole("button", { name: beforeLabel === "お気に入りに追加" ? "お気に入りから外す" : "お気に入りに追加" }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: /お気に入りに追加|お気に入りから外す/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "詳細パネルを表示" })).toHaveAttribute("href", /detailPane=shown/);
    await expect(page.locator("body")).not.toContainText("保存した求人のサマリー");
    await page.goto("/jobs?detailPane=shown", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "詳細パネルを隠す" })).toBeVisible();
    await expect(page.locator("body")).toContainText("保存した求人のサマリー");
  });

  test("/jobs/new", async ({ page }) => {
    await assertRouteHealthy(page, "/jobs/new", "/jobs/new");
    await assertWorkspaceShell(page, "/jobs/new");
    await expect(page.locator("body")).toContainText("求人チェッカー");
    await expect(page.getByPlaceholder(/仕事内容、応募資格/)).toBeVisible();
    await expect(page.getByLabel("企業HPのURL（任意）")).toBeVisible();
    await expect(page.getByRole("button", { name: "解析する" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("AIプレビュー");
  });

  test("/resume", async ({ page }) => {
    const jobRoute = await getFirstJobRoute();
    const jobId = jobRoute.split("/").pop();
    await assertRouteHealthy(page, `/resume?jobId=${jobId}`, "/resume");
    await assertWorkspaceShell(page, "/resume");
    await expect(page.locator("body")).toContainText("履歴書作成");
    await expect(page.locator("body")).toContainText("対象企業");
    await expect(page.locator("body")).toContainText("この企業向けに履歴書・ESを調整");
    await page.getByRole("button", { name: "2ページ目" }).click();
    await expect(page.locator("body")).toContainText("学歴・職歴（各別にまとめて書く）");
    await expect(page.locator("body")).toContainText("免許・資格");
    await expect(page.locator("body")).not.toContainText("職務経歴書");
    await expect(page.getByRole("button", { name: "入力欄を開く⇧" })).toBeVisible();
    await page.getByRole("button", { name: "入力欄を開く⇧" }).click();
    const drawer = page.getByRole("dialog", { name: "履歴書項目入力フォーム" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "AI下書き" })).toHaveAttribute("type", "submit");
    await expect(drawer.getByRole("button", { name: "添削" })).toHaveAttribute("type", "submit");
    await expect(drawer.getByRole("button", { name: "企業に合わせて調整" })).toHaveAttribute("type", "submit");
    await expect(drawer.getByRole("button", { name: "企業に合わせて調整" })).toBeEnabled();
    await expect(drawer.getByText(/企業に合わせて調整は、対象求人を選んだときだけ使えます。/)).toHaveCount(0);
    const currentAppeal = await drawer.getByLabel("志望動機・自己PRなど").inputValue();
    await expect(currentAppeal).not.toContain("学生時代に取り組んだ");
    await expect(currentAppeal).not.toContain("結論を先に置き");
    await expect(currentAppeal).not.toContain("企業研究の内容を使い");
    await expect(drawer.getByLabel("志望動機・自己PRなど")).toHaveValue(currentAppeal);
    await expect(page.locator("body")).not.toContainText("学生時代に取り組んだ");
    const aiForm = page.locator("form#resume-ai-form");
    await expect(aiForm).toHaveAttribute("method", "POST");
    await expect(aiForm).toHaveAttribute("enctype", "multipart/form-data");
    await expect(drawer.getByRole("button", { name: "AI下書き" })).toHaveAttribute("form", "resume-ai-form");
    await expect(drawer.getByRole("button", { name: "添削" })).toHaveAttribute("form", "resume-ai-form");
    await expect(drawer.getByRole("button", { name: "企業に合わせて調整" })).toHaveAttribute("form", "resume-ai-form");
    const appInputNames = await aiForm.locator("input").evaluateAll((inputs) =>
      inputs
        .map((input) => input.getAttribute("name"))
        .filter((name): name is string => typeof name === "string" && !name.startsWith("$ACTION_"))
        .sort(),
    );
    expect(appInputNames).toEqual(["education", "experience", "jobId", "licenses", "motivation", "selfPr"]);
    await expect(aiForm.locator('input[name="fullName"], input[name="currentAddress"], input[name="phone"], input[name="email"]')).toHaveCount(0);
    await expect(drawer.getByRole("button", { name: "下書き保存" })).toHaveAttribute("type", "submit");
    await expect(drawer.getByRole("textbox", { name: "志望動機・自己PRなど" })).toHaveValue(currentAppeal);
  });

  test("/jobs/[id]", async ({ page }) => {
    const route = await getFirstJobRoute();
    const jobId = route.split("/").pop();
    await assertRouteHealthy(page, route, route);
    await assertWorkspaceShell(page, "/jobs/[id]");
    await expect(page.locator("body")).toContainText("求人チェックレポート");
    await expect(page.getByRole("tab", { name: "求人チェック" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "企業研究" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "レジュメAI" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "AI面接" })).toBeVisible();
    await expect(page.locator("body")).toContainText("未記載項目は最低点寄り");
    await expect(page.locator("body")).toContainText("B 標準");
    await expect(page.locator("body")).toContainText("固定残業時間");
    await expect(page.locator("body")).toContainText("休日制度");
    await page.getByRole("tab", { name: "企業研究" }).click();
    await expect(page).toHaveURL(/tab=research/);
    await expect(page.locator("body")).not.toContainText("求人から抽出した情報");
    await expect(page.getByRole("link", { name: /企業研究を(始める|開く)/ })).toHaveAttribute("href", `/company-research?jobId=${jobId}`);
    await page.getByRole("tab", { name: "レジュメAI" }).click();
    await expect(page).toHaveURL(/tab=resume/);
    await expect(page.getByRole("link", { name: /レジュメAIを(始める|開く)/ })).toHaveAttribute("href", `/resume?jobId=${jobId}`);
    await page.getByRole("tab", { name: "AI面接" }).click();
    await expect(page).toHaveURL(/tab=interview/);
    await expect(page.getByRole("link", { name: /AI面接を(始める|開く)/ })).toHaveAttribute("href", `/ai-interview?jobId=${jobId}`);
  });
});
