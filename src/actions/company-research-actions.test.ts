import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectLimitMock,
  selectMock,
  insertValuesMock,
  insertMock,
  requireUserMock,
  buildCompanyResearchResultFromQueryMock,
  generateCompanyResearchReportMock,
  revalidatePathMock,
  consumeAiCreditsMock
} = vi.hoisted(() => {
  const selectLimit = vi.fn();
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));
  const insertValues = vi.fn();
  const insert = vi.fn(() => ({ values: insertValues }));
  return { selectLimitMock: selectLimit, selectWhereMock: selectWhere, selectFromMock: selectFrom, selectMock: select, insertValuesMock: insertValues, insertMock: insert, requireUserMock: vi.fn(), buildCompanyResearchResultFromQueryMock: vi.fn(), generateCompanyResearchReportMock: vi.fn(), revalidatePathMock: vi.fn(), consumeAiCreditsMock: vi.fn() };
});

vi.mock("drizzle-orm", () => ({ and: vi.fn((...args: unknown[]) => ({ args })), desc: vi.fn(), eq: vi.fn((left: unknown, right: unknown) => ({ left, right })), gte: vi.fn((left: unknown, right: unknown) => ({ left, right })), lt: vi.fn((left: unknown, right: unknown) => ({ left, right })) }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/db/schema", () => ({ companyResearches: { id: "id", userId: "userId", createdAt: "createdAt", updatedAt: "updatedAt", query: "query", websiteUrl: "websiteUrl", reportJson: "reportJson", chatMessagesJson: "chatMessagesJson" } }));
vi.mock("@/lib/db/client", () => ({ db: { select: selectMock, insert: insertMock } }));
vi.mock("@/lib/company-research/generate-result", () => ({ buildCompanyResearchResultFromQuery: buildCompanyResearchResultFromQueryMock }));
vi.mock("@/lib/company-research/report-generator", () => ({ generateCompanyResearchReport: generateCompanyResearchReportMock }));
vi.mock("@/lib/subscription", () => ({ getUserPlan: vi.fn(async () => "free") }));
vi.mock("@/lib/usage/counters", () => ({ consumeAiCredits: consumeAiCreditsMock }));

import { saveCompanyResearchAction } from "./company-research-actions";

type GeneratedResult = {
  companyName: string;
  industry: string;
  location: string;
  size: string;
  summary: string;
  keyPoints: string[];
  interviewHints: string[];
  nextActions: string[];
  report: { companyName: string; generatedAt: string; estimatedPages: number; estimatedFigures: number; sections: never[]; sources: never[]; sourceChunks: never[]; suggestedQuestions: string[] };
  chatMessages: never[];
  model: string;
  usageEventId: string | null;
};

const generatedResult: GeneratedResult = { companyName: "テスト株式会社", industry: "IT", location: "東京", size: "100名", summary: "summary", keyPoints: ["k1"], interviewHints: ["h1"], nextActions: ["n1"], report: { companyName: "テスト株式会社", generatedAt: "2026-07-20T00:00:00.000Z", estimatedPages: 24, estimatedFigures: 18, sections: [], sources: [], sourceChunks: [], suggestedQuestions: ["q1", "q2", "q3", "q4"] }, chatMessages: [], model: "gpt-5.6-terra", usageEventId: null };

describe("saveCompanyResearchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
    buildCompanyResearchResultFromQueryMock.mockReturnValue(generatedResult);
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
    consumeAiCreditsMock.mockResolvedValueOnce(undefined);
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
