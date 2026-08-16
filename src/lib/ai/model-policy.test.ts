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
  ] as const)("returns the default policy for %s", (actionKey, expected) => {
    expect(resolveAiModelPolicy(actionKey, {})).toEqual({ actionKey, ...expected });
  });

  it("normalizes absent fallback model to null", () => {
    const policy = resolveAiModelPolicy("resume_review_generate", {});
    expect(policy.fallbackModel).toBeNull();
  });

  it("trims whitespace-only env values and falls back to defaults", () => {
    const env = {
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
      OPENAI_RESUME_MODEL: "   ",
      OPENAI_LIGHT_MODEL: "   ",
      OPENAI_ESCALATION_MODEL: "\t\n ",
    });
  });

  it("trims meaningful env values before returning them", () => {
    const env = {
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

  it("uses an injected env object without reading process.env", () => {
    const env = {
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "  injected-followup  ",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "",
      OPENAI_LIGHT_MODEL: "injected-light",
      OPENAI_COMPANY_RESEARCH_MODEL: " ",
      OPENAI_MAIN_MODEL: "injected-main",
      OPENAI_ESCALATION_MODEL: " injected-fallback ",
      OPENAI_RESUME_MODEL: " injected-resume ",
    };

    expect(resolveAiModelPolicy("interview_follow_up_generate", env)).toMatchObject({
      model: "injected-followup",
    });
    expect(resolveAiModelPolicy("interview_category_feedback_generate", env)).toMatchObject({
      model: "injected-light",
    });
    expect(resolveAiModelPolicy("resume_company_adjust_generate", env)).toMatchObject({
      model: "injected-resume",
    });
    expect(resolveAiModelPolicy("company_research_report_generate", env)).toMatchObject({
      model: "injected-main",
      fallbackModel: "injected-fallback",
    });
    expect(env.OPENAI_INTERVIEW_FOLLOWUP_MODEL).toBe("  injected-followup  ");
  });

  it("reads process.env safely when no env object is provided", () => {
    const original = { ...process.env };
    try {
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
