import { chromium } from '@playwright/test';

const baseUrl = 'https://rakushu.mii4a.workers.dev';
const route = '/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded' });
try { await page.waitForLoadState('networkidle', { timeout: 7000 }); } catch {}
const items = await page.locator('a,button').evaluateAll((els) => els.map((el) => ({
  text: (el.textContent || '').trim(),
  aria: el.getAttribute('aria-label'),
  hidden: getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden',
  rect: (() => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })(),
})).filter((x) => x.text || x.aria));
console.log(JSON.stringify(items, null, 2));
await browser.close();
