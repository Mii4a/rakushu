import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiActionKey, AiFeatureArea } from "./model-policy";
import { StructuredAiValidationError } from "./validation-error";

const { recordAiUsageMock, resolveAiModelPolicyMock, fetchMock, abortSignalTimeoutMock, nowMock, parseMock, serverEnvMock } = vi.hoisted(() => ({
  recordAiUsageMock: vi.fn(),
  resolveAiModelPolicyMock: vi.fn(),
  fetchMock: vi.fn(),
  abortSignalTimeoutMock: vi.fn(),
  nowMock: vi.fn(),
  parseMock: vi.fn(),
  serverEnvMock: { OPENAI_API_KEY: "test-key" as string | undefined }
}));

vi.mock("./model-policy", () => ({ resolveAiModelPolicy: resolveAiModelPolicyMock }));
vi.mock("./usage-recorder", () => ({ recordAiUsage: recordAiUsageMock }));
vi.mock("../env/server", () => ({ serverEnv: serverEnvMock }));

const basePolicy = {
  actionKey: "company_research_report_generate" as AiActionKey,
  featureArea: "company_research",
  model: "gpt-5.4-mini",
  fallbackModel: "gpt-5.6-terra",
  reasoningEffort: "none",
  webSearch: true,
  maxAttempts: 2 as const,
  maxOutputTokens: 6000,
  maxToolCalls: 1,
  fallbackErrorCodes: ["http_429", "http_5xx", "timeout", "network_error"]
};

const jsonResponse = (body: unknown, overrides: Record<string, unknown> = {}) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(body),
  ...overrides
});

const httpErrorResponse = (status: number, body: unknown, overrides: Record<string, unknown> = {}) => ({
  ok: false,
  status,
  json: vi.fn().mockResolvedValue(body),
  ...overrides
});

describe("openai responses client", () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    serverEnvMock.OPENAI_API_KEY = "test-key";
    resolveAiModelPolicyMock.mockReturnValue(basePolicy);
    recordAiUsageMock.mockResolvedValue("usage-1");
    fetchMock.mockReset();
    parseMock.mockReset();
    parseMock.mockImplementation((value: unknown) => value);
    abortSignalTimeoutMock.mockReset();
    abortSignalTimeoutMock.mockReturnValue({ tag: "timeout-signal" });
    nowMock.mockReturnValue(1000);
    dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMock());
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("AbortSignal", { timeout: abortSignalTimeoutMock });
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("builds strict requests, sends headers, and omits temperature/tools when disabled", async () => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, webSearch: false, fallbackModel: null, maxAttempts: 1, maxToolCalls: null });
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: {} }));

    const { requestStructuredAi } = await import("./openai-responses");
    await requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("gpt-5.4-mini");
    expect(body.instructions).toBe("sys");
    expect(body.input).toBe("usr");
    expect(body.reasoning).toEqual({ effort: "none" });
    expect(body.max_output_tokens).toBe(6000);
    expect(body.max_tool_calls).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    expect(body.tools).toBeUndefined();
    expect(body.text.format).toMatchObject({ type: "json_schema", name: "Test", strict: true, schema: { type: "object" } });
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-key", "content-type": "application/json" });
  });

  it("enables web search, counts calls, and normalizes cached and reasoning tokens", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      status: "completed",
      output: [
        { type: "web_search_call" },
        { type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }
      ],
      usage: { input_tokens: 12, input_tokens_details: { cached_tokens: 99 }, output_tokens: 6, output_tokens_details: { reasoning_tokens: 99 } }
    }));

    const { requestStructuredAi } = await import("./openai-responses");
    await requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-1", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });

    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ requestStatus: "success", inputTokens: 12, cachedInputTokens: 12, outputTokens: 6, reasoningTokens: 6, webSearchCalls: 1 }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      max_output_tokens: 6000,
      max_tool_calls: 1,
      tools: [{ type: "web_search" }]
    });
  });

  it("does not fallback on invalid JSON and records the primary usage once", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "not-json" }] }], usage: { input_tokens: 1, output_tokens: 1 } }));
    parseMock.mockReset();
    parseMock.mockImplementation((value: unknown) => value);

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-1", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "invalid_json", model: "gpt-5.4-mini" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordAiUsageMock).toHaveBeenCalledTimes(1);
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ requestStatus: "error", errorCode: "invalid_json", metadata: { attempt: 1, fallbackReason: "invalid_output" } }));
  });

  it("does not pay for a fallback on deterministic validation failures and records only a safe reason", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"still":true}' }] }], usage: { input_tokens: 3, output_tokens: 3 } }));
    parseMock.mockImplementationOnce(() => { throw new StructuredAiValidationError("missing_required_sections"); });

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-2", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "schema_validation_failed" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordAiUsageMock).toHaveBeenCalledTimes(1);
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({
      requestStatus: "error",
      errorCode: "schema_validation_failed",
      metadata: { attempt: 1, fallbackReason: "invalid_output", validationFailureReason: "missing_required_sections" }
    }));
  });

  it("does not fallback on empty or incomplete output and preserves primary usage", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "" }] }], usage: { input_tokens: 9, input_tokens_details: { cached_tokens: 99 }, output_tokens: 3, output_tokens_details: { reasoning_tokens: 99 } } }))
      .mockResolvedValueOnce(jsonResponse({ status: "incomplete", output: [{ type: "message", content: [{ type: "output_text", text: '{"ignored":true}' }] }], usage: { input_tokens: 5, output_tokens: 2 } }));

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-3", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "empty_output" });
    await expect(requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-4", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "empty_output" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(recordAiUsageMock).toHaveBeenCalledTimes(2);
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "empty_output", inputTokens: 9, cachedInputTokens: 9, outputTokens: 3, reasoningTokens: 3 }));
    expect(recordAiUsageMock).not.toHaveBeenCalledWith(expect.objectContaining({ requestStatus: "success", metadata: expect.objectContaining({ attempt: 2 }) }));
  });

  it("marks both failed attempts with fallback api_error metadata and stops after fallback failure", async () => {
    fetchMock
      .mockResolvedValueOnce(httpErrorResponse(500, { status: "failed", output: [], usage: { input_tokens: 7, output_tokens: 2 } }))
      .mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "not-json" }] }], usage: { input_tokens: 4, output_tokens: 1 } }));

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-5", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "invalid_json" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(recordAiUsageMock).toHaveBeenCalledTimes(2);
    expect(recordAiUsageMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ requestStatus: "error", errorCode: "http_5xx", metadata: { attempt: 1, fallbackReason: "api_error" } }));
    expect(recordAiUsageMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ requestStatus: "error", errorCode: "invalid_json", metadata: { attempt: 2, fallbackReason: "api_error" } }));
  });

  it.each([
    [400, "http_400"],
    [401, "http_401"],
    [403, "http_403"],
    [429, "http_429"],
    [500, "http_5xx"],
    [503, "http_5xx"],
    [418, "unknown_error"]
  ])("uses HTTP status priority for status %s even when body is non-JSON or null", async (status, code) => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, fallbackModel: null, maxAttempts: 1, webSearch: false });
    fetchMock.mockResolvedValueOnce(httpErrorResponse(status, null));

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code });
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ requestStatus: "error", errorCode: code }));
  });

  it("classifies timeout and network errors safely without raw message leakage", async () => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, fallbackModel: null, maxAttempts: 1, webSearch: false });
    fetchMock
      .mockRejectedValueOnce({ name: "TimeoutError", message: { toString: () => { throw new Error("poison"); } } })
      .mockRejectedValueOnce(new Error("boom network"));

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "timeout" });
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "network_error" });
    expect(JSON.stringify(recordAiUsageMock.mock.calls)).not.toContain("boom network");
  });

  it("treats nonobject JSON on HTTP ok as invalid_json", async () => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, fallbackModel: null, maxAttempts: 1, webSearch: false });
    fetchMock.mockResolvedValueOnce(jsonResponse([1, 2, 3]));
    await expect((await import("./openai-responses")).requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "invalid_json" });
  });

  it("sends web search requests exactly once and records one usage event", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      status: "completed",
      output: [
        { type: "web_search_call" },
        { type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }
      ],
      usage: { input_tokens: 10, output_tokens: 5 }
    }));

    const { requestStructuredAi } = await import("./openai-responses");
    await requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-6", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordAiUsageMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ tools: [{ type: "web_search" }] });
  });

  it("does not lose data when recorder throws after successful provider response", async () => {
    recordAiUsageMock.mockRejectedValueOnce(new Error("recorder down"));
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: {} }));
    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).resolves.toMatchObject({ data: { ok: true }, usageEventId: null });
  });

  it("records local fallback success with zero usage and nulls when recorder throws", async () => {
    recordAiUsageMock.mockRejectedValueOnce(new Error("db down"));
    const { recordLocalAiFallback } = await import("./openai-responses");
    await expect(recordLocalAiFallback({ userId: "u1", actionKey: "company_research_report_generate", model: "gpt-5.6-terra", sourceTable: "jobs", sourceId: "j1", errorCode: "timeout", latencyMs: 12 })).resolves.toBeNull();
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ requestStatus: "fallback", inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, webSearchCalls: 0, metadata: { attempt: 1, fallbackReason: "local_fallback" } }));
  });

  it("records local fallback success with the expected zeroed accounting", async () => {
    const { recordLocalAiFallback } = await import("./openai-responses");
    await expect(recordLocalAiFallback({ userId: "u2", actionKey: "company_research_report_generate", model: "gpt-5.6-terra", sourceTable: "jobs", sourceId: "j2", errorCode: "http_5xx", latencyMs: 0 })).resolves.toBe("usage-1");
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ requestStatus: "fallback", errorCode: "http_5xx", inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, webSearchCalls: 0, metadata: { attempt: 1, fallbackReason: "local_fallback" } }));
  });

  it.each([undefined, "   "])("does not fetch when API key is %p and records one safe error", async (apiKey) => {
    serverEnvMock.OPENAI_API_KEY = apiKey;
    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "unknown_error" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordAiUsageMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { actionKey: "company_research_report_generate", featureArea: "company_research", timeout: 90000 },
    { actionKey: "company_research_chat_generate", featureArea: "company_research", timeout: 90000 },
    { actionKey: "interview_follow_up_generate", featureArea: "ai_interview", timeout: 30000 },
    { actionKey: "resume_draft_generate", featureArea: "resume", timeout: 30000 }
  ] satisfies ReadonlyArray<{ actionKey: AiActionKey; featureArea: AiFeatureArea; timeout: number }>)("uses the configured timeout budget for $actionKey", async ({ actionKey, featureArea, timeout }) => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, actionKey, featureArea, fallbackModel: null, maxAttempts: 1, webSearch: false });
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: {} }));
    const { requestStructuredAi } = await import("./openai-responses");
    await requestStructuredAi({ userId: null, actionKey, systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });
    expect(abortSignalTimeoutMock).toHaveBeenCalledWith(timeout);
  });
});
