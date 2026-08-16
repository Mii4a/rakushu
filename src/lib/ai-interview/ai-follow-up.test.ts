import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiInterviewCategoryDefinition } from "./setup-scenarios";
import type { AiInterviewFollowUpInput } from "./ai-follow-up";

const {
  requestStructuredAiMock,
  recordLocalAiFallbackMock,
  resolveAiModelPolicyMock,
  structuredAiRequestErrorCtorMock
} = vi.hoisted(() => {
  class FakeStructuredAiRequestError extends Error {
    code: string;
    model: string;
    constructor(code: string, model: string) {
      super(`Structured AI request failed: ${code}`);
      this.name = "StructuredAiRequestError";
      this.code = code;
      this.model = model;
    }
  }

  return {
    requestStructuredAiMock: vi.fn(),
    recordLocalAiFallbackMock: vi.fn(),
    resolveAiModelPolicyMock: vi.fn(),
    structuredAiRequestErrorCtorMock: FakeStructuredAiRequestError
  };
});

vi.mock("@/lib/ai/openai-responses", () => ({
  requestStructuredAi: requestStructuredAiMock,
  StructuredAiRequestError: structuredAiRequestErrorCtorMock,
  recordLocalAiFallback: recordLocalAiFallbackMock
}));

vi.mock("@/lib/ai/model-policy", () => ({
  resolveAiModelPolicy: resolveAiModelPolicyMock
}));

const FakeStructuredAiRequestError = structuredAiRequestErrorCtorMock;

const category = {
  id: "selfIntro",
  label: "自己紹介",
  durationMinutes: 5,
  questionCount: 2,
  sampleQuestion: "自己紹介をお願いします",
  fixedQuestions: ["自己紹介をお願いします"],
  scenarioTypes: ["new-grad", "graduated", "second-new-grad", "career"]
} satisfies AiInterviewCategoryDefinition;

type FollowUpInput = AiInterviewFollowUpInput;

function makeInput(overrides: Partial<FollowUpInput> = {}): FollowUpInput {
  return {
    category,
    companyName: "会社",
    targetRole: "役割",
    userId: "user-1",
    sessionId: "session-1",
    existingAnswers: [{ prompt: "自己紹介", answerText: "内容" }],
    ...overrides
  };
}

describe("buildAiInterviewFollowUpQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAiModelPolicyMock.mockReturnValue({ actionKey: "interview_follow_up_generate", featureArea: "ai_interview", model: "gpt-5.6-luna", fallbackModel: null, reasoningEffort: "none", webSearch: false, maxAttempts: 1 });
    recordLocalAiFallbackMock.mockResolvedValue("fallback-1");
  });

  it("calls the shared client with the exact interview follow-up payload and returns a trimmed prompt", async () => {
    requestStructuredAiMock.mockImplementationOnce(async ({ userId, actionKey, sourceTable, sourceId, systemPrompt, userPrompt, schemaName, jsonSchema, parse }) => {
      expect(userId).toBe("user-1");
      expect(actionKey).toBe("interview_follow_up_generate");
      expect(sourceTable).toBe("ai_interview_sessions");
      expect(sourceId).toBe("session-1");
      expect(systemPrompt).toContain("カテゴリ内の深掘り質問を1問だけ作ります");
      expect(userPrompt).toContain("対象企業: らくしゅう株式会社");
      expect(userPrompt).toContain("想定職種: 営業職");
      expect(schemaName).toBe("ai_interview_follow_up_question");
      expect(jsonSchema).toEqual({
        type: "object",
        additionalProperties: false,
        required: ["prompt"],
        properties: { prompt: { type: "string", minLength: 1, maxLength: 70 } }
      });
      const parsed = parse({ prompt: "  周囲から期待される役割は何ですか？  " });
      expect(parsed).toEqual({ prompt: "周囲から期待される役割は何ですか？" });
      return { data: parsed, model: "gpt-5.6-luna", usageEventId: "usage-1" };
    });

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    await expect(buildAiInterviewFollowUpQuestion(makeInput({ category, companyName: "らくしゅう株式会社", targetRole: "営業職", existingAnswers: [{ prompt: "自己紹介をお願いします", answerText: "大学では..." }] }))).resolves.toEqual({ prompt: "周囲から期待される役割は何ですか？" });
  });

  it("rejects invalid parsed shapes and falls back deterministically with telemetry", async () => {
    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    const invalidValues = [
      null,
      {},
      { prompt: "" },
      { prompt: "x".repeat(71) },
      { prompt: "一行目\n二行目？" },
      { prompt: "終わりません" }
    ];

    for (const value of invalidValues) {
      requestStructuredAiMock.mockImplementationOnce(async ({ parse }) => {
        expect(() => parse(value)).toThrow();
        throw new FakeStructuredAiRequestError("schema_validation_failed", "gpt-5.6-luna");
      });

      await expect(buildAiInterviewFollowUpQuestion(makeInput({ existingAnswers: [{ prompt: "自己紹介", answerText: "内容" }] }))).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });
    }

    expect(recordLocalAiFallbackMock).toHaveBeenCalledTimes(invalidValues.length);
    expect(recordLocalAiFallbackMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ userId: "user-1", actionKey: "interview_follow_up_generate", sourceTable: "ai_interview_sessions", sourceId: "session-1", model: "gpt-5.6-luna", errorCode: "schema_validation_failed" }));
  });

  it("records provider errors and uses deterministic fallback when the shared client throws StructuredAiRequestError", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("timeout", "gpt-5.6-luna"));

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    await expect(buildAiInterviewFollowUpQuestion(makeInput({ existingAnswers: [{ prompt: "自己紹介", answerText: "内容" }] }))).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });

    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.6-luna", errorCode: "timeout", actionKey: "interview_follow_up_generate", sourceTable: "ai_interview_sessions", sourceId: "session-1" }));
  });

  it("uses policy model and unknown_error for unexpected failures", async () => {
    resolveAiModelPolicyMock.mockReturnValueOnce({ actionKey: "interview_follow_up_generate", featureArea: "ai_interview", model: "gpt-5.6-luna", fallbackModel: null, reasoningEffort: "none", webSearch: false, maxAttempts: 1 });
    requestStructuredAiMock.mockRejectedValueOnce(new Error("boom"));

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    await expect(buildAiInterviewFollowUpQuestion(makeInput({ existingAnswers: [{ prompt: "自己紹介", answerText: "内容" }] }))).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });

    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.6-luna", errorCode: "unknown_error" }));
  });

  it("preserves the exact provider code and model for a structured timeout error", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("http_429", "custom-luna-model"));

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    await expect(buildAiInterviewFollowUpQuestion(makeInput())).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });

    expect(resolveAiModelPolicyMock).not.toHaveBeenCalled();
    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ model: "custom-luna-model", errorCode: "http_429" }));
  });

  it("ignores spoofed code and model properties on unexpected error objects", async () => {
    requestStructuredAiMock.mockRejectedValueOnce({ code: "http_429", model: "evil" });

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    await expect(buildAiInterviewFollowUpQuestion(makeInput())).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });

    expect(resolveAiModelPolicyMock).toHaveBeenCalledWith("interview_follow_up_generate");
    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.6-luna", errorCode: "unknown_error" }));
  });

  it("awaits fallback telemetry before resolving the deterministic fallback", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("timeout", "gpt-5.6-luna"));
    let releaseTelemetry!: () => void;
    const telemetryStarted: Array<string> = [];
    let telemetrySettled = false;
    recordLocalAiFallbackMock.mockImplementationOnce(async () => {
      telemetryStarted.push("called");
      await new Promise<void>((resolve) => {
        releaseTelemetry = resolve;
      });
      telemetrySettled = true;
    });

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    const resultPromise = buildAiInterviewFollowUpQuestion(makeInput());

    await vi.waitFor(() => {
      expect(telemetryStarted).toHaveLength(1);
    });
    expect(telemetrySettled).toBe(false);

    let settled = false;
    resultPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    releaseTelemetry!();
    await expect(resultPromise).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });
    expect(telemetrySettled).toBe(true);
  });

  it("swallows local fallback recorder failures and still returns a deterministic question", async () => {
    recordLocalAiFallbackMock.mockRejectedValueOnce(new Error("telemetry down"));
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("timeout", "gpt-5.6-luna"));

    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");
    await expect(buildAiInterviewFollowUpQuestion(makeInput({ existingAnswers: [{ prompt: "自己紹介", answerText: "内容" }] }))).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });
  });

  it("keeps the exact fallback questions for self-intro and generic categories", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new Error("boom"));
    const { buildAiInterviewFollowUpQuestion } = await import("./ai-follow-up");

    await expect(buildAiInterviewFollowUpQuestion(makeInput({ existingAnswers: [{ prompt: "自己紹介について", answerText: "内容" }] }))).resolves.toEqual({ prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" });

    await expect(buildAiInterviewFollowUpQuestion(makeInput({ category: { ...category, label: "ガクチカ" }, existingAnswers: [{ prompt: "志望動機", answerText: "内容" }] }))).resolves.toEqual({ prompt: "ガクチカについて、先ほどの回答の中で特に具体化できる場面を1つ選んで詳しく教えてください。" });
  });
});
