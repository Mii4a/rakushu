import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

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
page.on('console', (msg) => console.log('console', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('pageerror', err.message));
page.on('response', (res) => {
  if (res.url().includes('/api/ai-interview/voice') || res.url().includes('/api/internal/ai-interview/transcriptions/callback')) {
    console.log('response', res.status(), res.url());
  }
});

function dump(name, data) {
  writeFileSync(`/tmp/${name}.json`, JSON.stringify(data, null, 2));
}

try {
  console.log('goto');
  await page.goto('http://localhost:3000/ai-interview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: '/tmp/ai-interview-1.png', fullPage: true });
  console.log('click voice mode');
  await page.getByRole('button', { name: '音声で回答' }).click();
  await page.screenshot({ path: '/tmp/ai-interview-2.png', fullPage: true });
  console.log('click start');
  await page.getByRole('button', { name: '録音を開始' }).click();
  await page.waitForTimeout(3600);
  await page.screenshot({ path: '/tmp/ai-interview-3.png', fullPage: true });
  console.log('click stop');
  await page.getByRole('button', { name: '録音を停止' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/ai-interview-4.png', fullPage: true });
  console.log('buttons after stop');
  const buttonStates = await page.locator('button').evaluateAll((buttons) => buttons.map((button) => ({
    text: button.textContent,
    disabled: button.hasAttribute('disabled')
  })));
  dump('ai-interview-button-states', buttonStates);
  const textareaState = await page.locator('textarea').first().evaluate((el) => ({ value: el.value, readOnly: el.readOnly }));
  dump('ai-interview-textarea-state', textareaState);
  console.log('click transcribe');
  await page.getByRole('button', { name: '文字起こしへ進む' }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/ai-interview-5.png', fullPage: true });
  const bodyText = await page.locator('body').innerText();
  writeFileSync('/tmp/ai-interview-body.txt', bodyText);
  console.log('saved diagnostics');
} finally {
  await context.close();
  await browser.close();
}
