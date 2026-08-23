import { describe, expect, it } from "vitest";

import { PRICE_VERSION, estimateAiCost } from "./pricing";

describe("estimateAiCost", () => {
  it("calculates versioned integer-only AI pricing for known models", () => {
    const result = estimateAiCost({
      model: "gpt-5.4-mini",
      inputTokens: 50_000,
      cachedInputTokens: 0,
      outputTokens: 10_000,
      webSearchCalls: 3,
      fxYenPerUsdMilli: 150_000
    });

    expect(result).toEqual({
      priceVersion: PRICE_VERSION,
      priced: true,
      tokenCostMicroUsd: 82_500,
      toolCostMicroUsd: 30_000,
      totalCostMicroUsd: 112_500,
      totalCostMilliYen: 16_875,
      inputUnitPriceMicroUsdPer1m: 750_000,
      cachedInputUnitPriceMicroUsdPer1m: 75_000,
      outputUnitPriceMicroUsdPer1m: 4_500_000,
      model: "gpt-5.4-mini",
      inputTokens: 50_000,
      cachedInputTokens: 0,
      outputTokens: 10_000,
      webSearchCalls: 3,
      fxYenPerUsdMilli: 150_000
    });
  });

  it("prices cached input tokens separately for supported models", () => {
    const result = estimateAiCost({
      model: "gpt-5.4-mini",
      inputTokens: 50_000,
      cachedInputTokens: 20_000,
      outputTokens: 10_000,
      webSearchCalls: 3,
      fxYenPerUsdMilli: 150_000
    });

    expect(result).toEqual({
      priceVersion: PRICE_VERSION,
      priced: true,
      tokenCostMicroUsd: 69_000,
      toolCostMicroUsd: 30_000,
      totalCostMicroUsd: 99_000,
      totalCostMilliYen: 14_850,
      inputUnitPriceMicroUsdPer1m: 750_000,
      cachedInputUnitPriceMicroUsdPer1m: 75_000,
      outputUnitPriceMicroUsdPer1m: 4_500_000,
      model: "gpt-5.4-mini",
      inputTokens: 50_000,
      cachedInputTokens: 20_000,
      outputTokens: 10_000,
      webSearchCalls: 3,
      fxYenPerUsdMilli: 150_000
    });
  });

  it("keeps Web Search cost truthful even when token pricing stays unknown", () => {
    const result = estimateAiCost({
      model: "gpt-unknown",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 2,
      webSearchCalls: 1,
      fxYenPerUsdMilli: 150_000
    });

    expect(result).toEqual({
      priceVersion: PRICE_VERSION,
      priced: false,
      tokenCostMicroUsd: null,
      toolCostMicroUsd: 10_000,
      totalCostMicroUsd: null,
      totalCostMilliYen: null,
      inputUnitPriceMicroUsdPer1m: null,
      cachedInputUnitPriceMicroUsdPer1m: null,
      outputUnitPriceMicroUsdPer1m: null,
      model: "gpt-unknown",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 2,
      webSearchCalls: 1,
      fxYenPerUsdMilli: 150_000
    });
  });

  it("rejects cached input tokens greater than total input tokens", () => {
    expect(() => {
      estimateAiCost({
        model: "gpt-5.4-mini",
        inputTokens: 1,
        cachedInputTokens: 2,
        outputTokens: 0,
        webSearchCalls: 0,
        fxYenPerUsdMilli: 150_000
      });
    }).toThrow(RangeError);
  });

  it.each([
    ["inputTokens", "inputTokens", -1],
    ["inputTokens non-finite", "inputTokens", Number.POSITIVE_INFINITY],
    ["inputTokens non-integer", "inputTokens", 1.5],
    ["cachedInputTokens", "cachedInputTokens", -1],
    ["cachedInputTokens non-finite", "cachedInputTokens", Number.NaN],
    ["cachedInputTokens non-integer", "cachedInputTokens", 1.25],
    ["outputTokens", "outputTokens", -1],
    ["outputTokens non-finite", "outputTokens", Number.NEGATIVE_INFINITY],
    ["outputTokens non-integer", "outputTokens", 2.25],
    ["webSearchCalls", "webSearchCalls", -1],
    ["webSearchCalls non-finite", "webSearchCalls", Number.NaN],
    ["webSearchCalls non-integer", "webSearchCalls", 1.1],
    ["fxYenPerUsdMilli", "fxYenPerUsdMilli", -1],
    ["fxYenPerUsdMilli non-finite", "fxYenPerUsdMilli", Number.POSITIVE_INFINITY],
    ["fxYenPerUsdMilli non-integer", "fxYenPerUsdMilli", 1.2]
  ])("rejects %s with RangeError", (_label, field, value) => {
    expect(() => {
      estimateAiCost({
        model: "gpt-5.4-mini",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        webSearchCalls: 0,
        fxYenPerUsdMilli: 150_000,
        [field]: value
      } as never);
    }).toThrow(RangeError);
  });
});
