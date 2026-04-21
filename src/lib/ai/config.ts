import { z } from "zod";

import { serverEnv } from "@/lib/env/server";

export const aiModelConfigSchema = z.object({
  mainModel: z.string().min(1),
  lightModel: z.string().min(1)
});

export const aiModelConfig = aiModelConfigSchema.parse({
  mainModel: serverEnv.OPENAI_MAIN_MODEL,
  lightModel: serverEnv.OPENAI_LIGHT_MODEL
});

export type AiStructuredOutputResult<T> = {
  model: string;
  data: T;
};
