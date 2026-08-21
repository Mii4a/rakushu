import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./server";

describe("parseServerEnv", () => {
  const baseFixture = {
    NEXT_PUBLIC_APP_URL: "https://rakushu.example.com",
    BETTER_AUTH_URL: "https://rakushu.example.com",
    BETTER_AUTH_SECRET: "a".repeat(32),
    TURSO_DATABASE_URL: "libsql://example.turso.io",
    TURSO_AUTH_TOKEN: "turso-token",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
  };

  it("applies the routing and cost defaults", () => {
    expect(parseServerEnv(baseFixture)).toMatchObject({
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "gpt-5.6-luna",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "gpt-5.4-mini",
      OPENAI_RESUME_MODEL: "gpt-5.4-mini",
      OPENAI_COMPANY_RESEARCH_MODEL: "gpt-5.4-mini",
      OPENAI_ESCALATION_MODEL: "gpt-5.6-terra",
      OPENAI_MODEL_ROUTING_MODE: "legacy",
      FX_YEN_PER_USD_MILLI: "150000",
    });
  });

  it("accepts explicit valid routing and cost values", () => {
    expect(
      parseServerEnv({
        ...baseFixture,
        OPENAI_INTERVIEW_FOLLOWUP_MODEL: "  custom-followup  ",
        OPENAI_INTERVIEW_FEEDBACK_MODEL: "custom-feedback",
        OPENAI_RESUME_MODEL: "custom-resume",
        OPENAI_COMPANY_RESEARCH_MODEL: "custom-company",
        OPENAI_ESCALATION_MODEL: "custom-escalation",
        OPENAI_MODEL_ROUTING_MODE: "standard",
        FX_YEN_PER_USD_MILLI: "123456",
      })
    ).toMatchObject({
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "custom-followup",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "custom-feedback",
      OPENAI_RESUME_MODEL: "custom-resume",
      OPENAI_COMPANY_RESEARCH_MODEL: "custom-company",
      OPENAI_ESCALATION_MODEL: "custom-escalation",
      OPENAI_MODEL_ROUTING_MODE: "standard",
      FX_YEN_PER_USD_MILLI: "123456",
    });
  });

  it.each(["legacy-ish", "standard-ish", ""])("rejects invalid routing mode %s", (mode) => {
    expect(() => parseServerEnv({ ...baseFixture, OPENAI_MODEL_ROUTING_MODE: mode })).toThrow();
  });

  it.each(["-1", "0", "12.5", "abc", "9007199254740992"])("rejects invalid FX value %s", (fx) => {
    expect(() => parseServerEnv({ ...baseFixture, FX_YEN_PER_USD_MILLI: fx })).toThrow();
  });

  it("trims new model strings", () => {
    expect(
      parseServerEnv({
        ...baseFixture,
        OPENAI_INTERVIEW_FOLLOWUP_MODEL: "  trimmed-model  ",
        OPENAI_INTERVIEW_FEEDBACK_MODEL: "feedback-model",
        OPENAI_RESUME_MODEL: "resume-model",
        OPENAI_COMPANY_RESEARCH_MODEL: "company-model",
        OPENAI_ESCALATION_MODEL: "trimmed-escalation",
      })
    ).toMatchObject({
      OPENAI_INTERVIEW_FOLLOWUP_MODEL: "trimmed-model",
      OPENAI_INTERVIEW_FEEDBACK_MODEL: "feedback-model",
      OPENAI_RESUME_MODEL: "resume-model",
      OPENAI_COMPANY_RESEARCH_MODEL: "company-model",
      OPENAI_ESCALATION_MODEL: "trimmed-escalation",
    });
  });

  it.each([
    ["interview follow-up", { OPENAI_INTERVIEW_FOLLOWUP_MODEL: "\t" }],
    ["interview feedback", { OPENAI_INTERVIEW_FEEDBACK_MODEL: "\n" }],
    ["resume", { OPENAI_RESUME_MODEL: "  " }],
    ["company research", { OPENAI_COMPANY_RESEARCH_MODEL: "" }],
    ["escalation", { OPENAI_ESCALATION_MODEL: "\t" }],
  ] as const)("rejects blank %s model values", (_, overrides) => {
    expect(() => parseServerEnv({ ...baseFixture, ...overrides })).toThrow();
  });
});
