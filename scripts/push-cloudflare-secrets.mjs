import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const SECRET_KEYS = [
  "BETTER_AUTH_SECRET",
  "TURSO_AUTH_TOKEN",
  "GOOGLE_CLIENT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY"
];

function parseEnvFile(path) {
  const raw = readFileSync(path, "utf8");
  const entries = new Map();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.set(key, value);
  }

  return entries;
}

async function putSecret(key, value) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["wrangler", "secret", "put", key, "--config", "wrangler.jsonc"],
      {
        stdio: ["pipe", "inherit", "inherit"]
      }
    );

    child.stdin.write(value);
    child.stdin.end();

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`wrangler secret put failed for ${key} with exit code ${code}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const envPath = process.argv[2] ?? ".env.production";
  const env = parseEnvFile(envPath);

  const missing = SECRET_KEYS.filter((key) => {
    const value = env.get(key);
    return !value || value.startsWith("replace-with") || value.startsWith("sk-replace") || value.startsWith("whsec_replace");
  });

  if (missing.length > 0) {
    throw new Error(`Missing or placeholder secret values in ${envPath}: ${missing.join(", ")}`);
  }

  for (const key of SECRET_KEYS) {
    console.log(`Uploading secret: ${key}`);
    await putSecret(key, env.get(key));
  }

  console.log("Cloudflare secret upload complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
