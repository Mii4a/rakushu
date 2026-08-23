import { serverEnv } from "../env/server";

import type { AiActionKey, AiFeatureArea } from "./model-policy";
import { resolveAiModelPolicy } from "./model-policy";
import { recordAiUsage, type AiUsageErrorCode, type AiUsageMetadata } from "./usage-recorder";
import { structuredAiValidationFailureReason, type StructuredAiValidationFailureReason } from "./validation-error";

export type StructuredAiResult<T> = { data: T; model: string; usageEventId: string | null };

export class StructuredAiRequestError extends Error {
  readonly code: AiUsageErrorCode;
  readonly model: string;

  constructor(code: AiUsageErrorCode, model: string) {
    super(`Structured AI request failed: ${code}`);
    this.name = "StructuredAiRequestError";
    this.code = code;
    this.model = model;
  }
}

type StructuredAiRequestInput<T> = {
  userId: string | null;
  actionKey: AiActionKey;
  sourceTable?: string | null;
  sourceId?: string | null;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  parse: (value: unknown) => T;
};

type UsageShape = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
};

type Envelope = {
  status?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: unknown }> }>;
  usage?: Record<string, unknown>;
};

const ZERO_USAGE: UsageShape = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, webSearchCalls: 0 };

function safeInt(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function timeoutMs(featureArea: AiFeatureArea): number {
  return featureArea === "company_research" ? 90000 : 30000;
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  const candidate = AbortSignal as typeof AbortSignal & { timeout?: (ms: number) => AbortSignal };
  return typeof candidate.timeout === "function" ? candidate.timeout(ms) : undefined;
}

function buildBody(input: StructuredAiRequestInput<unknown>, model: string, policy: ReturnType<typeof resolveAiModelPolicy>): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    instructions: input.systemPrompt,
    input: input.userPrompt,
    reasoning: { effort: policy.reasoningEffort },
    max_output_tokens: policy.maxOutputTokens,
    text: { format: { type: "json_schema", name: input.schemaName, strict: true, schema: input.jsonSchema } }
  };
  if (policy.webSearch) body.tools = [{ type: "web_search" }];
  if (policy.maxToolCalls !== null) body.max_tool_calls = policy.maxToolCalls;
  return body;
}

function extract(envelope: Envelope): { text: string; webSearchCalls: number } {
  let text = "";
  let webSearchCalls = 0;
  for (const item of Array.isArray(envelope.output) ? envelope.output : []) {
    if (item?.type === "web_search_call") webSearchCalls += 1;
    if (item?.type !== "message") continue;
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part.text === "string") text += part.text;
    }
  }
  return { text, webSearchCalls };
}

function normalizeUsage(usage: Record<string, unknown> | undefined, webSearchCalls: number): UsageShape {
  const inputTokens = safeInt(usage?.input_tokens);
  const cachedInputTokens = Math.min(safeInt((usage?.input_tokens_details as Record<string, unknown> | undefined)?.cached_tokens), inputTokens);
  const outputTokens = safeInt(usage?.output_tokens);
  const reasoningTokens = Math.min(safeInt((usage?.output_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens), outputTokens);
  return { inputTokens, cachedInputTokens, outputTokens, reasoningTokens, webSearchCalls };
}

function safeErrorName(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  try {
    const candidate = error as { name?: unknown; constructor?: { name?: unknown } };
    return [candidate.name, candidate.constructor?.name].map((value) => (typeof value === "string" ? value : "")).find(Boolean) ?? "";
  } catch {
    return "";
  }
}

function isTimeoutError(error: unknown): boolean {
  const name = safeErrorName(error);
  return name === "AbortError" || name === "TimeoutError";
}

function requestFailureCode(error: unknown): AiUsageErrorCode {
  return isTimeoutError(error) ? "timeout" : "network_error";
}

function shouldFallback(code: AiUsageErrorCode, policy: ReturnType<typeof resolveAiModelPolicy>): boolean {
  return policy.fallbackErrorCodes.some((allowedCode) => allowedCode === code);
}

function fallbackReasonFor(code: AiUsageErrorCode): NonNullable<AiUsageMetadata["fallbackReason"]> {
  return code === "invalid_json" || code === "schema_validation_failed" || code === "empty_output" ? "invalid_output" : "api_error";
}

function statusErrorCode(status: number): AiUsageErrorCode {
  if (status === 400) return "http_400";
  if (status === 401) return "http_401";
  if (status === 403) return "http_403";
  if (status === 429) return "http_429";
  if (status >= 500 && status <= 599) return "http_5xx";
  return "unknown_error";
}

function responseUsage(envelope: Envelope): UsageShape {
  const { webSearchCalls } = extract(envelope);
  return normalizeUsage(envelope.usage, webSearchCalls);
}

function eventMetadata(attemptNumber: 1 | 2, fallbackReason?: NonNullable<AiUsageMetadata["fallbackReason"]>): AiUsageMetadata {
  return fallbackReason ? { attempt: attemptNumber, fallbackReason } : { attempt: attemptNumber };
}

function failureMetadata(
  attemptNumber: 1 | 2,
  code: AiUsageErrorCode,
  fallbackReason?: NonNullable<AiUsageMetadata["fallbackReason"]>,
  validationFailureReason?: StructuredAiValidationFailureReason | null
): AiUsageMetadata {
  return {
    attempt: attemptNumber,
    fallbackReason: fallbackReason ?? fallbackReasonFor(code),
    ...(validationFailureReason ? { validationFailureReason } : {})
  };
}

async function recordEvent(input: {
  userId: string | null;
  actionKey: AiActionKey;
  featureArea: AiFeatureArea;
  sourceTable?: string | null;
  sourceId?: string | null;
  model: string;
  requestStatus: "success" | "fallback" | "error";
  usage: UsageShape;
  latencyMs: number;
  errorCode?: AiUsageErrorCode | null;
  metadata: AiUsageMetadata;
}): Promise<string | null> {
  try {
    return await recordAiUsage({
      userId: input.userId,
      featureArea: input.featureArea,
      actionKey: input.actionKey,
      model: input.model,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      requestStatus: input.requestStatus,
      inputTokens: input.usage.inputTokens,
      cachedInputTokens: input.usage.cachedInputTokens,
      outputTokens: input.usage.outputTokens,
      reasoningTokens: input.usage.reasoningTokens,
      webSearchCalls: input.usage.webSearchCalls,
      latencyMs: input.latencyMs,
      errorCode: input.errorCode ?? null,
      metadata: input.metadata
    });
  } catch {
    return null;
  }
}

async function fetchResponses(apiKey: string, body: Record<string, unknown>, ms: number): Promise<Response> {
  return fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: timeoutSignal(ms)
  });
}

async function attempt<T>(input: StructuredAiRequestInput<T>, policy: ReturnType<typeof resolveAiModelPolicy>, model: string, attemptNumber: 1 | 2, apiKey: string, fallbackReason?: NonNullable<AiUsageMetadata["fallbackReason"]>) {
  const started = Date.now();
  const metadata = eventMetadata(attemptNumber, fallbackReason);
  try {
    const response = await fetchResponses(apiKey, buildBody(input, model, policy), timeoutMs(policy.featureArea));
    let envelope: unknown;
    try {
      envelope = await response.json();
    } catch {
      const code = response.ok ? "invalid_json" : statusErrorCode(response.status);
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage: ZERO_USAGE, latencyMs: Math.max(0, Date.now() - started), errorCode: code, metadata: failureMetadata(attemptNumber, code, fallbackReason) });
      return { ok: false as const, error: new StructuredAiRequestError(code, model), usageEventId };
    }

    if (!response.ok) {
      const code = statusErrorCode(response.status);
      const usage = envelope && typeof envelope === "object" && !Array.isArray(envelope) ? responseUsage(envelope as Envelope) : ZERO_USAGE;
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage, latencyMs: Math.max(0, Date.now() - started), errorCode: code, metadata: failureMetadata(attemptNumber, code, fallbackReason) });
      return { ok: false as const, error: new StructuredAiRequestError(code, model), usageEventId };
    }

    if (envelope === null || Array.isArray(envelope) || typeof envelope !== "object") {
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage: ZERO_USAGE, latencyMs: Math.max(0, Date.now() - started), errorCode: "invalid_json", metadata: failureMetadata(attemptNumber, "invalid_json", fallbackReason) });
      return { ok: false as const, error: new StructuredAiRequestError("invalid_json", model), usageEventId };
    }

    const envelopeObject = envelope as Envelope;
    if (envelopeObject.status !== "completed") {
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage: responseUsage(envelopeObject), latencyMs: Math.max(0, Date.now() - started), errorCode: "empty_output", metadata: failureMetadata(attemptNumber, "empty_output", fallbackReason) });
      return { ok: false as const, error: new StructuredAiRequestError("empty_output", model), usageEventId };
    }

    const { text, webSearchCalls } = extract(envelopeObject);
    const usage = normalizeUsage(envelopeObject.usage, webSearchCalls);
    if (!text.trim()) {
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage, latencyMs: Math.max(0, Date.now() - started), errorCode: "empty_output", metadata: failureMetadata(attemptNumber, "empty_output", fallbackReason) });
      return { ok: false as const, error: new StructuredAiRequestError("empty_output", model), usageEventId };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage, latencyMs: Math.max(0, Date.now() - started), errorCode: "invalid_json", metadata: failureMetadata(attemptNumber, "invalid_json", fallbackReason) });
      return { ok: false as const, error: new StructuredAiRequestError("invalid_json", model), usageEventId };
    }

    try {
      const data = input.parse(parsed);
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "success", usage, latencyMs: Math.max(0, Date.now() - started), metadata });
      return { ok: true as const, data, usageEventId };
    } catch (error) {
      const validationFailureReason = structuredAiValidationFailureReason(error);
      const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage, latencyMs: Math.max(0, Date.now() - started), errorCode: "schema_validation_failed", metadata: failureMetadata(attemptNumber, "schema_validation_failed", fallbackReason, validationFailureReason) });
      return { ok: false as const, error: new StructuredAiRequestError("schema_validation_failed", model), usageEventId };
    }
  } catch (error) {
    const code = requestFailureCode(error);
    const usageEventId = await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model, requestStatus: "error", usage: ZERO_USAGE, latencyMs: Math.max(0, Date.now() - started), errorCode: code, metadata: failureMetadata(attemptNumber, code, fallbackReason) });
    return { ok: false as const, error: new StructuredAiRequestError(code, model), usageEventId };
  }
}

export async function requestStructuredAi<T>(input: StructuredAiRequestInput<T>): Promise<StructuredAiResult<T>> {
  const policy = resolveAiModelPolicy(input.actionKey);
  const apiKey = serverEnv.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    await recordEvent({ userId: input.userId, actionKey: input.actionKey, featureArea: policy.featureArea, sourceTable: input.sourceTable, sourceId: input.sourceId, model: policy.model, requestStatus: "error", usage: ZERO_USAGE, latencyMs: 0, errorCode: "unknown_error", metadata: { attempt: 1 } });
    throw new StructuredAiRequestError("unknown_error", policy.model);
  }

  const primary = await attempt(input, policy, policy.model, 1, apiKey);
  if (primary.ok) return { data: primary.data, model: policy.model, usageEventId: primary.usageEventId };
  if (policy.fallbackModel && policy.maxAttempts === 2 && shouldFallback(primary.error.code, policy)) {
    const fallback = await attempt(input, policy, policy.fallbackModel, 2, apiKey, fallbackReasonFor(primary.error.code));
    if (fallback.ok) return { data: fallback.data, model: policy.fallbackModel, usageEventId: fallback.usageEventId };
    throw fallback.error;
  }
  throw primary.error;
}

export async function recordLocalAiFallback(input: {
  userId: string | null;
  actionKey: AiActionKey;
  model: string;
  sourceTable?: string | null;
  sourceId?: string | null;
  errorCode?: AiUsageErrorCode | null;
  latencyMs?: number;
}): Promise<string | null> {
  const policy = resolveAiModelPolicy(input.actionKey);
  try {
    return await recordAiUsage({
      userId: input.userId,
      featureArea: policy.featureArea,
      actionKey: input.actionKey,
      model: input.model,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      requestStatus: "fallback",
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      webSearchCalls: 0,
      latencyMs: input.latencyMs ?? 0,
      errorCode: input.errorCode ?? null,
      metadata: { attempt: 1, fallbackReason: "local_fallback" }
    });
  } catch {
    return null;
  }
}
