import { z } from "zod";

import { isProductionBuildPhase } from "@/lib/env/build-phase";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url()
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? (isProductionBuildPhase() ? "http://localhost:3000" : undefined)
});
