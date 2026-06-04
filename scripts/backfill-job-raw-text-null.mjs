import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DATABASE_URL is required");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required");

const apply = process.argv.includes("--apply");
const client = createClient({ url, authToken });

async function countRows() {
  const result = await client.execute(`
    SELECT
      COUNT(*) AS total_jobs,
      SUM(CASE WHEN raw_text IS NOT NULL AND TRIM(raw_text) <> '' THEN 1 ELSE 0 END) AS raw_text_non_null,
      SUM(CASE WHEN raw_text IS NULL OR TRIM(raw_text) = '' THEN 1 ELSE 0 END) AS raw_text_null_or_empty
    FROM jobs
  `);

  const row = result.rows[0] ?? {};
  return {
    totalJobs: Number(row.total_jobs ?? 0),
    rawTextNonNull: Number(row.raw_text_non_null ?? 0),
    rawTextNullOrEmpty: Number(row.raw_text_null_or_empty ?? 0)
  };
}

async function main() {
  const before = await countRows();

  let updatedRows = 0;
  if (apply && before.rawTextNonNull > 0) {
    const update = await client.execute("UPDATE jobs SET raw_text = NULL WHERE raw_text IS NOT NULL AND TRIM(raw_text) <> ''");
    updatedRows = Number(update.rowsAffected ?? 0);
  }

  const after = apply ? await countRows() : before;

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry_run",
    before,
    updatedRows,
    after,
    note: "jobs.raw_text stores third-party job text and should be removed from persisted rows."
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });
