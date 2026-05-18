import { z } from "zod";

import { isProductionBuildPhase } from "@/lib/env/build-phase";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY: z.string().optional()
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? (isProductionBuildPhase() ? "http://localhost:3000" : undefined),
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY
});
