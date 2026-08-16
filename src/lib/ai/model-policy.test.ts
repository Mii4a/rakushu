import { describe, expect, it } from "vitest";
import {
  getAiModelPolicy,
  type AiActionKey,
  type AiFeatureArea,
} from "./model-policy";

describe("getAiModelPolicy", () => {
  it("returns the default policy for interview follow-up", () => {
    expect(getAiModelPolicy("interview_follow_up_generate")).toEqual({
      actionKey: "interview_follow_up_generate",
      featureArea: "ai_interview",
      model: "gpt-5.6-luna",
      fallbackModel: undefined,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    });
  });

  it("returns the default policy for company research report with fallback and web search", () => {
    expect(getAiModelPolicy("company_research_report_generate")).toEqual({
      actionKey: "company_research_report_generate",
      featureArea: "company_research",
      model: "gpt-5.4-mini",
      fallbackModel: "gpt-5.6-terra",
      reasoningEffort: "none",
      webSearch: true,
      maxAttempts: 2,
    });
  });

  it("uses the feature-specific override before the shared resume fallback", () => {
    const previous = process.env.OPENAI_RESUME_MODEL;
    process.env.OPENAI_RESUME_MODEL = "resume-override";

    try {
      expect(getAiModelPolicy("resume_review_generate")).toMatchObject({
        actionKey: "resume_review_generate",
        featureArea: "resume",
        model: "resume-override",
        fallbackModel: undefined,
        webSearch: false,
        maxAttempts: 1,
      });
    } finally {
      process.env.OPENAI_RESUME_MODEL = previous;
    }
  });

  it("keeps company chat on the main model without web search", () => {
    expect(getAiModelPolicy("company_research_chat_generate")).toMatchObject({
      actionKey: "company_research_chat_generate",
      featureArea: "company_research",
      model: "gpt-5.4-mini",
      fallbackModel: undefined,
      reasoningEffort: "none",
      webSearch: false,
      maxAttempts: 1,
    });
  });

  it("uses backward compatible light and main model overrides when present", () => {
    const previousLight = process.env.OPENAI_LIGHT_MODEL;
    const previousMain = process.env.OPENAI_MAIN_MODEL;
    process.env.OPENAI_LIGHT_MODEL = "light-compat";
    process.env.OPENAI_MAIN_MODEL = "main-compat";

    try {
      expect(getAiModelPolicy("interview_category_feedback_generate")).toMatchObject({
        model: "light-compat",
      });
      expect(getAiModelPolicy("company_research_report_generate")).toMatchObject({
        model: "main-compat",
      });
    } finally {
      process.env.OPENAI_LIGHT_MODEL = previousLight;
      process.env.OPENAI_MAIN_MODEL = previousMain;
    }
  });
});

const _assertActionKey: AiActionKey = "resume_draft_generate";
const _assertFeatureArea: AiFeatureArea = "resume";
