import { z } from "zod";

import { isProductionBuildPhase } from "@/lib/env/build-phase";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PLUS: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_ALLOW_PROMOTION_CODES: z.enum(["true", "false"]).default("true"),
  STRIPE_CAMPAIGN_PROMOTION_CODE_ID: z.string().optional(),
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MAIN_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_LIGHT_MODEL: z.string().default("gpt-4.1-nano")
});

const runtimeEnvInput = {
  ...process.env,
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID_SECRET,
  STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER ?? process.env.STRIPE_PRICE_STARTER_SECRET,
  STRIPE_PRICE_PLUS: process.env.STRIPE_PRICE_PLUS ?? process.env.STRIPE_PRICE_PLUS_SECRET,
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_PRO_SECRET,
  STRIPE_CAMPAIGN_PROMOTION_CODE_ID:
    process.env.STRIPE_CAMPAIGN_PROMOTION_CODE_ID ?? process.env.STRIPE_CAMPAIGN_PROMOTION_CODE_ID_SECRET,
  GOOGLE_MAPS_SERVER_API_KEY: process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY
};

const buildPhaseFallbacks = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "build-placeholder-secret-build-placeholder-secret",
  TURSO_DATABASE_URL: "libsql://build-placeholder.turso.io",
  TURSO_AUTH_TOKEN: "build-placeholder-token",
  GOOGLE_CLIENT_ID: "build-placeholder-google-client-id",
  GOOGLE_CLIENT_SECRET: "build-placeholder-google-client-secret"
} as const;

const serverEnvInput = isProductionBuildPhase()
  ? {
      ...runtimeEnvInput,
      ...Object.fromEntries(
        Object.entries(buildPhaseFallbacks).map(([key, value]) => [key, process.env[key] ?? value])
      )
    }
  : runtimeEnvInput;

export const serverEnv = serverEnvSchema.parse(serverEnvInput);
