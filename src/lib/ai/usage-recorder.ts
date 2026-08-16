import { randomUUID } from "node:crypto";

import { db } from "../db/client";
import { aiUsageEvents } from "../db/schema";

import { estimateAiCost } from "./pricing";
import type { AiActionKey, AiFeatureArea } from "./model-policy";

export type AiUsageMetadata = {
  attempt?: number;
  fallbackReason?: "api_error" | "invalid_output" | "insufficient_evidence" | "local_fallback";
  citationCount?: number;
  groundedSourceCount?: number;
  chatQuestionNumber?: number;
  creditSettled?: boolean;
};

export type AiUsageErrorCode =
  | "http_400"
  | "http_401"
  | "http_403"
  | "http_429"
  | "http_5xx"
  | "timeout"
  | "network_error"
  | "empty_output"
  | "invalid_json"
  | "schema_validation_failed"
  | "unknown_error";

export type RecordAiUsageInput = {
  userId: string | null;
  featureArea: AiFeatureArea;
  actionKey: AiActionKey;
  model: string;
  sourceTable?: string | null;
  sourceId?: string | null;
  requestStatus: "success" | "fallback" | "error";
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
  latencyMs: number;
  errorCode?: AiUsageErrorCode | null;
  metadata?: AiUsageMetadata;
};

const DEFAULT_FX_YEN_PER_USD_MILLI = 150000;

function isNonNegativeFiniteInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function resolveFxYenPerUsdMilli(actionKey: AiActionKey): number {
  const raw = process.env.FX_YEN_PER_USD_MILLI;
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_FX_YEN_PER_USD_MILLI;
  if (!/^\d+$/.test(trimmed)) {
    console.warn("ai_usage_fx_invalid", { actionKey });
    return DEFAULT_FX_YEN_PER_USD_MILLI;
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0) {
    console.warn("ai_usage_fx_invalid", { actionKey });
    return DEFAULT_FX_YEN_PER_USD_MILLI;
  }
  return value;
}

function isAllowedMetadata(metadata: AiUsageMetadata | undefined): boolean {
  if (!metadata) return true;
  return Object.keys(metadata).every((key) =>
    ["attempt", "fallbackReason", "citationCount", "groundedSourceCount", "chatQuestionNumber", "creditSettled"].includes(key)
  );
}

export async function recordAiUsage(input: RecordAiUsageInput): Promise<string | null> {
  const fxYenPerUsdMilli = resolveFxYenPerUsdMilli(input.actionKey);
  const safeMetadata = input.metadata ?? {};

  if (
    !isNonNegativeFiniteInteger(input.reasoningTokens) ||
    !isNonNegativeFiniteInteger(input.latencyMs) ||
    input.reasoningTokens > input.outputTokens ||
    !isAllowedMetadata(safeMetadata)
  ) {
    console.warn("ai_usage_record_failed", {
      actionKey: input.actionKey,
      featureArea: input.featureArea,
      model: input.model,
      requestStatus: input.requestStatus
    });
    return null;
  }

  try {
    const pricing = estimateAiCost({
      model: input.model,
      inputTokens: input.inputTokens,
      cachedInputTokens: input.cachedInputTokens,
      outputTokens: input.outputTokens,
      webSearchCalls: input.webSearchCalls,
      fxYenPerUsdMilli
    });

    const id = randomUUID();
    await db.insert(aiUsageEvents).values({
      id,
      provider: "openai",
      userId: input.userId,
      model: input.model,
      featureArea: input.featureArea,
      actionKey: input.actionKey,
      sourceTable: input.sourceTable ?? null,
      sourceId: input.sourceId ?? null,
      requestStatus: input.requestStatus,
      inputTokens: input.inputTokens,
      cachedInputTokens: input.cachedInputTokens,
      outputTokens: input.outputTokens,
      reasoningTokens: input.reasoningTokens,
      totalTokens: input.inputTokens + input.outputTokens,
      webSearchCalls: input.webSearchCalls,
      inputUnitPriceMicroUsdPer1m: pricing.inputUnitPriceMicroUsdPer1m,
      cachedInputUnitPriceMicroUsdPer1m: pricing.cachedInputUnitPriceMicroUsdPer1m,
      outputUnitPriceMicroUsdPer1m: pricing.outputUnitPriceMicroUsdPer1m,
      toolCostMicroUsd: pricing.toolCostMicroUsd,
      totalCostMicroUsd: pricing.totalCostMicroUsd,
      fxYenPerUsdMilli,
      totalCostMilliYen: pricing.totalCostMilliYen,
      latencyMs: input.latencyMs,
      priceVersion: pricing.priceVersion,
      errorCode: input.errorCode ?? null,
      metadataJson: JSON.stringify(safeMetadata)
    });

    return id;
  } catch {
    console.warn("ai_usage_record_failed", {
      actionKey: input.actionKey,
      featureArea: input.featureArea,
      model: input.model,
      requestStatus: input.requestStatus
    });
    return null;
  }
}
