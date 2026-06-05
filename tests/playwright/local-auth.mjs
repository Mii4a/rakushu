import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@libsql/client/http";

import { buildSignedCookie, cookieDomainFromBaseURL, cookieNameFromBaseURL, loadEnvFile } from "./session-auth-helpers.mjs";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const META_PATH = path.join(ROOT, "playwright/.auth/local-session-meta.json");
const STORAGE_STATE_PATH = path.join(ROOT, "playwright/.auth/local-user.json");
const LOCAL_BASE_URL = process.env.PLAYWRIGHT_LOCAL_BASE_URL ?? "http://127.0.0.1:3000";
const LOCAL_EMAIL = process.env.PLAYWRIGHT_LOCAL_EMAIL ?? null;

async function loadLocalEnv() {
  return loadEnvFile(ENV_PATH, ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "BETTER_AUTH_SECRET"]);
}

export async function createLocalSession() {
  const env = await loadLocalEnv();
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  });

  try {
    const userResult = LOCAL_EMAIL
      ? await client.execute({
          sql: "select id, email from user where email = ? limit 1",
          args: [LOCAL_EMAIL]
        })
      : await client.execute({
          sql: `select u.id, u.email
                from user u
                where exists (select 1 from jobs j where j.user_id = u.id)
                order by u.created_at asc
                limit 1`,
          args: []
        });
    const row = userResult.rows[0];
    if (!row) {
      throw new Error(LOCAL_EMAIL ? `No local user found for PLAYWRIGHT_LOCAL_EMAIL=${LOCAL_EMAIL}` : "No local user with at least one job found for Playwright auth");
    }

    const sessionId = randomUUID();
    const token = `${randomUUID()}${randomBytes(16).toString("hex")}`;
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 2;

    await client.execute({
      sql: `insert into session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
            values (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [sessionId, expiresAt, token, now, now, "127.0.0.1", "playwright-local-smoke", row.id]
    });

    const jobResult = await client.execute({
      sql: "select id from jobs where user_id = ? order by created_at asc limit 1",
      args: [row.id]
    });
    const firstJobId = jobResult.rows[0]?.id ?? null;
    if (!firstJobId) {
      throw new Error(`User ${row.email} does not have a saved job; /jobs/[id] smoke needs at least one job fixture`);
    }

    const cookie = {
      name: cookieNameFromBaseURL(LOCAL_BASE_URL),
      value: buildSignedCookie(token, env.BETTER_AUTH_SECRET),
      domain: cookieDomainFromBaseURL(LOCAL_BASE_URL),
      path: "/",
      httpOnly: true,
      secure: LOCAL_BASE_URL.startsWith("https://"),
      sameSite: "Lax",
      expires: Math.floor(expiresAt / 1000)
    };

    await mkdir(path.dirname(META_PATH), { recursive: true });
    await writeFile(META_PATH, JSON.stringify({ sessionId, token, userId: row.id, email: row.email, firstJobId }, null, 2));
    await writeFile(STORAGE_STATE_PATH, JSON.stringify({ cookies: [cookie], origins: [] }, null, 2));
    return { sessionId, token, storageStatePath: STORAGE_STATE_PATH, firstJobId };
  } finally {
    client.close();
  }
}

export async function cleanupLocalSession() {
  const env = await loadLocalEnv();
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
