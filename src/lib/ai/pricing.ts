export type AIPricingModel =
  | "gpt-4.1-mini"
  | "gpt-5.6-luna"
  | "gpt-5.4-mini"
  | "gpt-5.6-terra"
  | (string & {});

export type AIPricingInput = {
  model: AIPricingModel;
  inputTokens: number;
  outputTokens: number;
  webSearchCount: number;
  fxYenPerUsdMilli: number;
};

export type AIPricingResult = AIPricingInput & {
  priceVersion: "openai-2026-08-15";
  priced: boolean;
  tokenCostMicroUsd: number | null;
  toolCostMicroUsd: number | null;
  totalCostMicroUsd: number | null;
  totalCostMilliYen: number | null;
};

const PRICE_VERSION = "openai-2026-08-15" as const;
const WEB_SEARCH_COST_MICRO_USD = 10_000;

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4.1-mini": { input: 400_000, output: 1_600_000 },
  "gpt-5.6-luna": { input: 200_000, output: 1_200_000 },
  "gpt-5.4-mini": { input: 750_000, output: 4_500_000 },
  "gpt-5.6-terra": { input: 2_000_000, output: 12_000_000 }
};

function assertNonNegativeFiniteInteger(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite integer`);
  }
}

export function calculateAIPricing(input: AIPricingInput): AIPricingResult {
  assertNonNegativeFiniteInteger(input.inputTokens, "inputTokens");
  assertNonNegativeFiniteInteger(input.outputTokens, "outputTokens");
  assertNonNegativeFiniteInteger(input.webSearchCount, "webSearchCount");
  assertNonNegativeFiniteInteger(input.fxYenPerUsdMilli, "fxYenPerUsdMilli");

  const price = MODEL_PRICES[input.model];
  const toolCostMicroUsd = input.webSearchCount * WEB_SEARCH_COST_MICRO_USD;

  if (!price) {
    return {
      ...input,
      priceVersion: PRICE_VERSION,
      priced: false,
      tokenCostMicroUsd: null,
      toolCostMicroUsd,
      totalCostMicroUsd: null,
      totalCostMilliYen: null
    };
  }

  const tokenCostMicroUsd = Math.round(
    (input.inputTokens * price.input + input.outputTokens * price.output) / 1_000_000
  );
  const totalCostMicroUsd = tokenCostMicroUsd + toolCostMicroUsd;
  const totalCostMilliYen = Math.round((totalCostMicroUsd * input.fxYenPerUsdMilli) / 1_000_000);

  return {
    ...input,
    priceVersion: PRICE_VERSION,
    priced: true,
    tokenCostMicroUsd,
    toolCostMicroUsd,
    totalCostMicroUsd,
    totalCostMilliYen
  };
}
