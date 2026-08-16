export type AiPricingModel =
  | "gpt-4.1-mini"
  | "gpt-5.6-luna"
  | "gpt-5.4-mini"
  | "gpt-5.6-terra"
  | (string & {});

export type AiPricingInput = {
  model: AiPricingModel;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  webSearchCalls: number;
  fxYenPerUsdMilli: number;
};

export type AiPricingResult = AiPricingInput & {
  priceVersion: typeof PRICE_VERSION;
  priced: boolean;
  inputUnitPriceMicroUsdPer1m: number | null;
  cachedInputUnitPriceMicroUsdPer1m: number | null;
  outputUnitPriceMicroUsdPer1m: number | null;
  tokenCostMicroUsd: number | null;
  toolCostMicroUsd: number | null;
  totalCostMicroUsd: number | null;
  totalCostMilliYen: number | null;
};

export const PRICE_VERSION = "openai-2026-08-15" as const;
const WEB_SEARCH_COST_MICRO_USD = 10_000;

const MODEL_PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "gpt-4.1-mini": { input: 400_000, cachedInput: 100_000, output: 1_600_000 },
  "gpt-5.6-luna": { input: 200_000, cachedInput: 20_000, output: 1_200_000 },
  "gpt-5.4-mini": { input: 750_000, cachedInput: 75_000, output: 4_500_000 },
  "gpt-5.6-terra": { input: 2_000_000, cachedInput: 200_000, output: 12_000_000 }
};

function assertNonNegativeFiniteInteger(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite integer`);
  }
}

export function estimateAiCost(input: AiPricingInput): AiPricingResult {
  assertNonNegativeFiniteInteger(input.inputTokens, "inputTokens");
  assertNonNegativeFiniteInteger(input.cachedInputTokens, "cachedInputTokens");
  assertNonNegativeFiniteInteger(input.outputTokens, "outputTokens");
  assertNonNegativeFiniteInteger(input.webSearchCalls, "webSearchCalls");
  assertNonNegativeFiniteInteger(input.fxYenPerUsdMilli, "fxYenPerUsdMilli");
  if (input.cachedInputTokens > input.inputTokens) {
    throw new RangeError("cachedInputTokens must be less than or equal to inputTokens");
  }

  const price = MODEL_PRICES[input.model];
  const toolCostMicroUsd = input.webSearchCalls * WEB_SEARCH_COST_MICRO_USD;

  if (!price) {
    return {
      ...input,
      priceVersion: PRICE_VERSION,
      priced: false,
      inputUnitPriceMicroUsdPer1m: null,
      cachedInputUnitPriceMicroUsdPer1m: null,
      outputUnitPriceMicroUsdPer1m: null,
      tokenCostMicroUsd: null,
      toolCostMicroUsd,
      totalCostMicroUsd: null,
      totalCostMilliYen: null
    };
  }

  const tokenCostMicroUsd = Math.round(
    ((input.inputTokens - input.cachedInputTokens) * price.input +
      input.cachedInputTokens * price.cachedInput +
      input.outputTokens * price.output) /
      1_000_000
  );
  const totalCostMicroUsd = tokenCostMicroUsd + toolCostMicroUsd;
  const totalCostMilliYen = Math.round((totalCostMicroUsd * input.fxYenPerUsdMilli) / 1_000_000);

  return {
    ...input,
    priceVersion: PRICE_VERSION,
    priced: true,
    inputUnitPriceMicroUsdPer1m: price.input,
    cachedInputUnitPriceMicroUsdPer1m: price.cachedInput,
    outputUnitPriceMicroUsdPer1m: price.output,
    tokenCostMicroUsd,
    toolCostMicroUsd,
    totalCostMicroUsd,
    totalCostMilliYen
  };
}
