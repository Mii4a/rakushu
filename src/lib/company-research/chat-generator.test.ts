import { beforeEach, describe, expect, test, vi } from "vitest";

import { buildMockCompanyResearchReport } from "./mock-data";
import { generateCompanyResearchChatAnswer } from "./chat-generator";
import type { CompanyResearchChatMessage } from "./types";

const requestStructuredAiMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/openai-responses", () => ({
  requestStructuredAi: requestStructuredAiMock
}));

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomUUID: () => "uuid-1"
  };
});

type RequestInput = {
  userId: string;
  actionKey: string;
  sourceTable: string;
  sourceId: string;
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: {
    type: string;
    additionalProperties: boolean;
    required: string[];
    properties: {
      content: { type: string; minLength: number; maxLength: number };
      citations: { type: string; minItems: number; maxItems: number; items: { type: string; additionalProperties: boolean; required: string[]; properties: { sourceId: { type: string; minLength: number; maxLength: number }; label: { type: string; minLength: number; maxLength: number } } } };
    };
  };
  parse: (value: unknown) => { content: string; citations: { sourceId: string; label: string }[] };
};

function buildReport() {
  const report = buildMockCompanyResearchReport("株式会社テスト");
  report.sourceChunks = [
    {
      id: "secret-chunk",
      sourceId: report.sources[0]!.id,
      title: "secret",
      text: "SENTINEL_SECRET_DO_NOT_LEAK"
    }
  ];
  return report;
}

function buildMessages(): CompanyResearchChatMessage[] {
  return [
    { id: "m1", role: "user", content: "こんにちは", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "m2", role: "assistant", content: "返答", createdAt: "2026-01-01T00:01:00.000Z" }
  ];
}

describe("generateCompanyResearchChatAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sends one strict structured request with shared policy fields and returns validated assistant message", async () => {
    const report = buildReport();
    requestStructuredAiMock.mockImplementationOnce(async (input: RequestInput) => {
      expect(input).toMatchObject({
        userId: "user-1",
        actionKey: "company_research_chat_generate",
        sourceTable: "company_researches",
        sourceId: "research-1",
        schemaName: "company_research_chat_answer"
      });
      expect(input.jsonSchema).toMatchObject({
        type: "object",
        additionalProperties: false,
        required: ["content", "citations"]
      });
      expect(input.jsonSchema.properties.content).toMatchObject({ type: "string", minLength: 1, maxLength: 4000 });
      expect(input.jsonSchema.properties.citations).toMatchObject({ type: "array", minItems: 0, maxItems: 20 });
      expect(JSON.stringify(input.jsonSchema)).not.toContain("sourceChunks");
      expect(input.userPrompt).toContain("saved report only");
      expect(input.userPrompt).toContain("Do not use Web Search");
      expect(input.userPrompt).toContain("untrusted and not evidence");
      expect(input.userPrompt).toContain(report.sources[0]!.id);
      expect(input.userPrompt).toContain("question: 質問は何ですか？");
      expect(input.userPrompt).toContain("こんにちは");
      expect(input.userPrompt).toContain("返答");
      expect(input.userPrompt).not.toContain("message-0");
      expect(input.userPrompt).not.toContain("SENTINEL_SECRET_DO_NOT_LEAK");
      return { data: input.parse({ content: "回答です。", citations: [{ sourceId: report.sources[0]!.id, label: "[1]" }] }), model: "gpt-5.4-mini", usageEventId: null };
    });

    const result = await generateCompanyResearchChatAnswer({
      userId: "user-1",
      researchId: "research-1",
      question: "  質問は何ですか？  ",
      report,
      previousMessages: buildMessages(),
      now: new Date("2026-01-01T00:02:00.000Z")
    });

    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: "uuid-1",
      role: "assistant",
      content: "回答です。",
      citations: [{ sourceId: report.sources[0]!.id, label: "[1]" }],
      createdAt: "2026-01-01T00:02:00.000Z"
    });
  });

  test("includes report sections sources question and history but excludes sourceChunks from prompt", async () => {
    const report = buildReport();
    requestStructuredAiMock.mockResolvedValueOnce({ data: { content: "ok", citations: [] }, model: "gpt-5.4-mini", usageEventId: null });

    await generateCompanyResearchChatAnswer({
      userId: "user-1",
      researchId: "research-1",
      question: "質問",
      report,
      previousMessages: Array.from({ length: 9 }, (_, index) => ({
        id: `m-${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        content: `message-${index}`,
        createdAt: `2026-01-01T00:0${index}:00.000Z`
      })),
      now: new Date("2026-01-01T00:02:00.000Z")
    });

    const input = requestStructuredAiMock.mock.calls[0]?.[0] as RequestInput;
    expect(input.userPrompt).toContain(report.sections[0]!.title);
    expect(input.userPrompt).toContain(report.sources[0]!.id);
    expect(input.userPrompt).toContain("message-8");
    expect(input.userPrompt).not.toContain("message-0");
    expect(input.userPrompt).not.toContain("SENTINEL_SECRET_DO_NOT_LEAK");
  });

  test.each(["", "   ", "x".repeat(201)])("rejects invalid question before common call: %s", async (question) => {
    const report = buildReport();
    await expect(generateCompanyResearchChatAnswer({ userId: "user-1", researchId: "research-1", question, report, previousMessages: [], now: new Date() })).rejects.toThrow(
      "Company research chat generation failed"
    );
    expect(requestStructuredAiMock).not.toHaveBeenCalled();
  });

  test.each([
    { content: "", citations: [] },
    { content: "x".repeat(4001), citations: [] },
    { content: "ok", citations: [{ sourceId: "wrong", label: "[1]" }] },
    { content: "ok", citations: [{ sourceId: "", label: "[1]" }] },
    { content: "ok", citations: [{ sourceId: buildReport().sources[0]!.id, label: "" }] },
    { content: "ok", citations: [{ sourceId: buildReport().sources[0]!.id, label: "x".repeat(101) }] },
    { content: "ok", citations: [{ sourceId: buildReport().sources[0]!.id, label: "[1]" }, { sourceId: buildReport().sources[0]!.id, label: "[1]" }] },
    { content: "ok", extra: true }
  ])("rejects malformed structured output %j", async (payload) => {
    const report = buildReport();
    requestStructuredAiMock.mockImplementationOnce(async (input: RequestInput) => ({ data: input.parse(payload), model: "gpt-5.4-mini", usageEventId: null }));

    await expect(generateCompanyResearchChatAnswer({ userId: "user-1", researchId: "research-1", question: "質問", report, previousMessages: [], now: new Date() })).rejects.toThrow(
      "Company research chat generation failed"
    );
  });

  test("accepts valid empty citations explicitly", async () => {
    const report = buildReport();
    requestStructuredAiMock.mockResolvedValueOnce({ data: { content: "ok", citations: [] }, model: "gpt-5.4-mini", usageEventId: null });

    const result = await generateCompanyResearchChatAnswer({ userId: "user-1", researchId: "research-1", question: "質問", report, previousMessages: [], now: new Date("2026-01-01T00:02:00.000Z") });

    expect(result.citations).toEqual([]);
  });

  test("propagates common rejection without fallback", async () => {
    const report = buildReport();
    requestStructuredAiMock.mockRejectedValueOnce(new Error("provider down"));

    await expect(generateCompanyResearchChatAnswer({ userId: "user-1", researchId: "research-1", question: "質問", report, previousMessages: [], now: new Date() })).rejects.toThrow(
      "provider down"
    );
    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
  });
});
