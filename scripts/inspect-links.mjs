import { chromium } from '@playwright/test';

const baseUrl = 'https://rakushu.mii4a.workers.dev';
const paths = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of paths) {
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: 'networkidle', timeout: 30000 });
    const items = await page.locator('a, button').evaluateAll((els) => els.map((el) => ({
      tag: el.tagName,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      visible: !!(el instanceof HTMLElement && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)),
      href: el instanceof HTMLAnchorElement ? el.href : null,
    })));
    console.log(`PATH ${path}`);
    for (const item of items) console.log(JSON.stringify(item));
    console.log('---');
  }
  await context.close();
} finally {
  await browser.close();
}
