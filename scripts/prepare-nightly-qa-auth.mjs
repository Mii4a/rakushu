import { createClient } from "@libsql/client";
import crypto from "node:crypto";

const SESSION_USER_AGENT = "rakushu-nightly-qa";
const SESSION_IP_ADDRESS = "127.0.0.1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildCookieName(baseUrl) {
  return baseUrl.startsWith("https://") ? "__Secure-better-auth.session_token" : "better-auth.session_token";
}

function signCookieValue(token, secret) {
  const signature = crypto.createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}

async function tableExists(client, tableName) {
  const rows = await client.execute({
    sql: "select 1 as present from sqlite_master where type = 'table' and name = ? limit 1",
    args: [tableName]
  });
  return rows.rows.length > 0;
}

async function countRowsForUserIfTableExists(client, tableName, userId) {
  if (!(await tableExists(client, tableName))) {
    return null;
  }

  const rows = await client.execute({
    sql: `select count(*) as count from ${tableName} where user_id = ?`,
    args: [userId]
  });

  return Number(rows.rows[0]?.count ?? 0);
}

async function main() {
  const baseUrl = process.env.RAKUSHU_QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const explicitQaUserEmail = process.env.RAKUSHU_QA_USER_EMAIL;
  const tursoUrl = requiredEnv("TURSO_DATABASE_URL");
  const tursoAuthToken = requiredEnv("TURSO_AUTH_TOKEN");
  const betterAuthSecret = requiredEnv("BETTER_AUTH_SECRET");

  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken
  });

  const result = {
    status: "ok",
    baseUrl: baseUrl || null,
    qaUserEmail: explicitQaUserEmail || null,
    qaUserSelection: explicitQaUserEmail ? "env" : null,
    auth: null,
    fixtures: {},
    blockedReasons: []
  };

  if (!baseUrl) {
    result.status = "blocked";
    result.blockedReasons.push("missing-base-url");
  }

  if (!explicitQaUserEmail) {
    const userCountRows = await client.execute("select count(*) as count from user");
    const userCount = Number(userCountRows.rows[0]?.count ?? 0);

    if (userCount === 1) {
      const onlyUserRows = await client.execute("select email from user limit 1");
      const inferredQaUserEmail = String(onlyUserRows.rows[0]?.email ?? "");
      if (inferredQaUserEmail) {
        result.qaUserEmail = inferredQaUserEmail;
        result.qaUserSelection = "auto-single-user";
      }
    }
  }

  if (!result.qaUserEmail) {
    result.status = "blocked";
    result.blockedReasons.push("missing-qa-user-email");
  }

  if (result.status === "blocked") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const userRows = await client.execute({
    sql: "select id, email from user where email = ? limit 1",
    args: [result.qaUserEmail]
  });

  const user = userRows.rows[0];
  if (!user) {
    result.status = "blocked";
    result.blockedReasons.push("qa-user-not-found");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const [jobs, criteria, commuteProfiles, resumeProfiles] = await Promise.all([
    countRowsForUserIfTableExists(client, "jobs", user.id),
    countRowsForUserIfTableExists(client, "criteria_templates", user.id),
    countRowsForUserIfTableExists(client, "user_commute_profiles", user.id),
    countRowsForUserIfTableExists(client, "resume_profiles", user.id)
  ]);

  result.fixtures = {
    jobs,
    criteria,
    commuteProfiles,
    resumeProfiles
  };

  if ((jobs ?? 0) < 1) {
    result.status = "blocked";
    result.blockedReasons.push("missing-job-fixture-data");
  }

  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  const cookieName = buildCookieName(baseUrl);
  const cookieValue = signCookieValue(sessionToken, betterAuthSecret);
  const cookieParts = [
    `${cookieName}=${encodeURIComponent(cookieValue)}`,
    "Path=/",
    "SameSite=Lax"
  ];

  if (baseUrl.startsWith("https://")) {
    cookieParts.push("Secure");
  }

  result.auth = {
    cookieName,
    cookieValue,
    cookieHeader: `${cookieName}=${cookieValue}`,
    injectScript: `document.cookie = ${JSON.stringify(cookieParts.join("; "))};`,
    sessionExpiresAtIso: new Date(expiresAt).toISOString(),
    sessionUserAgent: SESSION_USER_AGENT
  };

  if (result.status === "blocked") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  await client.batch(
    [
      {
        sql: "delete from session where user_id = ? and user_agent = ?",
        args: [user.id, SESSION_USER_AGENT]
      },
      {
        sql: "insert into session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id) values (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [sessionId, expiresAt, sessionToken, now, now, SESSION_IP_ADDRESS, SESSION_USER_AGENT, user.id]
      }
    ],
    "write"
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
