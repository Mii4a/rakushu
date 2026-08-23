import { randomUUID } from "node:crypto";

import { db } from "../db/client";
import { aiUsageEvents } from "../db/schema";

import { estimateAiCost } from "./pricing";
import type { AiActionKey, AiFeatureArea } from "./model-policy";
import { isStructuredAiValidationFailureReason, type StructuredAiValidationFailureReason } from "./validation-error";

export type AiUsageMetadata = {
  attempt?: number;
  fallbackReason?: "api_error" | "invalid_output" | "insufficient_evidence" | "local_fallback";
  validationFailureReason?: StructuredAiValidationFailureReason;
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
const SAFE_METADATA_KEYS = ["attempt", "fallbackReason", "validationFailureReason", "citationCount", "groundedSourceCount", "chatQuestionNumber", "creditSettled"] as const;

function warnRecordFailed(input: Pick<RecordAiUsageInput, "actionKey" | "featureArea" | "model" | "requestStatus">): void {
  console.warn("ai_usage_record_failed", {
    actionKey: input.actionKey,
    featureArea: input.featureArea,
    model: input.model,
    requestStatus: input.requestStatus
  });
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
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

function normalizeErrorCode(errorCode: RecordAiUsageInput["errorCode"]): AiUsageErrorCode | null {
  if (errorCode == null) return null;
  switch (errorCode) {
    case "http_400":
    case "http_401":
    case "http_403":
    case "http_429":
    case "http_5xx":
    case "timeout":
    case "network_error":
    case "empty_output":
    case "invalid_json":
    case "schema_validation_failed":
    case "unknown_error":
      return errorCode;
    default:
      return "unknown_error";
  }
}

function sanitizeMetadata(metadata: unknown): AiUsageMetadata | null {
  if (metadata == null) return {};
  if (Array.isArray(metadata) || typeof metadata !== "object") return null;

  try {
    const prototype = Object.getPrototypeOf(metadata);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const safeMetadata: AiUsageMetadata = {};
    for (const key of Object.keys(metadata as Record<string, unknown>)) {
      if (!SAFE_METADATA_KEYS.includes(key as (typeof SAFE_METADATA_KEYS)[number])) return null;
      const value = (metadata as Record<string, unknown>)[key];
      switch (key) {
        case "attempt":
        case "citationCount":
        case "groundedSourceCount":
        case "chatQuestionNumber":
          if (!isSafeNonNegativeInteger(value)) return null;
          safeMetadata[key] = value;
          break;
        case "fallbackReason":
          if (
            value !== "api_error" &&
            value !== "invalid_output" &&
            value !== "insufficient_evidence" &&
            value !== "local_fallback"
          ) {
            return null;
          }
          safeMetadata[key] = value;
          break;
        case "validationFailureReason":
          if (!isStructuredAiValidationFailureReason(value)) return null;
          safeMetadata[key] = value;
          break;
        case "creditSettled":
          if (typeof value !== "boolean") return null;
          safeMetadata[key] = value;
          break;
      }
    }

    return safeMetadata;
  } catch {
    return null;
  }
}

function isValidUsageBoundary(input: RecordAiUsageInput): boolean {
  return (
    isSafeNonNegativeInteger(input.inputTokens) &&
    isSafeNonNegativeInteger(input.cachedInputTokens) &&
    isSafeNonNegativeInteger(input.outputTokens) &&
    isSafeNonNegativeInteger(input.reasoningTokens) &&
    isSafeNonNegativeInteger(input.webSearchCalls) &&
    isSafeNonNegativeInteger(input.latencyMs) &&
    input.cachedInputTokens <= input.inputTokens &&
    input.reasoningTokens <= input.outputTokens &&
    Number.isSafeInteger(input.inputTokens + input.outputTokens)
  );
}

export async function recordAiUsage(input: RecordAiUsageInput): Promise<string | null> {
  const fxYenPerUsdMilli = resolveFxYenPerUsdMilli(input.actionKey);

  if (!isValidUsageBoundary(input)) {
    warnRecordFailed(input);
    return null;
  }

  try {
    const safeMetadata = sanitizeMetadata(input.metadata);
    if (safeMetadata == null) {
      warnRecordFailed(input);
      return null;
    }

    const pricing = estimateAiCost({
      model: input.model,
      inputTokens: input.inputTokens,
      cachedInputTokens: input.cachedInputTokens,
      outputTokens: input.outputTokens,
      webSearchCalls: input.webSearchCalls,
      fxYenPerUsdMilli
    });

    const totalTokens = input.inputTokens + input.outputTokens;
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
      totalTokens,
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
      errorCode: normalizeErrorCode(input.errorCode),
      metadataJson: JSON.stringify(safeMetadata)
    });

    return id;
  } catch {
    warnRecordFailed(input);
    return null;
  }
}
