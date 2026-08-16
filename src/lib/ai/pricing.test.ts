import { describe, expect, it } from "vitest";

import { calculateAIPricing } from "./pricing";

describe("calculateAIPricing", () => {
  it("calculates versioned integer-only AI pricing for known models", () => {
    const result = calculateAIPricing({
      model: "gpt-5.4-mini",
      inputTokens: 50_000,
      outputTokens: 10_000,
      webSearchCount: 3,
      fxYenPerUsdMilli: 150_000
    });

    expect(result).toEqual({
      priceVersion: "openai-2026-08-15",
      priced: true,
      tokenCostMicroUsd: 82_500,
      toolCostMicroUsd: 30_000,
      totalCostMicroUsd: 112_500,
      totalCostMilliYen: 16_875,
      model: "gpt-5.4-mini",
      inputTokens: 50_000,
      outputTokens: 10_000,
      webSearchCount: 3,
      fxYenPerUsdMilli: 150_000
    });
  });

  it("returns unpriced null costs for unknown models without guessing", () => {
    const result = calculateAIPricing({
      model: "gpt-unknown",
      inputTokens: 1,
      outputTokens: 2,
      webSearchCount: 1,
      fxYenPerUsdMilli: 150_000
    });

    expect(result).toEqual({
      priceVersion: "openai-2026-08-15",
      priced: false,
      tokenCostMicroUsd: null,
      toolCostMicroUsd: 10_000,
      totalCostMicroUsd: null,
      totalCostMilliYen: null,
      model: "gpt-unknown",
      inputTokens: 1,
      outputTokens: 2,
      webSearchCount: 1,
      fxYenPerUsdMilli: 150_000
    });
  });

  it("rejects negative and non-finite usage counts with RangeError", () => {
    expect(() => {
      calculateAIPricing({
        model: "gpt-5.4-mini",
        inputTokens: -1,
        outputTokens: 0,
        webSearchCount: 0,
        fxYenPerUsdMilli: 150_000
      });
    }).toThrow(RangeError);

    expect(() => {
      calculateAIPricing({
        model: "gpt-5.4-mini",
        inputTokens: Number.POSITIVE_INFINITY,
        outputTokens: 0,
        webSearchCount: 0,
        fxYenPerUsdMilli: 150_000
      });
    }).toThrow(RangeError);
  });
});
