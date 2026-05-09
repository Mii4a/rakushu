import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const REQUIRED_SECRET_KEYS = [
  { envKey: "BETTER_AUTH_SECRET", bindingKey: "BETTER_AUTH_SECRET" },
  { envKey: "TURSO_DATABASE_URL", bindingKey: "TURSO_DATABASE_URL_SECRET" },
  { envKey: "TURSO_AUTH_TOKEN", bindingKey: "TURSO_AUTH_TOKEN" },
  { envKey: "GOOGLE_CLIENT_ID", bindingKey: "GOOGLE_CLIENT_ID" },
  { envKey: "GOOGLE_CLIENT_SECRET", bindingKey: "GOOGLE_CLIENT_SECRET" },
  { envKey: "STRIPE_PRICE_STARTER", bindingKey: "STRIPE_PRICE_STARTER_SECRET" },
  { envKey: "STRIPE_PRICE_PLUS", bindingKey: "STRIPE_PRICE_PLUS_SECRET" },
  { envKey: "STRIPE_PRICE_PRO", bindingKey: "STRIPE_PRICE_PRO_SECRET" },
  { envKey: "STRIPE_SECRET_KEY", bindingKey: "STRIPE_SECRET_KEY" },
  { envKey: "STRIPE_WEBHOOK_SECRET", bindingKey: "STRIPE_WEBHOOK_SECRET" },
  { envKey: "OPENAI_API_KEY", bindingKey: "OPENAI_API_KEY" }
];

const OPTIONAL_SECRET_KEYS = [
  { envKey: "STRIPE_CAMPAIGN_PROMOTION_CODE_ID", bindingKey: "STRIPE_CAMPAIGN_PROMOTION_CODE_ID_SECRET" }
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
      ["wrangler", "versions", "secret", "put", key, "--config", "wrangler.jsonc"],
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

  const missing = REQUIRED_SECRET_KEYS.filter(({ envKey }) => {
    const value = env.get(envKey);
    return !value || value.startsWith("replace-with") || value.startsWith("sk-replace") || value.startsWith("whsec_replace");
  }).map(({ envKey }) => envKey);

  if (missing.length > 0) {
    throw new Error(`Missing or placeholder secret values in ${envPath}: ${missing.join(", ")}`);
  }

  for (const { envKey, bindingKey } of REQUIRED_SECRET_KEYS) {
    console.log(`Uploading secret: ${bindingKey}`);
    await putSecret(bindingKey, env.get(envKey));
  }

  for (const { envKey, bindingKey } of OPTIONAL_SECRET_KEYS) {
    const value = env.get(envKey);

    if (!value) {
      console.log(`Skipping empty optional secret: ${bindingKey}`);
      continue;
    }

    console.log(`Uploading optional secret: ${bindingKey}`);
    await putSecret(bindingKey, value);
  }

  console.log("Cloudflare secret upload complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
