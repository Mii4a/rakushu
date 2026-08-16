import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiActionKey, AiFeatureArea } from "./model-policy";
import { recordAiUsage, type AiUsageErrorCode, type AiUsageMetadata } from "./usage-recorder";

const { insertValuesMock, insertMock, randomUUIDMock, estimateAiCostMock } = vi.hoisted(() => {
  const insertValues = vi.fn();
  const insert = vi.fn(() => ({ values: insertValues }));
  const estimateAiCost = vi.fn();
  return {
    insertValuesMock: insertValues,
    insertMock: insert,
    randomUUIDMock: vi.fn(),
    estimateAiCostMock: estimateAiCost
  };
});

vi.mock("node:crypto", () => ({
  randomUUID: randomUUIDMock
}));

vi.mock("../db/schema", () => ({
  aiUsageEvents: {
    id: "id"
  }
}));

vi.mock("../db/client", () => ({
  db: {
    insert: insertMock
  }
}));

vi.mock("./pricing", () => ({
  estimateAiCost: estimateAiCostMock
}));

const makePricingResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  model: "gpt-5.4-mini",
  inputTokens: 1,
  cachedInputTokens: 0,
  outputTokens: 1,
  webSearchCalls: 0,
  fxYenPerUsdMilli: 150000,
  priceVersion: "openai-2026-08-15",
  priced: true,
  inputUnitPriceMicroUsdPer1m: 750000,
  cachedInputUnitPriceMicroUsdPer1m: 75000,
  outputUnitPriceMicroUsdPer1m: 4500000,
  tokenCostMicroUsd: 5,
  toolCostMicroUsd: 0,
  totalCostMicroUsd: 5,
  totalCostMilliYen: 1,
  ...overrides
});

const baseInput = (overrides: Partial<Parameters<typeof recordAiUsage>[0]> = {}) => ({
  userId: null,
  featureArea: "resume" as AiFeatureArea,
  actionKey: "resume_review_generate" as AiActionKey,
  model: "gpt-5.4-mini",
  requestStatus: "success" as const,
  inputTokens: 1,
  cachedInputTokens: 0,
  outputTokens: 1,
  reasoningTokens: 0,
  webSearchCalls: 0,
  latencyMs: 1,
  ...overrides
});

describe("recordAiUsage", () => {
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    randomUUIDMock.mockReturnValue("event-1");
  });

  it("persists a successful usage event with cost snapshot and safe metadata", async () => {
    vi.stubEnv("FX_YEN_PER_USD_MILLI", "150000");
    estimateAiCostMock.mockReturnValue(makePricingResult({
      inputTokens: 50000,
      cachedInputTokens: 20000,
      outputTokens: 10000,
      webSearchCalls: 3,
      tokenCostMicroUsd: 69000,
      toolCostMicroUsd: 30000,
      totalCostMicroUsd: 99000,
      totalCostMilliYen: 14850
    }));
    insertValuesMock.mockResolvedValueOnce(undefined);

    const id = await recordAiUsage({
      userId: "user-1",
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_review_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      sourceTable: "job_analyses",
      sourceId: "job-1",
      requestStatus: "success",
      inputTokens: 50000,
      cachedInputTokens: 20000,
      outputTokens: 10000,
      reasoningTokens: 1000,
      webSearchCalls: 3,
      latencyMs: 3756,
      metadata: { attempt: 1, citationCount: 4, groundedSourceCount: 2, chatQuestionNumber: 7, creditSettled: true }
    });

    expect(id).toBe("event-1");
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "event-1",
      provider: "openai",
      userId: "user-1",
      featureArea: "resume",
      actionKey: "resume_review_generate",
      model: "gpt-5.4-mini",
      sourceTable: "job_analyses",
      sourceId: "job-1",
      requestStatus: "success",
      inputTokens: 50000,
      cachedInputTokens: 20000,
      outputTokens: 10000,
      reasoningTokens: 1000,
      totalTokens: 60000,
      webSearchCalls: 3,
      inputUnitPriceMicroUsdPer1m: 750000,
      cachedInputUnitPriceMicroUsdPer1m: 75000,
      outputUnitPriceMicroUsdPer1m: 4500000,
      toolCostMicroUsd: 30000,
      totalCostMicroUsd: 99000,
      fxYenPerUsdMilli: 150000,
      totalCostMilliYen: 14850,
      priceVersion: "openai-2026-08-15",
      errorCode: null,
      metadataJson: JSON.stringify({ attempt: 1, citationCount: 4, groundedSourceCount: 2, chatQuestionNumber: 7, creditSettled: true })
    }));
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("stores fallback metadata and request status", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage(baseInput({
      featureArea: "ai_interview" as AiFeatureArea,
      actionKey: "interview_follow_up_generate" as AiActionKey,
      requestStatus: "fallback",
      metadata: { fallbackReason: "local_fallback" }
    }));

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      requestStatus: "fallback",
      metadataJson: JSON.stringify({ fallbackReason: "local_fallback" })
    }));
  });

  it("normalizes error codes and records error status", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult({ inputTokens: 0, outputTokens: 0 }));
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage(baseInput({
      featureArea: "company_research" as AiFeatureArea,
      actionKey: "company_research_report_generate" as AiActionKey,
      requestStatus: "error",
      inputTokens: 0,
      outputTokens: 0,
      errorCode: "http_429"
    }));

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "http_429" }));
  });

  it("records unknown models with null price snapshot but known tool cost", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult({
      model: "unknown-model",
      inputTokens: 10,
      cachedInputTokens: 2,
      outputTokens: 3,
      webSearchCalls: 2,
      priced: false,
      inputUnitPriceMicroUsdPer1m: null,
      cachedInputUnitPriceMicroUsdPer1m: null,
      outputUnitPriceMicroUsdPer1m: null,
      tokenCostMicroUsd: null,
      toolCostMicroUsd: 20000,
      totalCostMicroUsd: null,
      totalCostMilliYen: null
    }));
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage(baseInput({
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_draft_generate" as AiActionKey,
      model: "unknown-model",
      inputTokens: 10,
      cachedInputTokens: 2,
      outputTokens: 3,
      reasoningTokens: 0,
      webSearchCalls: 2,
      latencyMs: 1
    }));

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      inputUnitPriceMicroUsdPer1m: null,
      cachedInputUnitPriceMicroUsdPer1m: null,
      outputUnitPriceMicroUsdPer1m: null,
      toolCostMicroUsd: 20000,
      totalCostMicroUsd: null,
      totalCostMilliYen: null,
      priceVersion: "openai-2026-08-15"
    }));
  });

  it("swallows insert failures and logs only safe summary data", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());
    insertValuesMock.mockRejectedValueOnce(new Error("secret: token-abc123"));

    await expect(recordAiUsage(baseInput())).resolves.toBeNull();

    expect(consoleWarnSpy).toHaveBeenCalledWith("ai_usage_record_failed", {
      actionKey: "resume_review_generate",
      featureArea: "resume",
      model: "gpt-5.4-mini",
      requestStatus: "success"
    });
    const serialized = consoleWarnSpy.mock.calls.flat().join(" ");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token-abc123");
  });

  it("rejects invalid tokens and latency before insert", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());

    await expect(recordAiUsage(baseInput({ reasoningTokens: 2 }))).resolves.toBeNull();
    await expect(recordAiUsage(baseInput({ latencyMs: Number.NaN }))).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith("ai_usage_record_failed", expect.objectContaining({ actionKey: "resume_review_generate" }));
  });

  it("defaults fx to 150000 when missing and warns safely for invalid fx", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage(baseInput());

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ fxYenPerUsdMilli: 150000 }));

    vi.stubEnv("FX_YEN_PER_USD_MILLI", "-1");
    await recordAiUsage(baseInput());

    expect(consoleWarnSpy).toHaveBeenCalledWith("ai_usage_fx_invalid", { actionKey: "resume_review_generate" });
    expect(consoleWarnSpy.mock.calls.flat().join(" ")).not.toContain("-1");
  });

  it("rejects secret metadata values without inserting or logging them", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());

    await expect(recordAiUsage(baseInput({
      metadata: { fallbackReason: "PROMPT: user SSN 123-45-6789" } as unknown as AiUsageMetadata
    }))).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith("ai_usage_record_failed", {
      actionKey: "resume_review_generate",
      featureArea: "resume",
      model: "gpt-5.4-mini",
      requestStatus: "success"
    });
    expect(consoleWarnSpy.mock.calls.flat().join(" ")).not.toContain("PROMPT: user SSN 123-45-6789");
  });

  it.each([
    ["negative attempt", { attempt: -1 }],
    ["noninteger citationCount", { citationCount: 1.5 }],
    ["unsafe groundedSourceCount", { groundedSourceCount: Number.MAX_SAFE_INTEGER + 1 }],
    ["unsafe chatQuestionNumber", { chatQuestionNumber: Number.MAX_SAFE_INTEGER + 1 }],
    ["invalid creditSettled type", { creditSettled: "yes" }],
    ["unknown key", { extra: true }],
    ["array metadata", []]
  ])("rejects malformed metadata: %s", async (_label, metadata) => {
    estimateAiCostMock.mockReturnValue(makePricingResult());

    await expect(recordAiUsage(baseInput({ metadata: metadata as unknown as AiUsageMetadata }))).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("normalizes arbitrary runtime error codes to unknown_error without leaking raw text", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult({ inputTokens: 0, outputTokens: 0 }));
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage(baseInput({
      featureArea: "company_research" as AiFeatureArea,
      actionKey: "company_research_report_generate" as AiActionKey,
      requestStatus: "error",
      inputTokens: 0,
      outputTokens: 0,
      errorCode: "SECRET database password hunter2" as unknown as AiUsageErrorCode
    }));

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "unknown_error" }));
    expect(consoleWarnSpy.mock.calls.flat().join(" ")).not.toContain("SECRET database password hunter2");
  });

  it.each([
    ["inputTokens", { inputTokens: Number.MAX_SAFE_INTEGER + 1 }],
    ["cachedInputTokens", { cachedInputTokens: Number.MAX_SAFE_INTEGER + 1 }],
    ["outputTokens", { outputTokens: Number.MAX_SAFE_INTEGER + 1 }],
    ["reasoningTokens", { reasoningTokens: Number.MAX_SAFE_INTEGER + 1 }],
    ["webSearchCalls", { webSearchCalls: Number.MAX_SAFE_INTEGER + 1 }],
    ["latencyMs", { latencyMs: Number.MAX_SAFE_INTEGER + 1 }]
  ])("rejects unsafe usage field: %s", async (_field, patch) => {
    estimateAiCostMock.mockReturnValue(makePricingResult());

    await expect(recordAiUsage(baseInput(patch as Partial<Parameters<typeof recordAiUsage>[0]>))).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rejects cached token counts greater than input tokens", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());

    await expect(recordAiUsage(baseInput({ inputTokens: 1, cachedInputTokens: 2 }))).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rejects reasoning token counts greater than output tokens", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult());

    await expect(recordAiUsage(baseInput({ outputTokens: 1, reasoningTokens: 2 }))).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rejects total token sums that overflow safe integers before pricing", async () => {
    estimateAiCostMock.mockReturnValue(makePricingResult({ inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 1 }));

    await expect(recordAiUsage(baseInput({
      inputTokens: Number.MAX_SAFE_INTEGER,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: 1
    }))).resolves.toBeNull();

    expect(estimateAiCostMock).not.toHaveBeenCalled();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });
});

type SafeMetadata = AiUsageMetadata;
const safeMetadata = {
  attempt: 1,
  fallbackReason: "api_error",
  citationCount: 2,
  groundedSourceCount: 1,
  chatQuestionNumber: 3,
  creditSettled: true
} satisfies SafeMetadata;

// @ts-expect-error forbidden key must be rejected at compile time
const forbiddenMetadata: AiUsageMetadata = { prompt: "nope" };
void safeMetadata;
void forbiddenMetadata;
