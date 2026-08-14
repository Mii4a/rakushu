import { chromium } from '@playwright/test';

const baseUrl = 'https://rakushu.mii4a.workers.dev';
const pages = ['/', '/beta'];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

for (const route of pages) {
  await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded' });
  try { await page.waitForLoadState('networkidle', { timeout: 7000 }); } catch {}
  const bodyText = await page.locator('body').innerText();
  const linkTexts = await page.locator('a,button').evaluateAll((els) => els.map((el) => (el.textContent || '').trim()).filter(Boolean));
  console.log(JSON.stringify({ route, url: page.url(), linkTexts, bodyText: bodyText.slice(0, 3000) }, null, 2));
}

await browser.close();
