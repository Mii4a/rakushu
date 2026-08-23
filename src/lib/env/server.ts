import { z } from "zod";

import { isProductionBuildPhase } from "@/lib/env/build-phase";

const nonBlankTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, "Required");

const routingModeSchema = z.enum(["legacy", "standard"]);

const fxYenPerUsdMilliSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => /^\d+$/.test(value), "Must contain only digits")
  .refine((value) => Number.isSafeInteger(Number(value)), "Must be a safe integer")
  .refine((value) => Number(value) > 0, "Must be positive");

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
  OPENAI_LIGHT_MODEL: z.string().default("gpt-4.1-nano"),
  OPENAI_INTERVIEW_FOLLOWUP_MODEL: nonBlankTrimmedString.default("gpt-5.6-luna"),
  OPENAI_INTERVIEW_FEEDBACK_MODEL: nonBlankTrimmedString.default("gpt-5.4-mini"),
  OPENAI_RESUME_MODEL: nonBlankTrimmedString.default("gpt-5.4-mini"),
  OPENAI_COMPANY_RESEARCH_MODEL: nonBlankTrimmedString.default("gpt-5.4-mini"),
  OPENAI_ESCALATION_MODEL: nonBlankTrimmedString.default("gpt-5.6-terra"),
  OPENAI_MODEL_ROUTING_MODE: routingModeSchema.default("legacy"),
  FX_YEN_PER_USD_MILLI: fxYenPerUsdMilliSchema.default("150000"),
  INTERNAL_TOOL_EMAILS: z.string().default(""),
  INTERNAL_ADMIN_EMAILS: z.string().default(""),
  AI_INTERVIEW_TRANSCRIBER_URL: z.string().url().optional(),
  AI_INTERVIEW_TRANSCRIBER_SECRET: z.string().optional(),
  AI_INTERVIEW_CALLBACK_SECRET: z.string().optional(),
  AI_INTERVIEW_RECORDING_POLICY_VERSION: z.string().default("2026-06-15")
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

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

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(input);
}

const serverEnvInput = isProductionBuildPhase() || process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  ? {
      ...runtimeEnvInput,
      ...Object.fromEntries(
        Object.entries(buildPhaseFallbacks).map(([key, value]) => [key, process.env[key] ?? value])
      )
    }
  : runtimeEnvInput;

export const serverEnv = parseServerEnv(serverEnvInput);
