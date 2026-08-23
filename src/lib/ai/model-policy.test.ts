import { expectTypeOf, describe, expect, it } from "vitest";
import {
  resolveAiModelPolicy,
  type AiActionKey,
  type AiFeatureArea,
  type AiModelPolicy,
} from "./model-policy";

describe("resolveAiModelPolicy", () => {
  it.each([
    ["interview_follow_up_generate", {
      featureArea: "ai_interview",
      model: "gpt-5.6-luna",
      fallbackModel: null,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    }],
    ["interview_category_feedback_generate", {
      featureArea: "ai_interview",
      model: "gpt-5.4-mini",
      fallbackModel: null,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    }],
    ["resume_draft_generate", {
      featureArea: "resume",
      model: "gpt-5.4-mini",
      fallbackModel: null,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    }],
    ["resume_review_generate", {
      featureArea: "resume",
      model: "gpt-5.4-mini",
      fallbackModel: null,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    }],
    ["resume_company_adjust_generate", {
      featureArea: "resume",
      model: "gpt-5.4-mini",
      fallbackModel: null,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    }],
    ["company_research_report_generate", {
      featureArea: "company_research",
      model: "gpt-5.4-mini",
      fallbackModel: "gpt-5.6-terra",
      reasoningEffort: "none",
      webSearch: true,
      maxAttempts: 2,
    }],
    ["company_research_chat_generate", {
      featureArea: "company_research",
      model: "gpt-5.4-mini",
      fallbackModel: null,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    }],
  ] as const)("returns the standard policy defaults for %s", (actionKey, expected) => {
    expect(resolveAiModelPolicy(actionKey, { OPENAI_MODEL_ROUTING_MODE: "standard" })).toMatchObject({ actionKey, ...expected });
  });

  it("caps company report output/tool usage and only falls back on transient provider failures", () => {
    expect(resolveAiModelPolicy("company_research_report_generate", { OPENAI_MODEL_ROUTING_MODE: "standard" })).toMatchObject({
      maxOutputTokens: 6000,
      maxToolCalls: 1,
      fallbackErrorCodes: ["http_429", "http_5xx", "timeout", "network_error"],
    });
    expect(resolveAiModelPolicy("resume_draft_generate", { OPENAI_MODEL_ROUTING_MODE: "standard" })).toMatchObject({
      maxOutputTokens: 2048,
      maxToolCalls: null,
      fallbackErrorCodes: [],
    });
  });

  it("defaults interview follow-up and feedback to the main model in legacy mode", () => {
    const env = {
      OPENAI_MODEL_ROUTING_MODE: "legacy",
      OPENAI_MAIN_MODEL: "gpt-4.1-mini",
      OPENAI_LIGHT_MODEL: "gpt-4.1-nano",
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "should-be-ignored",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "should-be-ignored",
      OPENAI_RESUME_MODEL: "should-be-ignored",
      OPENAI_COMPANY_RESEARCH_MODEL: "should-be-ignored",
      OPENAI_ESCALATION_MODEL: "should-be-ignored",
    };
    const originalEnv = { ...env };

    expect(resolveAiModelPolicy("interview_follow_up_generate", env)).toMatchObject({ model: "gpt-4.1-mini" });
    expect(resolveAiModelPolicy("interview_category_feedback_generate", env)).toMatchObject({ model: "gpt-4.1-mini" });
    expect(env).toEqual(originalEnv);
  });

  it("routes resume and company report/chat through the legacy main or light models", () => {
    const env = {
      OPENAI_MODEL_ROUTING_MODE: "legacy",
      OPENAI_MAIN_MODEL: "gpt-4.1-mini",
      OPENAI_LIGHT_MODEL: "gpt-4.1-nano",
      OPENAI_RESUME_MODEL: "should-be-ignored",
      OPENAI_COMPANY_RESEARCH_MODEL: "should-be-ignored",
      OPENAI_ESCALATION_MODEL: "should-be-ignored",
    };

    expect(resolveAiModelPolicy("resume_draft_generate", env)).toMatchObject({ model: "gpt-4.1-nano" });
    expect(resolveAiModelPolicy("resume_review_generate", env)).toMatchObject({ model: "gpt-4.1-nano" });
    expect(resolveAiModelPolicy("resume_company_adjust_generate", env)).toMatchObject({ model: "gpt-4.1-nano" });
    expect(resolveAiModelPolicy("company_research_report_generate", env)).toMatchObject({
      model: "gpt-4.1-mini",
      fallbackModel: null,
      maxAttempts: 1,
    });
    expect(resolveAiModelPolicy("company_research_chat_generate", env)).toMatchObject({ model: "gpt-4.1-mini" });
  });

  it("uses feature-specific vars and Terra fallback in standard mode", () => {
    const env = {
      OPENAI_MODEL_ROUTING_MODE: "standard",
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "followup-model",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "feedback-model",
      OPENAI_RESUME_MODEL: "resume-model",
      OPENAI_COMPANY_RESEARCH_MODEL: "company-model",
      OPENAI_ESCALATION_MODEL: "terra-model",
    };

    expect(resolveAiModelPolicy("interview_follow_up_generate", env)).toMatchObject({ model: "followup-model" });
    expect(resolveAiModelPolicy("interview_category_feedback_generate", env)).toMatchObject({ model: "feedback-model" });
    expect(resolveAiModelPolicy("resume_draft_generate", env)).toMatchObject({ model: "resume-model" });
    expect(resolveAiModelPolicy("company_research_report_generate", env)).toMatchObject({
      model: "company-model",
      fallbackModel: "terra-model",
      maxAttempts: 2,
    });
  });

  it("fails safe to legacy when the raw mode is invalid", () => {
    const env = {
      OPENAI_MODEL_ROUTING_MODE: "not-a-real-mode",
      OPENAI_MAIN_MODEL: "main-model",
      OPENAI_LIGHT_MODEL: "light-model",
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "followup-model",
    };

    expect(resolveAiModelPolicy("interview_follow_up_generate", env)).toMatchObject({ model: "main-model" });
  });

  it("trims whitespace-only env values and falls back to defaults", () => {
    const env = {
      OPENAI_MODEL_ROUTING_MODE: "standard",
      OPENAI_RESUME_MODEL: "   ",
      OPENAI_LIGHT_MODEL: "   ",
      OPENAI_ESCALATION_MODEL: "\t\n ",
    };

    expect(resolveAiModelPolicy("resume_review_generate", env)).toMatchObject({
      model: "gpt-5.4-mini",
      fallbackModel: null,
    });
    expect(resolveAiModelPolicy("company_research_report_generate", env)).toMatchObject({
      fallbackModel: "gpt-5.6-terra",
    });
    expect(env).toEqual({
      OPENAI_MODEL_ROUTING_MODE: "standard",
      OPENAI_RESUME_MODEL: "   ",
      OPENAI_LIGHT_MODEL: "   ",
      OPENAI_ESCALATION_MODEL: "\t\n ",
    });
  });

  it("trims meaningful env values before returning them", () => {
    const env = {
      OPENAI_MODEL_ROUTING_MODE: "standard",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "  light-trimmed  ",
      OPENAI_MAIN_MODEL: "\tinjected-main\n",
      OPENAI_ESCALATION_MODEL: " injected-fallback ",
    };

    expect(resolveAiModelPolicy("interview_category_feedback_generate", env)).toMatchObject({
      model: "light-trimmed",
    });
    expect(resolveAiModelPolicy("company_research_report_generate", env)).toMatchObject({
      model: "injected-main",
      fallbackModel: "injected-fallback",
    });
  });

  it("reads process.env safely when no env object is provided", () => {
    const original = { ...process.env };
    try {
      process.env.OPENAI_MODEL_ROUTING_MODE = "standard";
      process.env.OPENAI_INTERVIEW_FOLLOWUP_MODEL = "ambient-followup";
      expect(resolveAiModelPolicy("interview_follow_up_generate")).toMatchObject({
        model: "ambient-followup",
      });
    } finally {
      process.env = original;
    }
  });
});

expectTypeOf<AiActionKey>().toEqualTypeOf<
  | "interview_follow_up_generate"
  | "interview_category_feedback_generate"
  | "resume_draft_generate"
  | "resume_review_generate"
  | "resume_company_adjust_generate"
  | "company_research_report_generate"
  | "company_research_chat_generate"
>();
expectTypeOf<AiFeatureArea>().toEqualTypeOf<"ai_interview" | "resume" | "company_research">();
expectTypeOf<AiModelPolicy["fallbackModel"]>().toEqualTypeOf<string | null>();
