import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@libsql/client/http";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.production");
const META_PATH = path.join(ROOT, "playwright/.auth/prod-session-meta.json");
const STORAGE_STATE_PATH = path.join(ROOT, "playwright/.auth/prod-user.json");
const PROD_EMAIL = process.env.PLAYWRIGHT_PROD_EMAIL ?? "mii4a2501@gmail.com";
const PROD_BASE_URL = process.env.PLAYWRIGHT_PROD_BASE_URL ?? "https://rakushu.mii4a.workers.dev";

function parseDotEnv(src) {
  const env = {};
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadProdEnv() {
  const raw = await readFile(ENV_PATH, "utf8");
  const env = parseDotEnv(raw);
  const required = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "BETTER_AUTH_SECRET"];
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing ${key} in .env.production`);
    }
  }
  return env;
}

function buildSignedCookie(token, secret) {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}

function cookieNameFromBaseURL(baseURL) {
  const isSecure = baseURL.startsWith("https://");
  return `${isSecure ? "__Secure-" : ""}better-auth.session_token`;
}

function cookieDomainFromBaseURL(baseURL) {
  return new URL(baseURL).hostname;
}

export async function createProdSession() {
  const env = await loadProdEnv();
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  });

  try {
    const userResult = await client.execute({
      sql: "select id, email from user where email = ? limit 1",
      args: [PROD_EMAIL]
    });
    const row = userResult.rows[0];
    if (!row) {
      throw new Error(`User not found for ${PROD_EMAIL}`);
    }

    const sessionId = randomUUID();
    const token = `${randomUUID()}${randomBytes(16).toString("hex")}`;
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 2;

    await client.execute({
      sql: `insert into session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
            values (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [sessionId, expiresAt, token, now, now, "127.0.0.1", "playwright-prod-smoke", row.id]
    });

    const cookie = {
      name: cookieNameFromBaseURL(PROD_BASE_URL),
      value: buildSignedCookie(token, env.BETTER_AUTH_SECRET),
      domain: cookieDomainFromBaseURL(PROD_BASE_URL),
      path: "/",
      httpOnly: true,
      secure: PROD_BASE_URL.startsWith("https://"),
      sameSite: "Lax",
      expires: Math.floor(expiresAt / 1000)
    };

    await mkdir(path.dirname(META_PATH), { recursive: true });
    await writeFile(META_PATH, JSON.stringify({ sessionId, token, userId: row.id, email: row.email }, null, 2));
    await writeFile(STORAGE_STATE_PATH, JSON.stringify({ cookies: [cookie], origins: [] }, null, 2));

    return { sessionId, token, storageStatePath: STORAGE_STATE_PATH };
  } finally {
    client.close();
  }
}

export async function cleanupProdSession() {
  const env = await loadProdEnv();
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  });

  try {
    const metaRaw = await readFile(META_PATH, "utf8").catch(() => null);
    if (!metaRaw) return;
    const meta = JSON.parse(metaRaw);
    if (!meta?.token) return;

    await client.execute({
      sql: "delete from session where token = ?",
      args: [meta.token]
    });
  } finally {
    client.close();
    await rm(META_PATH, { force: true }).catch(() => {});
    await rm(STORAGE_STATE_PATH, { force: true }).catch(() => {});
  }
}
