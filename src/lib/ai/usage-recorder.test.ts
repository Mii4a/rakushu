import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiActionKey, AiFeatureArea } from "./model-policy";

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

import { recordAiUsage, type AiUsageMetadata } from "./usage-recorder";

describe("recordAiUsage", () => {
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    randomUUIDMock.mockReturnValue("event-1");
    estimateAiCostMock.mockReset?.();
  });

  it("persists a successful usage event with cost snapshot and safe metadata", async () => {
    vi.stubEnv("FX_YEN_PER_USD_MILLI", "150000");
    estimateAiCostMock.mockReturnValue({
      model: "gpt-5.4-mini",
      inputTokens: 50000,
      cachedInputTokens: 20000,
      outputTokens: 10000,
      webSearchCalls: 3,
      fxYenPerUsdMilli: 150000,
      priceVersion: "openai-2026-08-15",
      priced: true,
      inputUnitPriceMicroUsdPer1m: 750000,
      cachedInputUnitPriceMicroUsdPer1m: 75000,
      outputUnitPriceMicroUsdPer1m: 4500000,
      tokenCostMicroUsd: 69000,
      toolCostMicroUsd: 30000,
      totalCostMicroUsd: 99000,
      totalCostMilliYen: 14850
    });
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
    estimateAiCostMock.mockReturnValue({
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
      totalCostMilliYen: 1
    });
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage({
      userId: null,
      featureArea: "ai_interview" as AiFeatureArea,
      actionKey: "interview_follow_up_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "fallback",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: 9,
      metadata: { fallbackReason: "local_fallback" }
    });

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      requestStatus: "fallback",
      metadataJson: JSON.stringify({ fallbackReason: "local_fallback" })
    }));
  });

  it("normalizes error codes and records error status", async () => {
    estimateAiCostMock.mockReturnValue({
      model: "gpt-5.4-mini",
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      webSearchCalls: 0,
      fxYenPerUsdMilli: 150000,
      priceVersion: "openai-2026-08-15",
      priced: true,
      inputUnitPriceMicroUsdPer1m: 750000,
      cachedInputUnitPriceMicroUsdPer1m: 75000,
      outputUnitPriceMicroUsdPer1m: 4500000,
      tokenCostMicroUsd: 0,
      toolCostMicroUsd: 0,
      totalCostMicroUsd: 0,
      totalCostMilliYen: 0
    });
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage({
      userId: "user-1",
      featureArea: "company_research" as AiFeatureArea,
      actionKey: "company_research_report_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "error",
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: 12,
      errorCode: "http_429"
    });

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "http_429" }));
  });

  it("records unknown models with null price snapshot but known tool cost", async () => {
    estimateAiCostMock.mockReturnValue({
      model: "unknown-model",
      inputTokens: 10,
      cachedInputTokens: 2,
      outputTokens: 3,
      webSearchCalls: 2,
      fxYenPerUsdMilli: 150000,
      priceVersion: "openai-2026-08-15",
      priced: false,
      inputUnitPriceMicroUsdPer1m: null,
      cachedInputUnitPriceMicroUsdPer1m: null,
      outputUnitPriceMicroUsdPer1m: null,
      tokenCostMicroUsd: null,
      toolCostMicroUsd: 20000,
      totalCostMicroUsd: null,
      totalCostMilliYen: null
    });
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage({
      userId: null,
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_draft_generate" as AiActionKey,
      model: "unknown-model",
      requestStatus: "success",
      inputTokens: 10,
      cachedInputTokens: 2,
      outputTokens: 3,
      reasoningTokens: 0,
      webSearchCalls: 2,
      latencyMs: 1
    });

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
    estimateAiCostMock.mockReturnValue({
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
      totalCostMilliYen: 1
    });
    insertValuesMock.mockRejectedValueOnce(new Error("secret: token-abc123"));

    await expect(recordAiUsage({
      userId: "user-1",
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_review_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "success",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: 1
    })).resolves.toBeNull();

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
    estimateAiCostMock.mockReturnValue({
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
      totalCostMilliYen: 1
    });

    await expect(recordAiUsage({
      userId: null,
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_review_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "success",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 2,
      webSearchCalls: 0,
      latencyMs: 1
    })).resolves.toBeNull();

    await expect(recordAiUsage({
      userId: null,
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_review_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "success",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: Number.NaN
    })).resolves.toBeNull();

    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith("ai_usage_record_failed", expect.objectContaining({ actionKey: "resume_review_generate" }));
  });

  it("defaults fx to 150000 when missing and warns safely for invalid fx", async () => {
    estimateAiCostMock.mockReturnValue({
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
      totalCostMilliYen: 1
    });
    insertValuesMock.mockResolvedValueOnce(undefined);

    await recordAiUsage({
      userId: null,
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_review_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "success",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: 1
    });

    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ fxYenPerUsdMilli: 150000 }));

    vi.stubEnv("FX_YEN_PER_USD_MILLI", "-1");
    await recordAiUsage({
      userId: null,
      featureArea: "resume" as AiFeatureArea,
      actionKey: "resume_review_generate" as AiActionKey,
      model: "gpt-5.4-mini",
      requestStatus: "success",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: 1
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("ai_usage_fx_invalid", { actionKey: "resume_review_generate" });
    expect(consoleWarnSpy.mock.calls.flat().join(" ")).not.toContain("-1");
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
