export type AiActionKey =
  | "interview_follow_up_generate"
  | "interview_category_feedback_generate"
  | "resume_draft_generate"
  | "resume_review_generate"
  | "resume_company_adjust_generate"
  | "company_research_report_generate"
  | "company_research_chat_generate";

export type AiFeatureArea = "ai_interview" | "resume" | "company_research";

export type AiReasoningEffort = "none" | "low";

export type AiModelPolicy = {
  actionKey: AiActionKey;
  featureArea: AiFeatureArea;
  model: string;
  fallbackModel: string | null;
  reasoningEffort: AiReasoningEffort;
  webSearch: boolean;
  maxAttempts: 1 | 2;
};

type EnvLike = Record<string, string | undefined>;

type AiModelPolicyConfig = Omit<AiModelPolicy, "model" | "fallbackModel"> & {
  modelEnvKeys?: string[];
  fallbackModelEnvKey?: string;
  defaultModel: string;
  defaultFallbackModel?: string;
};

const POLICY_BY_ACTION: Record<AiActionKey, AiModelPolicyConfig> = {
  interview_follow_up_generate: {
    actionKey: "interview_follow_up_generate",
    featureArea: "ai_interview",
    modelEnvKeys: ["OPENAI_INTERVIEW_FOLLOWUP_MODEL"],
    defaultModel: "gpt-5.6-luna",
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1,
  },
  interview_category_feedback_generate: {
    actionKey: "interview_category_feedback_generate",
    featureArea: "ai_interview",
    modelEnvKeys: ["OPENAI_INTERVIEW_FEEDBACK_MODEL", "OPENAI_LIGHT_MODEL"],
    defaultModel: "gpt-5.4-mini",
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1,
  },
  resume_draft_generate: {
    actionKey: "resume_draft_generate",
    featureArea: "resume",
    modelEnvKeys: ["OPENAI_RESUME_MODEL", "OPENAI_LIGHT_MODEL"],
    defaultModel: "gpt-5.4-mini",
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1,
  },
  resume_review_generate: {
    actionKey: "resume_review_generate",
    featureArea: "resume",
    modelEnvKeys: ["OPENAI_RESUME_MODEL", "OPENAI_LIGHT_MODEL"],
    defaultModel: "gpt-5.4-mini",
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1,
  },
  resume_company_adjust_generate: {
    actionKey: "resume_company_adjust_generate",
    featureArea: "resume",
    modelEnvKeys: ["OPENAI_RESUME_MODEL", "OPENAI_LIGHT_MODEL"],
    defaultModel: "gpt-5.4-mini",
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1,
  },
  company_research_report_generate: {
    actionKey: "company_research_report_generate",
    featureArea: "company_research",
    modelEnvKeys: ["OPENAI_COMPANY_RESEARCH_MODEL", "OPENAI_MAIN_MODEL"],
    fallbackModelEnvKey: "OPENAI_ESCALATION_MODEL",
    defaultModel: "gpt-5.4-mini",
    defaultFallbackModel: "gpt-5.6-terra",
    reasoningEffort: "none",
    webSearch: true,
    maxAttempts: 2,
  },
  company_research_chat_generate: {
    actionKey: "company_research_chat_generate",
    featureArea: "company_research",
    modelEnvKeys: ["OPENAI_COMPANY_RESEARCH_MODEL", "OPENAI_MAIN_MODEL"],
    defaultModel: "gpt-5.4-mini",
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1,
  },
};

/**
 * Resolves model policy from the provided env map; defaults to process.env for Next/server runtime.
 */
export function resolveAiModelPolicy(actionKey: AiActionKey, env: EnvLike = process.env): AiModelPolicy {
  const config = POLICY_BY_ACTION[actionKey];
  const model = resolveEnvModel(env, config.modelEnvKeys, config.defaultModel);
  const fallbackModel = resolveFallbackModel(env, config);

  return {
    actionKey: config.actionKey,
    featureArea: config.featureArea,
    model,
    fallbackModel,
    reasoningEffort: config.reasoningEffort,
    webSearch: config.webSearch,
    maxAttempts: config.maxAttempts,
  };
}

function resolveEnvModel(env: EnvLike, envKeys: string[] | undefined, defaultModel: string): string {
  for (const envKey of envKeys ?? []) {
    const value = normalizeEnvValue(env[envKey]);
    if (value) return value;
  }
  return defaultModel;
}

function resolveFallbackModel(env: EnvLike, config: AiModelPolicyConfig): string | null {
  if (!config.defaultFallbackModel && !config.fallbackModelEnvKey) return null;
  const fallbackEnv = config.fallbackModelEnvKey ? normalizeEnvValue(env[config.fallbackModelEnvKey]) : undefined;
  return fallbackEnv ?? config.defaultFallbackModel ?? null;
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
