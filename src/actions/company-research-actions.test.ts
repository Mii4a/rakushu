import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectLimitMock,
  insertValuesMock,
  insertMock,
  selectMock,
  updateSetMock,
  updateWhereMock,
  updateMock,
  requireUserMock,
  buildCompanyResearchResultFromQueryMock,
  generateCompanyResearchReportMock,
  generateCompanyResearchChatAnswerMock,
  revalidatePathMock,
  consumeAiCreditsMock
} = vi.hoisted(() => {
  const selectLimit = vi.fn();
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));
  const insertValues = vi.fn();
  const insert = vi.fn(() => ({ values: insertValues }));
  const updateWhere = vi.fn();
  const updateSet = vi.fn((values: unknown) => {
    void values;
    return { where: updateWhere };
  });
  const update = vi.fn(() => ({ set: updateSet }));
  return {
    selectLimitMock: selectLimit,
    insertValuesMock: insertValues,
    insertMock: insert,
    updateSetMock: updateSet,
    updateWhereMock: updateWhere,
    updateMock: update,
    requireUserMock: vi.fn(),
    buildCompanyResearchResultFromQueryMock: vi.fn(),
    generateCompanyResearchReportMock: vi.fn(),
    generateCompanyResearchChatAnswerMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    consumeAiCreditsMock: vi.fn(),
    selectMock: select
  };
});

vi.mock("drizzle-orm", () => ({ and: vi.fn((...args: unknown[]) => ({ args })), desc: vi.fn(), eq: vi.fn((left: unknown, right: unknown) => ({ left, right })), gte: vi.fn((left: unknown, right: unknown) => ({ left, right })), lt: vi.fn((left: unknown, right: unknown) => ({ left, right })) }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/db/schema", () => ({ companyResearches: { id: "id", userId: "userId", createdAt: "createdAt", updatedAt: "updatedAt", query: "query", websiteUrl: "websiteUrl", reportJson: "reportJson", chatMessagesJson: "chatMessagesJson" } }));
vi.mock("@/lib/db/client", () => ({ db: { select: selectMock, insert: insertMock, update: updateMock } }));
vi.mock("@/lib/company-research/generate-result", () => ({ buildCompanyResearchResultFromQuery: buildCompanyResearchResultFromQueryMock }));
vi.mock("@/lib/company-research/report-generator", () => ({ generateCompanyResearchReport: generateCompanyResearchReportMock }));
vi.mock("@/lib/company-research/chat-generator", () => ({ generateCompanyResearchChatAnswer: generateCompanyResearchChatAnswerMock }));
vi.mock("@/lib/subscription", () => ({ getUserPlan: vi.fn(async () => "free") }));
vi.mock("@/lib/usage/counters", () => ({ consumeAiCredits: consumeAiCreditsMock }));

import { saveCompanyResearchAction, askCompanyResearchQuestionAction } from "./company-research-actions";
import { buildMockCompanyResearchReport } from "@/lib/company-research/mock-data";

const generatedResult = {
  companyName: "テスト株式会社",
  industry: "IT",
  location: "東京",
  size: "100名",
  summary: "summary",
  keyPoints: ["k1"],
  interviewHints: ["h1"],
  nextActions: ["n1"],
  report: buildMockCompanyResearchReport("テスト株式会社"),
  chatMessages: [],
  model: "gpt-5.6-terra",
  usageEventId: null
};

describe("saveCompanyResearchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
    buildCompanyResearchResultFromQueryMock.mockReturnValue({ ...generatedResult, chatMessages: [] });
    generateCompanyResearchReportMock.mockResolvedValue({ result: generatedResult, model: "gpt-5.6-terra", usageEventId: null });
  });

  it("rejects free users who already consumed the single trial research", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: "existing-1" }]);
    await expect(saveCompanyResearchAction({ query: "https://example.com" })).resolves.toEqual({ ok: false, message: expect.stringContaining("無料") });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("passes userId and research context into the generator and persists the returned model", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    insertValuesMock.mockResolvedValueOnce(undefined);
    generateCompanyResearchReportMock.mockResolvedValueOnce({ result: { ...generatedResult, usageEventId: "usage-1" }, model: "gpt-5.6-terra", usageEventId: "usage-1" });

    const result = await saveCompanyResearchAction({ query: "https://example.com" });

    expect(result.ok).toBe(true);
    expect(consumeAiCreditsMock).toHaveBeenCalledTimes(1);
    expect(generateCompanyResearchReportMock).toHaveBeenCalledTimes(1);
    const called = generateCompanyResearchReportMock.mock.calls[0]?.[0] as { userId: string; researchId: string; websiteUrl: string; researchRequest: { websiteUrl: string } };
    expect(called.userId).toBe("user-1");
    expect(called.researchId).toEqual(expect.any(String));
    expect(called.websiteUrl).toBe("https://example.com/");
    expect(called.researchRequest.websiteUrl).toBe("https://example.com/");
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertValuesMock.mock.calls[0]?.[0]).toMatchObject({ id: called.researchId, modelName: "gpt-5.6-terra" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/company-research");
  });

  it("returns an upgrade message when AI credits are exhausted", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    consumeAiCreditsMock.mockRejectedValueOnce(new Error("今月のAIクレジット上限（10）に達しています。"));
    await expect(saveCompanyResearchAction({ query: "https://example.com" })).resolves.toEqual({ ok: false, message: expect.stringContaining("料金") });
    expect(insertMock).not.toHaveBeenCalled();
    expect(generateCompanyResearchReportMock).not.toHaveBeenCalled();
  });

  it("does not insert when generation fails", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    consumeAiCreditsMock.mockResolvedValueOnce(undefined);
    generateCompanyResearchReportMock.mockRejectedValueOnce(new Error("Company research report generation failed"));
    await expect(saveCompanyResearchAction({ query: "https://example.com" })).resolves.toEqual({ ok: false, message: expect.stringContaining("生成") });
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("askCompanyResearchQuestionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
  });

  it("rejects overlong questions before load/update/generator", async () => {
    await expect(askCompanyResearchQuestionAction({ researchId: "research-1", question: "x".repeat(201) })).resolves.toEqual({ ok: false, message: "質問は200文字以内で入力してください" });
    expect(selectLimitMock).not.toHaveBeenCalled();
    expect(generateCompanyResearchChatAnswerMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns not found for missing or other-user rows", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    await expect(askCompanyResearchQuestionAction({ researchId: "research-1", question: "質問" })).resolves.toEqual({ ok: false, message: "企業研究が見つかりませんでした" });
    expect(generateCompanyResearchChatAnswerMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("blocks after three prior user messages before model call", async () => {
    const report = buildMockCompanyResearchReport("テスト株式会社");
    selectLimitMock.mockResolvedValueOnce([{ id: "research-1", userId: "user-1", query: "https://example.com", reportJson: JSON.stringify(report), chatMessagesJson: JSON.stringify([
      { id: "m1", role: "user", content: "q1", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "m2", role: "assistant", content: "a1", createdAt: "2026-01-01T00:01:00.000Z" },
      { id: "m3", role: "user", content: "q2", createdAt: "2026-01-01T00:02:00.000Z" },
      { id: "m4", role: "assistant", content: "a2", createdAt: "2026-01-01T00:03:00.000Z" },
      { id: "m5", role: "user", content: "q3", createdAt: "2026-01-01T00:04:00.000Z" }
    ]), createdAt: new Date(), updatedAt: new Date() }]);
    await expect(askCompanyResearchQuestionAction({ researchId: "research-1", question: "質問" })).resolves.toEqual({ ok: false, message: expect.stringContaining("3") });
    expect(generateCompanyResearchChatAnswerMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects malformed history before model call", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: "research-1", userId: "user-1", query: "https://example.com", reportJson: "{}", chatMessagesJson: "[{\"id\":\"m1\",\"role\":\"user\",\"content\":\"q1\",\"createdAt\":\"2026-01-01T00:00:00.000Z\",\"citations\":[null]}]", createdAt: new Date(), updatedAt: new Date() }]);
    await expect(askCompanyResearchQuestionAction({ researchId: "research-1", question: "質問" })).resolves.toEqual({ ok: false, message: expect.stringContaining("履歴") });
    expect(generateCompanyResearchChatAnswerMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("succeeds with parsed fallback history and persists the appended messages without consuming credits", async () => {
    const report = buildMockCompanyResearchReport("テスト株式会社");
    selectLimitMock.mockResolvedValueOnce([{ id: "research-1", userId: "user-1", query: "https://example.com", reportJson: JSON.stringify(report), chatMessagesJson: null, createdAt: new Date(), updatedAt: new Date() }]);
    generateCompanyResearchChatAnswerMock.mockResolvedValueOnce({ id: "assistant-1", role: "assistant", content: "回答", createdAt: "2026-01-01T00:01:00.000Z", citations: [] });

    const result = await askCompanyResearchQuestionAction({ researchId: "research-1", question: "質問" });

    expect(result.ok).toBe(true);
    expect(consumeAiCreditsMock).not.toHaveBeenCalled();
    expect(generateCompanyResearchChatAnswerMock).toHaveBeenCalledTimes(1);
    const call = generateCompanyResearchChatAnswerMock.mock.calls[0]?.[0] as { userId: string; researchId: string; question: string; report: unknown; previousMessages: unknown[] };
    expect(call.userId).toBe("user-1");
    expect(call.researchId).toBe("research-1");
    expect(call.question).toBe("質問");
    expect(call.previousMessages).toEqual([]);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateValues = updateSetMock.mock.calls[0]?.[0] as { chatMessagesJson: string };
    expect(JSON.parse(updateValues.chatMessagesJson) as unknown).toEqual([
      expect.objectContaining({ role: "user", content: "質問" }),
      expect.objectContaining({ role: "assistant", content: "回答" })
    ]);
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/company-research");
  });

  it("returns a safe error and skips persistence when generation fails", async () => {
    const report = buildMockCompanyResearchReport("テスト株式会社");
    selectLimitMock.mockResolvedValueOnce([{ id: "research-1", userId: "user-1", query: "https://example.com", reportJson: JSON.stringify(report), chatMessagesJson: JSON.stringify([]), createdAt: new Date(), updatedAt: new Date() }]);
    generateCompanyResearchChatAnswerMock.mockRejectedValueOnce(new Error("provider down"));
    await expect(askCompanyResearchQuestionAction({ researchId: "research-1", question: "質問" })).resolves.toEqual({ ok: false, message: expect.stringContaining("生成") });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("falls back to parsed seed history when stored history is null", async () => {
    const report = buildMockCompanyResearchReport("テスト株式会社");
    selectLimitMock.mockResolvedValueOnce([{ id: "research-1", userId: "user-1", query: "https://example.com", reportJson: JSON.stringify(report), chatMessagesJson: undefined, createdAt: new Date(), updatedAt: new Date() }]);
    generateCompanyResearchChatAnswerMock.mockResolvedValueOnce({ id: "assistant-1", role: "assistant", content: "回答", createdAt: "2026-01-01T00:01:00.000Z" });

    await askCompanyResearchQuestionAction({ researchId: "research-1", question: "質問" });

    expect(generateCompanyResearchChatAnswerMock).toHaveBeenCalled();
  });
});
