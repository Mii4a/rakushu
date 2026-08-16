import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiActionKey } from "./model-policy";

const { recordAiUsageMock, resolveAiModelPolicyMock, fetchMock, abortSignalTimeoutMock, nowMock, parseMock, serverEnvMock } = vi.hoisted(() => ({
  recordAiUsageMock: vi.fn(),
  resolveAiModelPolicyMock: vi.fn(),
  fetchMock: vi.fn(),
  abortSignalTimeoutMock: vi.fn(),
  nowMock: vi.fn(),
  parseMock: vi.fn(),
  serverEnvMock: { OPENAI_API_KEY: "test-key" }
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
  maxAttempts: 2 as const
};

const responseFixture = (overrides: Record<string, unknown> = {}) => ({ ok: true, status: 200, json: vi.fn(), ...overrides });

describe("openai responses client", () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resolveAiModelPolicyMock.mockReturnValue(basePolicy);
    recordAiUsageMock.mockResolvedValue("usage-1");
    fetchMock.mockReset();
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

  it("builds strict requests, omits temperature, and uses the attempt model body", async () => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, webSearch: false, fallbackModel: null, maxAttempts: 1 });
    fetchMock.mockResolvedValueOnce(responseFixture({ json: vi.fn().mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: {} }) }));

    const { requestStructuredAi } = await import("./openai-responses");
    await requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.model).toBe("gpt-5.4-mini");
    expect(body.temperature).toBeUndefined();
    expect(body.tools).toBeUndefined();
    expect(body.text.format.strict).toBe(true);
    expect(init.headers.Authorization).toBe("Bearer test-key");
  });

  it("uses fallback model in the second request body and records fallback success as success", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, json: vi.fn().mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":false}' }] }], usage: { input_tokens: 1, input_tokens_details: {}, output_tokens: 1, output_tokens_details: {} } }) })
      .mockResolvedValueOnce(responseFixture({ json: vi.fn().mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: { input_tokens: 2, input_tokens_details: {}, output_tokens: 2, output_tokens_details: {} } }) }));
    parseMock.mockImplementation((value: unknown) => value);

    const { requestStructuredAi } = await import("./openai-responses");
    const result = await requestStructuredAi({ userId: "u1", actionKey: "company_research_report_generate", sourceTable: "jobs", sourceId: "job-1", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("gpt-5.4-mini");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("gpt-5.6-terra");
    expect(recordAiUsageMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ requestStatus: "error", errorCode: "http_5xx", metadata: { attempt: 1 } }));
    expect(recordAiUsageMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ requestStatus: "success", metadata: { attempt: 2, fallbackReason: "api_error" } }));
    expect(result).toEqual({ data: { ok: true }, model: "gpt-5.6-terra", usageEventId: "usage-1" });
  });

  it("maps timeout, network, and HTTP failures without raw errors", async () => {
    resolveAiModelPolicyMock.mockReturnValue({ ...basePolicy, fallbackModel: null, maxAttempts: 1, webSearch: false });
    fetchMock.mockRejectedValueOnce({ name: "AbortError", message: "The operation was aborted." });
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: vi.fn().mockRejectedValue(new Error("no json")) });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockRejectedValue(new Error("no json")) });

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "timeout" });
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "network_error" });
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "http_429" });
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "invalid_json" });
    expect(recordAiUsageMock.mock.calls.some(([arg]) => JSON.stringify(arg).includes("abort"))).toBe(false);
  });

  it("distinguishes invalid_json, empty_output, and nonobject envelopes", async () => {
    fetchMock
      .mockResolvedValueOnce(responseFixture({ json: vi.fn().mockResolvedValue(null) }))
      .mockResolvedValueOnce(responseFixture({ json: vi.fn().mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "" }] }], usage: { input_tokens: 9, input_tokens_details: { cached_tokens: 99 }, output_tokens: 3, output_tokens_details: { reasoning_tokens: 99 } } }) }))
      .mockResolvedValueOnce(responseFixture({ json: vi.fn().mockResolvedValue([1, 2, 3]) }));

    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "invalid_json" });
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "empty_output" });
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "invalid_json" });
    expect(recordAiUsageMock).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "empty_output", inputTokens: 9, cachedInputTokens: 9, outputTokens: 3, reasoningTokens: 3 }));
  });

  it("records local fallback and does not expose null usage events when recorder throws", async () => {
    recordAiUsageMock.mockRejectedValueOnce(new Error("db down"));
    const { recordLocalAiFallback } = await import("./openai-responses");
    await expect(recordLocalAiFallback({ userId: "u1", actionKey: "company_research_report_generate", model: "gpt-5.6-terra", sourceTable: "jobs", sourceId: "j1", errorCode: "timeout", latencyMs: 12 })).resolves.toBeNull();
  });

  it("uses feature-area timeout budgets", async () => {
    resolveAiModelPolicyMock.mockReturnValueOnce({ ...basePolicy, actionKey: "company_research_chat_generate", maxAttempts: 1, fallbackModel: null, webSearch: false });
    fetchMock.mockResolvedValueOnce(responseFixture({ json: vi.fn().mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: {} }) }));
    const { requestStructuredAi } = await import("./openai-responses");
    await requestStructuredAi({ userId: null, actionKey: "company_research_chat_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock });
    expect(abortSignalTimeoutMock).toHaveBeenCalledWith(90000);
  });

  it("does not fetch when API key is missing and records one safe error", async () => {
    serverEnvMock.OPENAI_API_KEY = "";
    const { requestStructuredAi } = await import("./openai-responses");
    await expect(requestStructuredAi({ userId: null, actionKey: "company_research_report_generate", systemPrompt: "sys", userPrompt: "usr", schemaName: "Test", jsonSchema: { type: "object" }, parse: parseMock })).rejects.toMatchObject({ code: "unknown_error" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordAiUsageMock).toHaveBeenCalledTimes(1);
    serverEnvMock.OPENAI_API_KEY = "test-key";
  });
});
