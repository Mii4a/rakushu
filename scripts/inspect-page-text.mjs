import { chromium } from '@playwright/test';

const baseUrl = 'https://rakushu.mii4a.workers.dev';
const paths = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of paths) {
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: 'networkidle', timeout: 30000 });
    const text = await page.locator('body').innerText();
    console.log(`PATH ${path}`);
    console.log(text.slice(0, 3000));
    console.log('---');
  }
  await context.close();
} finally {
  await browser.close();
}
