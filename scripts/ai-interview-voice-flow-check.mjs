import { chromium } from '@playwright/test';

const storageState = 'playwright/.auth/local-user.json';
const fakeAudioPath = '/tmp/rakushu-ai-interview-manual/asano-3s-48k.wav';

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${fakeAudioPath}`
  ]
});

const context = await browser.newContext({
  storageState,
  baseURL: 'http://localhost:3000',
  permissions: ['microphone']
});

const page = await context.newPage();
const result = {};

try {
  await page.goto('http://localhost:3000/ai-interview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: '音声で回答' }).click();
  await page.getByRole('button', { name: '録音を開始' }).click();
  await page.waitForTimeout(3600);
  await page.getByRole('button', { name: '録音を停止' }).click();
  await page.getByRole('button', { name: '文字起こしへ進む' }).click();

  const reviewButton = page.locator('button').filter({ hasText: '確認したテキストでフィードバックを見る' });
  await page.waitForFunction(() => {
    const textarea = document.querySelector('textarea');
    return Boolean(textarea && !textarea.readOnly && textarea.value.trim().length > 0);
  }, null, { timeout: 60000 });

  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  const transcript = await textarea.inputValue();
  if (!transcript.trim()) {
    throw new Error('Transcript textarea stayed empty');
  }
  result.transcript = transcript;

  const confirmedText = `${transcript.trim()} Playwright確認済み`;
  await textarea.fill(confirmedText);
  result.confirmedText = confirmedText;

  await reviewButton.click();
  await page.waitForFunction(() => {
    const body = document.body.innerText;
    return body.includes('この回答で次へ') && !body.includes('まだ採点はありません');
  }, null, { timeout: 45000 });

  const bodyText = await page.locator('body').innerText();
  result.feedbackVisible = bodyText.includes('この回答で次へ');
  result.scoreVisible = !bodyText.includes('まだ採点はありません');
  result.url = page.url();

  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
