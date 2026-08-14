import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const repoRoot = '/home/openclaw/rakushu';
const manifest = JSON.parse(await fs.readFile(`${repoRoot}/docs/qa/nightly-page-transition-edges.json`, 'utf8'));
const helperPath = process.argv[2] ?? '/tmp/rakushu-nightly-page-transition-helper.json';
const helper = JSON.parse(await fs.readFile(helperPath, 'utf8'));
const baseUrl = helper.baseUrl;

function pathFromUrl(urlString) {
  const url = new URL(urlString);
  return `${url.pathname}${url.search}`;
}

function sameOriginUrl(pathOrUrl) {
  return new URL(pathOrUrl, baseUrl).toString();
}

async function findVisibleTextTarget(page, text, occurrence = 1) {
  const visible = [];
  for (const locator of [page.getByText(text, { exact: true }), page.getByText(text)]) {
    const count = await locator.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = locator.nth(i);
      if (await candidate.isVisible().catch(() => false)) {
        visible.push(candidate);
      }
    }
    if (visible.length >= occurrence) {
      return visible[occurrence - 1];
    }
  }
  return null;
}

async function executeEdge(browser, edge) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`console:${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror:${err.message}`);
  });

  let note = '';
  let status = 'pass';
  let actualUrl = '';

  try {
    await page.goto(sameOriginUrl(edge.from), { waitUntil: 'networkidle', timeout: 30000 });

    const action = edge.action?.kind ?? 'navigate-only';
    if (action === 'click-text') {
      const occurrence = edge.action?.occurrence ?? 1;
      let target = await findVisibleTextTarget(page, edge.action.target, occurrence);
      if (!target) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);
        target = await findVisibleTextTarget(page, edge.action.target, occurrence);
      }
      if (!target) {
        throw new Error(`visible text target not found: ${edge.action.target}`);
      }
      await target.scrollIntoViewIfNeeded();
      await target.click({ timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    }

    actualUrl = page.url();
    const actualPath = pathFromUrl(actualUrl);
    const bodyText = await page.locator('body').innerText().catch(() => '');

    if (bodyText.includes('Application error') || bodyText.includes('Digest:')) {
      status = 'fail';
      note = 'application-error';
    }

    if (status === 'pass') {
      const assertion = edge.assert ?? {};
      const urlProblems = [];
      if (assertion.urlIncludes && !actualPath.includes(assertion.urlIncludes)) {
        urlProblems.push(`expected url to include ${assertion.urlIncludes} but got ${actualPath}`);
      }
      if (assertion.urlMatches && !(new RegExp(assertion.urlMatches).test(actualPath))) {
        urlProblems.push(`expected url to match ${assertion.urlMatches} but got ${actualPath}`);
      }
      if (assertion.redirectAllowed) {
        const allowed = [edge.to, ...assertion.redirectAllowed];
        const matchesAllowed = allowed.some((candidate) => actualPath === candidate || actualPath.startsWith(`${candidate}?`));
        if (!matchesAllowed) {
          urlProblems.push(`expected redirect to one of ${allowed.join(', ')} but got ${actualPath}`);
        }
      }
      if (urlProblems.length) {
        status = 'fail';
        note = urlProblems.join('; ');
      }

      if (status === 'pass' && assertion.pageText?.length) {
        const anyMarkerPresent = assertion.pageText.some((text) => bodyText.includes(text));
        const missingMarkers = assertion.pageText.filter((text) => !bodyText.includes(text));
        if (assertion.redirectAllowed) {
          if (!anyMarkerPresent) {
            status = 'fail';
            note = `missing page markers (${assertion.pageText.join(', ')})`;
          }
        } else if (missingMarkers.length > 0) {
          status = 'fail';
          note = `missing page markers (${missingMarkers.join(', ')})`;
        }
      }
    }
  } catch (error) {
    status = 'fail';
    note = error instanceof Error ? error.message : String(error);
    actualUrl = page.url() || sameOriginUrl(edge.from);
  }

  await context.close();
  return {
    id: edge.id,
    status,
    from: edge.from,
    to: edge.to,
    actualUrl,
    consoleErrors,
    note,
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const edge of manifest.edges) {
    if (edge.auth === 'required') {
      results.push({
        id: edge.id,
        status: helper.status === 'blocked' ? 'blocked' : 'fail',
        from: edge.from,
        to: edge.to,
        actualUrl: sameOriginUrl(edge.from),
        consoleErrors: [],
        note: helper.status === 'blocked' ? helper.blockedReasons.join(', ') : `helper-status-${helper.status}`,
      });
      continue;
    }
    results.push(await executeEdge(browser, edge));
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ baseUrl, helperStatus: helper.status, results }, null, 2));
