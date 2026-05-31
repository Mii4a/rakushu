import { createClient } from "@libsql/client";
import { readdirSync } from "node:fs";

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
const rows = await client.execute("SELECT id FROM __rakushu_migrations");
const applied = new Set(rows.rows.map((row) => String(row.id)));
const pending = files.filter((file) => !applied.has(file));

console.log(`expected migrations: ${files.length}`);
console.log(`applied migrations: ${applied.size}`);

if (pending.length > 0) {
  console.log("pending migrations:");
  for (const file of pending) {
    console.log(`- ${file}`);
  }
  process.exitCode = 1;
} else {
  console.log("pending migrations: none");
}

await client.close();
