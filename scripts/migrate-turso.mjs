import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DATABASE_URL is required");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required");

const client = createClient({ url, authToken });

await client.execute(`
  CREATE TABLE IF NOT EXISTS __rakushu_migrations (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`);

const files = readdirSync("drizzle").filter((n) => n.endsWith(".sql")).sort();

for (const file of files) {
  const already = await client.execute({
    sql: "SELECT id FROM __rakushu_migrations WHERE id = ? LIMIT 1",
    args: [file],
  });

  if (already.rows.length > 0) {
    console.log(`skip: ${file}`);
    continue;
  }

  const sql = readFileSync(join("drizzle", file), "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`apply: ${file} (${statements.length} statements)`);
  for (const statement of statements) await client.execute(statement);

  await client.execute({
    sql: "INSERT INTO __rakushu_migrations (id, applied_at) VALUES (?, ?)",
    args: [file, Date.now()],
  });
}

console.log("migration complete");
