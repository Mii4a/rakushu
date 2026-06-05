import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

export function parseDotEnv(src) {
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

export async function loadEnvFile(envPath, requiredKeys) {
  const raw = await readFile(envPath, "utf8");
  const env = parseDotEnv(raw);
  for (const key of requiredKeys) {
    if (!env[key]) {
      throw new Error(`Missing ${key} in ${envPath}`);
    }
  }
  return env;
}

export function buildSignedCookie(token, secret) {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}

export function cookieNameFromBaseURL(baseURL) {
  const isSecure = baseURL.startsWith("https://");
  return `${isSecure ? "__Secure-" : ""}better-auth.session_token`;
}

export function cookieDomainFromBaseURL(baseURL) {
  return new URL(baseURL).hostname;
}
