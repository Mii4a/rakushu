import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'docs/qa/nightly-page-transition-edges.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const helper = runHelper();

const result = {
  baseUrl: helper.baseUrl || process.env[manifest.baseUrlEnv] || null,
  total_edges: manifest.edges.length,
  passed: 0,
  failed: 0,
  blocked: 0,
  edges: [],
};

if (helper.status === 'error') {
  console.log(JSON.stringify({ type: 'setup-failure', helper }, null, 2));
  process.exit(2);
}

const publicEdges = manifest.edges.filter((edge) => edge.auth === 'public');
const requiredEdges = manifest.edges.filter((edge) => edge.auth === 'required');
const unauthOnlyEdges = manifest.edges.filter((edge) => edge.auth === 'unauth-only');

const publicBrowser = await launchChrome('public');
try {
  for (const edge of publicEdges) {
    result.edges.push(await executeEdge(edge, { baseUrl: result.baseUrl, browser: publicBrowser }));
  }
  for (const edge of unauthOnlyEdges) {
    result.edges.push(await executeEdge(edge, { baseUrl: result.baseUrl, browser: publicBrowser, forceNoAuth: true }));
  }
} finally {
  await publicBrowser.close();
}

if (helper.status === 'blocked') {
  for (const edge of requiredEdges) {
    result.edges.push(blockedEdge(edge, helper.blockedReasons?.join('; ') || 'auth-blocked'));
  }
} else if (helper.status === 'ok') {
  const authBrowser = await launchChrome('auth');
  try {
    for (const edge of requiredEdges) {
      if (hasMissingFixture(edge, helper.fixtures)) {
        result.edges.push(blockedEdge(edge, 'missing-fixture-data'));
        continue;
      }
      result.edges.push(await executeEdge(edge, {
        baseUrl: result.baseUrl,
        browser: authBrowser,
        authScript: helper.auth?.injectScript,
      }));
    }
  } finally {
    await authBrowser.close();
  }
}

for (const edge of result.edges) {
  if (edge.status === 'pass') result.passed += 1;
  if (edge.status === 'fail') result.failed += 1;
  if (edge.status === 'blocked') result.blocked += 1;
}

console.log(JSON.stringify(result, null, 2));

function runHelper() {
  const helperRun = spawnSync('node', ['--env-file=.env.production', 'scripts/prepare-nightly-qa-auth.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (helperRun.status !== 0) {
    return {
      status: 'error',
      baseUrl: process.env[manifest.baseUrlEnv] || null,
      blockedReasons: [`helper-exit-${helperRun.status}`, helperRun.stderr?.trim()].filter(Boolean),
    };
  }
  return JSON.parse(helperRun.stdout);
}

function blockedEdge(edge, note) {
  return {
    id: edge.id,
    status: 'blocked',
    from: edge.from,
    to: edge.to,
    actualUrl: null,
    consoleErrors: [],
    note,
  };
}

function hasMissingFixture(edge, fixtures = {}) {
  if (!edge.dataDependency) return false;
  const { type, minimumCount = 1 } = edge.dataDependency;
  const value = fixtures[`${type}s`] ?? fixtures[type] ?? 0;
  return !(typeof value === 'number' && value >= minimumCount);
}

async function launchChrome(label) {
  const chromePath = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
  const winUserDir = toWindowsPath(path.join(os.tmpdir(), `rakushu-nightly-${label}-${Date.now()}`));
  const port = await getFreePort();
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${winUserDir}`,
    'about:blank',
  ];
  const proc = spawn(chromePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  proc.stdout.on('data', () => {});

  const version = await waitForVersion(port, 15000).catch((error) => {
    proc.kill();
    throw new Error(`chrome-start-failed: ${error.message}${stderr ? ` :: ${stderr}` : ''}`);
  });

  return {
    port,
    proc,
    browserWsUrl: version.webSocketDebuggerUrl,
    async newPage() {
      const targetInfo = await httpJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      const client = new CDPPage(targetInfo.webSocketDebuggerUrl);
      await client.connect();
      return client;
    },
    async close() {
      try {
        proc.kill();
      } catch {}
    },
  };
}

function toWindowsPath(inputPath) {
  const run = spawnSync('wslpath', ['-w', inputPath], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`wslpath-failed: ${run.stderr}`);
  return run.stdout.trim();
}

async function waitForVersion(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      return await httpJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await delay(250);
    }
  }
  throw new Error('timed-out-waiting-for-chrome-debug-port');
}

async function httpJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`http-${response.status}`);
  return await response.json();
}

async function executeEdge(edge, { baseUrl, browser, authScript, forceNoAuth = false }) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.onConsoleError = (entry) => consoleErrors.push(entry);

  let actualUrl = null;
  try {
    if (authScript && !forceNoAuth) {
      await page.navigate(joinUrl(baseUrl, '/login'));
      await page.evaluate(authScript);
    }

    await page.navigate(joinUrl(baseUrl, edge.from));
    actualUrl = await page.url();

    if (authScript && !forceNoAuth && new URL(actualUrl).pathname === '/login') {
      return {
        id: edge.id,
        status: 'blocked',
        from: edge.from,
        to: edge.to,
        actualUrl,
        consoleErrors,
        note: 'auth-cookie-rejected',
      };
    }

    if (edge.action?.kind === 'click-text') {
      const clicked = await page.clickText(edge.action.target, edge.action.occurrence || 1);
      if (!clicked.ok) {
        const bodyText = await page.bodyText();
        return {
          id: edge.id,
          status: 'fail',
          from: edge.from,
          to: edge.to,
          actualUrl: await page.url(),
          consoleErrors,
          note: `click-failed:${clicked.reason}${bodyText ? ` :: ${truncate(bodyText, 160)}` : ''}`,
        };
      }
      await page.waitForSettledNavigation();
    } else {
      await page.waitForSettledNavigation();
    }

    actualUrl = await page.url();
    const bodyText = await page.bodyText();
    const verdict = verifyEdge(edge, actualUrl, bodyText, consoleErrors);
    return {
      id: edge.id,
      status: verdict.status,
      from: edge.from,
      to: edge.to,
      actualUrl,
      consoleErrors,
      note: verdict.note,
    };
  } catch (error) {
    return {
      id: edge.id,
      status: 'fail',
      from: edge.from,
      to: edge.to,
      actualUrl,
      consoleErrors,
      note: `exception:${error.message}`,
    };
  } finally {
    await page.close();
  }
}

function verifyEdge(edge, actualUrl, bodyText, consoleErrors) {
  const pathname = new URL(actualUrl).pathname;
  if (bodyText.includes('Application error') || bodyText.includes('Digest:')) {
    return { status: 'fail', note: 'application-error-surface' };
  }

  const assert = edge.assert || {};
  if (assert.urlIncludes && !actualUrl.includes(assert.urlIncludes)) {
    return { status: 'fail', note: `url-mismatch:${pathname}` };
  }
  if (assert.urlMatches) {
    const re = new RegExp(assert.urlMatches);
    if (!re.test(pathname)) {
      return { status: 'fail', note: `url-mismatch:${pathname}` };
    }
  }
  if (assert.redirectAllowed) {
    const allowed = [edge.to, ...assert.redirectAllowed];
    if (!allowed.includes(pathname)) {
      return { status: 'fail', note: `redirect-mismatch:${pathname}` };
    }
  }
  if (Array.isArray(assert.pageText) && assert.pageText.length > 0) {
    const matched = assert.pageText.some((text) => bodyText.includes(text));
    if (!matched) {
      return { status: 'fail', note: `missing-page-marker:${assert.pageText.join('|')}` };
    }
  }
  if (consoleErrors.length > 0) {
    return { status: 'fail', note: `console-error:${truncate(consoleErrors[0], 120)}` };
  }
  return { status: 'pass', note: 'ok' };
}

function joinUrl(baseUrl, route) {
  return new URL(route, baseUrl).toString();
}

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function once(emitter, event) {
  return new Promise((resolve) => emitter.once(event, resolve));
}

async function getFreePort() {
  const net = await import('node:net');
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : null;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on('error', reject);
  });
}

class CDPPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.pending = new Map();
    this.loadEventPromise = null;
    this.onConsoleError = null;
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await once(this.ws, 'open');
    this.ws.on('message', (raw) => this.handleMessage(raw));
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('DOM.enable');
    await this.send('Page.setLifecycleEventsEnabled', { enabled: true });
    await this.send('Target.setAutoAttach', { autoAttach: false, waitForDebuggerOnStart: false, flatten: true }).catch(() => {});
  }

  handleMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || 'cdp-error'));
      else pending.resolve(message.result);
      return;
    }

    if (message.method === 'Page.loadEventFired' && this.loadEventPromise) {
      this.loadEventPromise.resolve();
      this.loadEventPromise = null;
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const type = message.params?.type;
      if (type === 'error' && this.onConsoleError) {
        const args = (message.params.args || []).map((arg) => arg.value ?? arg.description ?? '').filter(Boolean);
        this.onConsoleError(args.join(' '));
      }
    }
    if (message.method === 'Runtime.exceptionThrown' && this.onConsoleError) {
      const text = message.params?.exceptionDetails?.text || 'runtime-exception';
      this.onConsoleError(text);
    }
    if (message.method === 'Log.entryAdded' && this.onConsoleError) {
      const entry = message.params?.entry;
      if (entry?.level === 'error') this.onConsoleError(entry.text || 'log-error');
    }
  }

  send(method, params = {}) {
    const id = ++this.id;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  async navigate(url) {
    this.loadEventPromise = {};
    this.loadEventPromise.promise = new Promise((resolve) => {
      this.loadEventPromise.resolve = resolve;
    });
    await this.send('Page.navigate', { url });
    await Promise.race([this.loadEventPromise.promise, delay(10000)]);
    await delay(1200);
  }

  async waitForSettledNavigation() {
    await delay(1500);
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'evaluate-failed');
    return result.result?.value;
  }

  async clickText(target, occurrence) {
    const script = `(() => {
      const target = ${JSON.stringify(target)};
      const occurrence = ${JSON.stringify(occurrence)};
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const norm = (text) => (text || '').replace(/\s+/g, ' ').trim();
      const candidates = [];
      const nodes = document.querySelectorAll('a, button, [role="button"], summary, label, span, div, p');
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        const text = norm(el.innerText || el.textContent || '');
        if (!text) continue;
        if (text === target || text.includes(target)) candidates.push(el);
      }
      const el = candidates[Math.max(0, occurrence - 1)];
      if (!el) return { ok: false, reason: 'target-not-found' };
      const clickable = el.closest('a,button,[role="button"],summary,label') || el;
      clickable.click();
      return { ok: true, tag: clickable.tagName, text: norm(clickable.innerText || clickable.textContent || '') };
    })()`;
    return await this.evaluate(script);
  }

  async bodyText() {
    const script = `(() => (document.body ? (document.body.innerText || '') : ''))()`;
    return await this.evaluate(script) || '';
  }

  async url() {
    return await this.evaluate('location.href');
  }

  async close() {
    try {
      await this.send('Page.close');
    } catch {}
    try {
      this.ws.close();
    } catch {}
  }
}
