import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiInterviewCategoryDefinition } from "./setup-scenarios";
import type { AiInterviewCategoryFeedbackInput } from "./ai-category-feedback";

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

beforeEach(() => {
  vi.clearAllMocks();
  resolveAiModelPolicyMock.mockReturnValue({
    actionKey: "interview_category_feedback_generate",
    featureArea: "ai_interview",
    model: "gpt-5.4-mini",
    fallbackModel: null,
    reasoningEffort: "none",
    webSearch: false,
    maxAttempts: 1
  });
  recordLocalAiFallbackMock.mockResolvedValue("fallback-1");
});

function makeInput(overrides: Partial<AiInterviewCategoryFeedbackInput> = {}): AiInterviewCategoryFeedbackInput {
  return {
    userId: "user-1",
    sessionId: "session-1",
    category,
    companyName: "  らくしゅう株式会社  ",
    targetRole: "  営業職  ",
    answers: [
      { prompt: "  自己紹介してください  ", answerText: "  大学では情報工学を学びました。  " },
      { prompt: "学生時代に頑張ったことは？", answerText: "チーム開発を経験しました。" }
    ],
    ...overrides
  };
}

describe("buildAiInterviewCategoryFeedback", () => {
  it("calls the shared client with the exact category feedback payload and returns a reconstructed trimmed output", async () => {
    requestStructuredAiMock.mockImplementationOnce(async ({ userId, actionKey, sourceTable, sourceId, systemPrompt, userPrompt, schemaName, jsonSchema, parse }) => {
      expect(userId).toBe("user-1");
      expect(actionKey).toBe("interview_category_feedback_generate");
      expect(sourceTable).toBe("ai_interview_sessions");
      expect(sourceId).toBe("session-1");
      expect(systemPrompt).toContain("カテゴリ単位の総評");
      expect(userPrompt).toContain("対象企業:   らくしゅう株式会社  ");
      expect(userPrompt).toContain("想定職種:   営業職  ");
      expect(userPrompt).toContain("カテゴリ: 自己紹介");
      expect(schemaName).toBe("ai_interview_category_feedback");
      expect(jsonSchema).toEqual({
        type: "object",
        additionalProperties: false,
        required: ["overallScore", "summary", "strengths", "improvements", "nextFocus", "nextQuestions"],
        properties: {
          overallScore: { type: "number", minimum: 1, maximum: 5, multipleOf: 0.1 },
          summary: { type: "string", minLength: 1, maxLength: 400 },
          strengths: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 200 } },
          improvements: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 200 } },
          nextFocus: { type: "string", minLength: 1, maxLength: 200 },
          nextQuestions: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 200 } }
        }
      });
      const parsed = parse({
        overallScore: 4.2,
        summary: "  要点は伝わっています。  ",
        strengths: ["  結論が明確  ", "  具体例がある  "],
        improvements: ["  数字を足す  "],
        nextFocus: "  結論のあとに一言補足する  ",
        nextQuestions: ["  具体例を1つ教えてください  "]
      });
      expect(parsed).toEqual({
        overallScore: 4.2,
        summary: "要点は伝わっています。",
        strengths: ["結論が明確", "具体例がある"],
        improvements: ["数字を足す"],
        nextFocus: "結論のあとに一言補足する",
        nextQuestions: ["具体例を1つ教えてください"]
      });
      return { data: parsed, model: "gpt-5.4-mini", usageEventId: "usage-1" };
    });

    const { buildAiInterviewCategoryFeedback } = await import("./ai-category-feedback");
    await expect(buildAiInterviewCategoryFeedback(makeInput())).resolves.toEqual({
      overallScore: 4.2,
      summary: "要点は伝わっています。",
      strengths: ["結論が明確", "具体例がある"],
      improvements: ["数字を足す"],
      nextFocus: "結論のあとに一言補足する",
      nextQuestions: ["具体例を1つ教えてください"]
    });
    expect(resolveAiModelPolicyMock).not.toHaveBeenCalled();
  });

  it("accepts a null-prototype payload and reconstructs it into a normal output", async () => {
    requestStructuredAiMock.mockImplementationOnce(async ({ parse }) => {
      const payload = Object.create(null) as AiInterviewCategoryFeedbackInput & Record<string, unknown>;
      payload.overallScore = 4.2;
      payload.summary = "  要点は伝わっています。  ";
      payload.strengths = ["  結論が明確  "];
      payload.improvements = ["  数字を足す  "];
      payload.nextFocus = "  結論のあとに一言補足する  ";
      payload.nextQuestions = ["  具体例を1つ教えてください  "];

      const parsed = parse(payload);
      expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
      expect(parsed).toEqual({
        overallScore: 4.2,
        summary: "要点は伝わっています。",
        strengths: ["結論が明確"],
        improvements: ["数字を足す"],
        nextFocus: "結論のあとに一言補足する",
        nextQuestions: ["具体例を1つ教えてください"]
      });
      return { data: parsed, model: "gpt-5.4-mini", usageEventId: "usage-1" };
    });

    const { buildAiInterviewCategoryFeedback } = await import("./ai-category-feedback");
    await expect(buildAiInterviewCategoryFeedback(makeInput())).resolves.toEqual({
      overallScore: 4.2,
      summary: "要点は伝わっています。",
      strengths: ["結論が明確"],
      improvements: ["数字を足す"],
      nextFocus: "結論のあとに一言補足する",
      nextQuestions: ["具体例を1つ教えてください"]
    });
  });

  it("rejects custom-prototype payloads and falls back deterministically with telemetry", async () => {
    requestStructuredAiMock.mockImplementationOnce(async ({ parse }) => {
      const payload = Object.create({ inherited: true }) as AiInterviewCategoryFeedbackInput & Record<string, unknown>;
      payload.overallScore = 4.2;
      payload.summary = "要点は伝わっています。";
      payload.strengths = ["結論が明確"];
      payload.improvements = ["数字を足す"];
      payload.nextFocus = "結論のあとに一言補足する";
      payload.nextQuestions = ["具体例を1つ教えてください"];
      expect(() => parse(payload)).toThrow();
      throw new FakeStructuredAiRequestError("schema_validation_failed", "gpt-5.4-mini");
    });

    const { buildAiInterviewCategoryFeedback } = await import("./ai-category-feedback");
    await expect(buildAiInterviewCategoryFeedback(makeInput())).resolves.toEqual({
      overallScore: 4.0,
      summary: "自己紹介として要点は伝わっています。次は具体性を足すと評価が安定します。",
      strengths: ["自己紹介の主題から大きく逸れずに回答できています"],
      improvements: ["数字・役割・結果のどれかを一段具体化する"],
      nextFocus: "結論のあとに具体例を一言で足す",
      nextQuestions: ["自己紹介について、成果が伝わる具体例を1つ追加するとしたら何ですか？"]
    });
    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "schema_validation_failed" }));
  });

  it("preserves structured http_429 custom model failures without consulting policy", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("http_429", "custom-luna-model"));

    const { buildAiInterviewCategoryFeedback } = await import("./ai-category-feedback");
    await expect(buildAiInterviewCategoryFeedback(makeInput())).resolves.toEqual({
      overallScore: 4.0,
      summary: "自己紹介として要点は伝わっています。次は具体性を足すと評価が安定します。",
      strengths: ["自己紹介の主題から大きく逸れずに回答できています"],
      improvements: ["数字・役割・結果のどれかを一段具体化する"],
      nextFocus: "結論のあとに具体例を一言で足す",
      nextQuestions: ["自己紹介について、成果が伝わる具体例を1つ追加するとしたら何ですか？"]
    });
    expect(resolveAiModelPolicyMock).not.toHaveBeenCalled();
    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ model: "custom-luna-model", errorCode: "http_429" }));
  });

  it("uses the central mini model for spoofed error objects", async () => {
    requestStructuredAiMock.mockRejectedValueOnce({ code: "http_429", model: "evil" });

    const { buildAiInterviewCategoryFeedback } = await import("./ai-category-feedback");
    await expect(buildAiInterviewCategoryFeedback(makeInput())).resolves.toEqual({
      overallScore: 4.0,
      summary: "自己紹介として要点は伝わっています。次は具体性を足すと評価が安定します。",
      strengths: ["自己紹介の主題から大きく逸れずに回答できています"],
      improvements: ["数字・役割・結果のどれかを一段具体化する"],
      nextFocus: "結論のあとに具体例を一言で足す",
      nextQuestions: ["自己紹介について、成果が伝わる具体例を1つ追加するとしたら何ですか？"]
    });
    expect(resolveAiModelPolicyMock).toHaveBeenCalledWith("interview_category_feedback_generate");
    expect(recordLocalAiFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.4-mini", errorCode: "unknown_error" }));
  });

  it("awaits local fallback telemetry before settling and still survives recorder rejection", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("timeout", "gpt-5.4-mini"));
    let releaseTelemetry!: () => void;
    let telemetrySettled = false;
    recordLocalAiFallbackMock.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        releaseTelemetry = resolve;
      });
      telemetrySettled = true;
    });

    const { buildAiInterviewCategoryFeedback } = await import("./ai-category-feedback");
    const resultPromise = buildAiInterviewCategoryFeedback(makeInput());
    let settled = false;
    resultPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    releaseTelemetry!();
    await expect(resultPromise).resolves.toEqual({
      overallScore: 4.0,
      summary: "自己紹介として要点は伝わっています。次は具体性を足すと評価が安定します。",
      strengths: ["自己紹介の主題から大きく逸れずに回答できています"],
      improvements: ["数字・役割・結果のどれかを一段具体化する"],
      nextFocus: "結論のあとに具体例を一言で足す",
      nextQuestions: ["自己紹介について、成果が伝わる具体例を1つ追加するとしたら何ですか？"]
    });
    expect(telemetrySettled).toBe(true);

    recordLocalAiFallbackMock.mockRejectedValueOnce(new Error("telemetry down"));
    requestStructuredAiMock.mockRejectedValueOnce(new FakeStructuredAiRequestError("timeout", "gpt-5.4-mini"));
    await expect(buildAiInterviewCategoryFeedback(makeInput())).resolves.toEqual({
      overallScore: 4.0,
      summary: "自己紹介として要点は伝わっています。次は具体性を足すと評価が安定します。",
      strengths: ["自己紹介の主題から大きく逸れずに回答できています"],
      improvements: ["数字・役割・結果のどれかを一段具体化する"],
      nextFocus: "結論のあとに具体例を一言で足す",
      nextQuestions: ["自己紹介について、成果が伝わる具体例を1つ追加するとしたら何ですか？"]
    });
  });
});
