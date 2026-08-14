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
  return {
    selectLimitMock: selectLimit,
    selectWhereMock: selectWhere,
    selectFromMock: selectFrom,
    selectMock: select,
    insertValuesMock: insertValues,
    insertMock: insert,
    requireUserMock: vi.fn(),
    buildCompanyResearchResultFromQueryMock: vi.fn(),
    generateCompanyResearchReportMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    consumeAiCreditsMock: vi.fn()
  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ args })),
  desc: vi.fn(),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  gte: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  lt: vi.fn((left: unknown, right: unknown) => ({ left, right }))
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock
}));

vi.mock("@/lib/db/schema", () => ({
  companyResearches: {
    id: "id",
    userId: "userId",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    query: "query",
    websiteUrl: "websiteUrl",
    reportJson: "reportJson",
    chatMessagesJson: "chatMessagesJson"
  }
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: selectMock,
    insert: insertMock
  }
}));

vi.mock("@/lib/company-research/generate-result", () => ({
  buildCompanyResearchResultFromQuery: buildCompanyResearchResultFromQueryMock
}));

vi.mock("@/lib/company-research/report-generator", () => ({
  generateCompanyResearchReport: generateCompanyResearchReportMock
}));

vi.mock("@/lib/subscription", () => ({
  getUserPlan: vi.fn(async () => "free")
}));

vi.mock("@/lib/usage/counters", () => ({
  consumeAiCredits: consumeAiCreditsMock
}));

import { saveCompanyResearchAction } from "./company-research-actions";

describe("saveCompanyResearchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
    const report = {
      companyName: "テスト株式会社",
      generatedAt: "2026-07-20T00:00:00.000Z",
      estimatedPages: 24,
      estimatedFigures: 18,
      sections: [],
      sources: [],
      sourceChunks: [],
      suggestedQuestions: ["q1", "q2", "q3", "q4"]
    };
    const result = {
      companyName: "テスト株式会社",
      industry: "IT",
      location: "東京",
      size: "100名",
      summary: "summary",
      keyPoints: ["k1"],
      interviewHints: ["h1"],
      nextActions: ["n1"],
      report,
      chatMessages: []
    };
    buildCompanyResearchResultFromQueryMock.mockReturnValue(result);
    generateCompanyResearchReportMock.mockResolvedValue(result);
  });

  it("rejects free users who already consumed the single trial research", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: "existing-1" }]);

    await expect(saveCompanyResearchAction({ query: "https://example.com" })).resolves.toEqual({
      ok: false,
      message: expect.stringContaining("無料")
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("saves research while the user is still under the plan limit", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    insertValuesMock.mockResolvedValueOnce(undefined);
    consumeAiCreditsMock.mockResolvedValueOnce(undefined);

    const result = await saveCompanyResearchAction({ query: "https://example.com" });

    expect(result.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();
    expect(consumeAiCreditsMock).toHaveBeenCalledWith("user-1", "company_research");
    expect(revalidatePathMock).toHaveBeenCalledWith("/company-research");
  });

  it("returns an upgrade message when AI credits are exhausted", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    consumeAiCreditsMock.mockRejectedValueOnce(new Error("今月のAIクレジット上限（10）に達しています。"));

    await expect(saveCompanyResearchAction({ query: "https://example.com" })).resolves.toEqual({
      ok: false,
      message: expect.stringContaining("料金")
    });

    expect(insertMock).not.toHaveBeenCalled();
  });
});
