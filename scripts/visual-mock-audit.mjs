import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createLocalSession, cleanupLocalSession } from '../tests/playwright/local-auth.mjs';

const ROOT = process.cwd();
const BASE_URL = process.env.PLAYWRIGHT_LOCAL_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'playwright-artifacts', 'visual-mock-audit');
const STORAGE_STATE = path.join(ROOT, 'playwright/.auth/local-user.json');

async function readMeta() {
  const raw = await readFile(path.join(ROOT, 'playwright/.auth/local-session-meta.json'), 'utf8');
  return JSON.parse(raw);
}

function safeName(name) {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function collectRoute(page, route, label, viewport) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  const metrics = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const bodyStyle = window.getComputedStyle(body);
    const candidates = Array.from(document.querySelectorAll('main, section, article, aside, [role="dialog"], .dashboard-mock-content-shell, .dashboard-sidebar-mock, .jobs-mock-surface'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          selector: el.className || el.getAttribute('role') || el.tagName.toLowerCase(),
          tag: el.tagName.toLowerCase(),
          height: Math.round(rect.height),
          width: Math.round(rect.width),
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          overflowY: style.overflowY
        };
      })
      .filter((item) => item.scrollHeight > item.clientHeight + 2 || item.overflowY === 'auto' || item.overflowY === 'scroll')
      .slice(0, 12);

    return {
      url: location.href,
      title: document.title,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentScrollHeight: html.scrollHeight,
      bodyScrollHeight: body.scrollHeight,
      hasVerticalOverflow: Math.max(html.scrollHeight, body.scrollHeight) > window.innerHeight + 2,
      bodyOverflowY: bodyStyle.overflowY,
      hasDashboardFrame: Boolean(document.querySelector('.dashboard-frame')),
      hasDashboardMockFrame: Boolean(document.querySelector('.dashboard-mock-frame')),
      hasJobsMockSurface: Boolean(document.querySelector('.jobs-mock-surface')),
      hasDialog: Boolean(document.querySelector('[role="dialog"]')),
      scrollContainers: candidates,
      textPrefix: body.innerText.replace(/\s+/g, ' ').slice(0, 260)
    };
  });

  const screenshotPath = path.join(OUT_DIR, `${safeName(label)}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return {
    label,
    route,
    status: response?.status() ?? null,
    screenshotPath,
    metrics
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await createLocalSession();
  const meta = await readMeta();

  const routes = [
    { label: 'jobs-new', route: '/jobs/new', viewport: { width: 1672, height: 941 } },
    { label: 'company-research-input', route: `/company-research?jobId=${meta.firstJobId}`, viewport: { width: 1672, height: 941 } },
    { label: 'ai-interview-setup', route: `/ai-interview?jobId=${meta.firstJobId}`, viewport: { width: 1672, height: 941 } },
    { label: 'onboarding-preview', route: '/onboarding?preview=1', viewport: { width: 1448, height: 1086 }, public: true },
    { label: 'criteria', route: '/criteria', viewport: { width: 1493, height: 1054 } },
    { label: 'jobs-list', route: '/jobs', viewport: { width: 1491, height: 1055 } },
    { label: 'jobs-detail', route: `/jobs/${meta.firstJobId}`, viewport: { width: 1448, height: 1086 } }
  ];

  const browser = await chromium.launch({ headless: true });
  const results = [];
  const errors = [];

  try {
    for (const item of routes) {
      const context = await browser.newContext({
        baseURL: BASE_URL,
        viewport: item.viewport,
        storageState: item.public ? undefined : STORAGE_STATE
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push({ label: item.label, type: 'pageerror', message: error.message }));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push({ label: item.label, type: 'console', message: message.text() });
      });
      results.push(await collectRoute(page, item.route, item.label, item.viewport));
      await context.close();
    }
  } finally {
    await browser.close();
    await cleanupLocalSession();
  }

  const report = { generatedAt: new Date().toISOString(), baseURL: BASE_URL, errors, results };
  const reportPath = path.join(OUT_DIR, 'report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  for (const result of results) {
    const m = result.metrics;
    console.log(`${result.label}: status=${result.status} overflow=${m.hasVerticalOverflow} inner=${m.innerWidth}x${m.innerHeight} doc=${m.documentScrollHeight} body=${m.bodyScrollHeight} bodyOverflowY=${m.bodyOverflowY} dialog=${m.hasDialog}`);
    console.log(`  screenshot=${result.screenshotPath}`);
    if (m.scrollContainers.length) {
      console.log(`  inner-scroll=${m.scrollContainers.map((s) => `${String(s.selector).slice(0, 36)}:${s.clientHeight}/${s.scrollHeight}:${s.overflowY}`).join(' | ')}`);
    }
  }

  if (errors.length) {
    console.log(`errors=${errors.length}`);
    for (const error of errors) console.log(`  [${error.label}] ${error.type}: ${error.message}`);
  }
  console.log(`report=${reportPath}`);
}

main().catch(async (error) => {
  await cleanupLocalSession().catch(() => {});
  console.error(error);
  process.exit(1);
});
