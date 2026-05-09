import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

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
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.set(key, value);
  }

  return entries;
}

function withAliases(env) {
  return {
    ...env,
    TURSO_DATABASE_URL_SECRET: env.TURSO_DATABASE_URL_SECRET ?? env.TURSO_DATABASE_URL,
    STRIPE_PRICE_STARTER_SECRET: env.STRIPE_PRICE_STARTER_SECRET ?? env.STRIPE_PRICE_STARTER,
    STRIPE_PRICE_PLUS_SECRET: env.STRIPE_PRICE_PLUS_SECRET ?? env.STRIPE_PRICE_PLUS,
    STRIPE_PRICE_PRO_SECRET: env.STRIPE_PRICE_PRO_SECRET ?? env.STRIPE_PRICE_PRO
  };
}

async function run(command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const envPath = process.argv[2] ?? ".env.production";
  const mode = process.argv[3] ?? "deploy";

  if (mode !== "deploy" && mode !== "preview") {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const fileEnv = Object.fromEntries(parseEnvFile(envPath));
  const mergedEnv = withAliases({
    ...process.env,
    ...fileEnv
  });

  await run("opennextjs-cloudflare", ["build"], mergedEnv);
  await run("opennextjs-cloudflare", [mode], mergedEnv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
