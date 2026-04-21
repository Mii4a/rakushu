import { z } from "zod";

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
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MAIN_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_LIGHT_MODEL: z.string().default("gpt-4.1-nano")
});

export const serverEnv = serverEnvSchema.parse(process.env);
