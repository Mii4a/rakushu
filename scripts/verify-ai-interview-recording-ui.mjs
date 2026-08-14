import { chromium } from '@playwright/test';

const storageState = '/home/openclaw/rakushu/playwright/.auth/local-user.json';
const baseURL = process.env.PLAYWRIGHT_LOCAL_BASE_URL ?? 'http://127.0.0.1:3002';
const screenshotDir = '/home/openclaw/rakushu/playwright-artifacts/ai-interview-recording-ui';

await import('node:fs/promises').then(({ mkdir }) => mkdir(screenshotDir, { recursive: true }));

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream'
  ]
});

const context = await browser.newContext({
  storageState,
  baseURL,
  permissions: ['microphone'],
  viewport: { width: 1600, height: 1200 }
});

await context.addInitScript(() => {
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

const page = await context.newPage();

const wait = (ms) => page.waitForTimeout(ms);

async function getPanelMetrics() {
  const article = page.locator('article').first();
  const box = await article.boundingBox();
  if (!box) return null;
  const pageMetrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    overflowY: getComputedStyle(document.body).overflowY,
  }));
  return {
    height: box.height,
    width: box.width,
    top: box.y,
    ...pageMetrics,
  };
}


async function screenshot(name) {
  const path = `${screenshotDir}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}


try {
  const result = {};

  await page.goto(`${baseURL}/ai-interview`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.innerText.includes('AI面接'), null, { timeout: 20000 });

  result.url = page.url();
  result.initialMetrics = await getPanelMetrics();
  result.initialText = await page.locator('body').innerText();
  result.initialScreenshot = await screenshot('01-idle');

  await page.getByRole('button', { name: '録音を開始' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('録音中'), null, { timeout: 10000 });
  await wait(2100);
  result.recordingMetrics = await getPanelMetrics();
  result.recordingText = await page.locator('body').innerText();
  result.recordingScreenshot = await screenshot('02-recording');

  await page.getByRole('button', { name: '録音を終了' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('文字起こし中...'), null, { timeout: 10000 });
  result.transcribingMetrics = await getPanelMetrics();
  result.transcribingText = await page.locator('body').innerText();
  result.transcribingScreenshot = await screenshot('03-transcribing');

  await page.waitForFunction(() => document.body.innerText.includes('AIが評価中...'), null, { timeout: 10000 });
  result.evaluatingMetrics = await getPanelMetrics();
  result.evaluatingText = await page.locator('body').innerText();
  result.evaluatingScreenshot = await screenshot('04-evaluating');

  await page.waitForFunction(() => document.body.innerText.includes('処理が完了しました'), null, { timeout: 10000 });
  result.completeMetrics = await getPanelMetrics();
  result.completeText = await page.locator('body').innerText();
  result.completeScreenshot = await screenshot('05-complete');

  await page.getByRole('button', { name: 'フィードバックを見る' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('AI評価フィードバック'), null, { timeout: 10000 });
  result.feedbackText = await page.locator('body').innerText();
  result.feedbackScreenshot = await screenshot('06-feedback-modal');

  result.assertions = {
    idleHasGreenPrompt: result.initialText.includes('クリックして録音を開始'),
    idleHasScenarioOverview: result.initialText.includes('面接シナリオの概要'),
    recordingHasTimer: /録音中\s+\d+:\d{2}/.test(result.recordingText),
    recordingHasLiveTranscript: result.recordingText.includes('リアルタイムで文字起こし中') && result.recordingText.includes('私は、人々の生活を支える製品を通じて、社会に貢献したいと考えています'),
    transcribingHasLoadingText: result.transcribingText.includes('文字起こし中...') && result.transcribingText.includes('録音データをテキストに変換しています'),
    evaluatingHasAnalysisText: result.evaluatingText.includes('AIが評価中...') && result.evaluatingText.includes('回答内容を分析してフィードバックを生成しています'),
    completeHasFeedbackButton: result.completeText.includes('処理が完了しました') && result.completeText.includes('フィードバックを見る'),
    feedbackModalOpened: result.feedbackText.includes('自己紹介｜AI評価フィードバック') && result.feedbackText.includes('2/2問 回答完了') && result.feedbackText.includes('総合評価') && result.feedbackText.includes('よかった点') && result.feedbackText.includes('改善ポイント') && result.feedbackText.includes('次に意識したいこと') && result.feedbackText.includes('次のカテゴリへ'),
    layoutStayedStable: Boolean(result.initialMetrics && result.completeMetrics && Math.abs(result.initialMetrics.height - result.completeMetrics.height) <= 80),
    pageDidNotGrowMuch: Boolean(result.initialMetrics && result.completeMetrics && Math.abs(result.initialMetrics.scrollHeight - result.completeMetrics.scrollHeight) <= 80),
    scenarioArrowsVisible: await page.evaluate(() => {
      const overview = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('面接シナリオの概要')
      );
      return (overview?.querySelectorAll('svg.lucide-chevron-right').length ?? 0) >= 1;
    })
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
