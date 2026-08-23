import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { aiUsageEvents } from "../db/schema";

function columnNames() {
  return Object.keys(getTableColumns(aiUsageEvents)).sort();
}

describe("aiUsageEvents schema", () => {
  it("defines the append-only usage ledger with the expected privacy-preserving columns", () => {
    expect(aiUsageEvents).toBeDefined();
    expect(getTableName(aiUsageEvents)).toBe("ai_usage_events");

    expect(columnNames()).toEqual([
      "actionKey",
      "cachedInputTokens",
      "cachedInputUnitPriceMicroUsdPer1m",
      "createdAt",
      "errorCode",
      "featureArea",
      "fxYenPerUsdMilli",
      "id",
      "inputTokens",
      "inputUnitPriceMicroUsdPer1m",
      "latencyMs",
      "metadataJson",
      "model",
      "outputTokens",
      "outputUnitPriceMicroUsdPer1m",
      "priceVersion",
      "provider",
      "reasoningTokens",
      "requestStatus",
      "sourceId",
      "sourceTable",
      "toolCostMicroUsd",
      "totalCostMicroUsd",
      "totalCostMilliYen",
      "totalTokens",
      "userId",
      "webSearchCalls"
    ]);
  });

  it("keeps the nullable user FK and the required defaults on aggregate columns", () => {
    const columns = getTableColumns(aiUsageEvents) as Record<string, { notNull?: boolean; default?: unknown; references?: unknown }>;

    expect(columns.userId.notNull).toBe(false);
    expect(columns.provider.notNull).toBe(true);
    expect(columns.provider.default).toBeDefined();
    expect(columns.inputTokens.default).toBeDefined();
    expect(columns.cachedInputTokens.default).toBeDefined();
    expect(columns.inputUnitPriceMicroUsdPer1m.default).toBeUndefined();
    expect(columns.cachedInputUnitPriceMicroUsdPer1m.default).toBeUndefined();
    expect(columns.totalTokens.default).toBeDefined();
    expect(columns.metadataJson.default).toBeDefined();
    expect(columns.createdAt.default).toBeDefined();
  });

  it("does not introduce prompt, response, answer, key, audio, or raw payload columns", () => {
    const columns = getTableColumns(aiUsageEvents) as Record<string, unknown>;

    for (const forbidden of ["prompt", "responseText", "userAnswer", "apiKey", "audio", "rawPayload"]) {
      expect(forbidden in columns).toBe(false);
    }
  });
});
