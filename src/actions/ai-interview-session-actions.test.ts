import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectLimitMock,
  selectMock,
  insertValuesMock,
  insertMock,
  requireUserMock,
  revalidatePathMock,
  getUserPlanMock,
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
    revalidatePathMock: vi.fn(),
    getUserPlanMock: vi.fn(),
    consumeAiCreditsMock: vi.fn()
  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ args })),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  gte: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  inArray: vi.fn((left: unknown, right: unknown[]) => ({ left, right }))
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock
}));

vi.mock("@/lib/subscription", () => ({
  getUserPlan: getUserPlanMock
}));

vi.mock("@/lib/db/schema", () => ({
  aiInterviewSessions: {
    id: "id",
    userId: "userId"
  },
  aiInterviewSessionAnswers: {},
  aiInterviewConfirmedAnswers: {},
  aiInterviewGeneratedQuestions: {},
  aiInterviewCategoryFeedbacks: {}
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    delete: vi.fn(() => ({ where: vi.fn() })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }))
  }
}));

vi.mock("@/lib/usage/counters", () => ({
  consumeAiCredits: consumeAiCreditsMock
}));

import { createAiInterviewSessionAction } from "./ai-interview-session-actions";

describe("createAiInterviewSessionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
  });

  it("rejects starter users who already used both starter interview sessions", async () => {
    getUserPlanMock.mockResolvedValueOnce("starter");
    selectLimitMock.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }]);

    await expect(
      createAiInterviewSessionAction({
        settingSetName: "第一志望向け",
        interviewType: "first",
        targetCompany: "テスト株式会社",
        targetRole: "エンジニア",
        scenarioType: "new-grad"
      })
    ).resolves.toEqual({
      ok: false,
      message: expect.stringContaining("上限")
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates a new session while still under the plan limit", async () => {
    getUserPlanMock.mockResolvedValueOnce("free");
    selectLimitMock.mockResolvedValueOnce([]);
    insertValuesMock.mockResolvedValueOnce(undefined);
    consumeAiCreditsMock.mockResolvedValueOnce(undefined);

    const result = await createAiInterviewSessionAction({
      settingSetName: "練習1",
      interviewType: "first",
      targetCompany: "テスト株式会社",
      targetRole: "エンジニア",
      scenarioType: "new-grad"
    });

    expect(result.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();
    expect(consumeAiCreditsMock).toHaveBeenCalledWith("user-1", "ai_interview_session");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ai-interview");
  });

  it("returns an upgrade message when AI interview credits are exhausted", async () => {
    getUserPlanMock.mockResolvedValueOnce("free");
    selectLimitMock.mockResolvedValueOnce([]);
    consumeAiCreditsMock.mockRejectedValueOnce(new Error("今月のAIクレジット上限（10）に達しています。"));

    await expect(
      createAiInterviewSessionAction({
        settingSetName: "練習1",
        interviewType: "first",
        targetCompany: "テスト株式会社",
        targetRole: "エンジニア",
        scenarioType: "new-grad"
      })
    ).resolves.toEqual({
      ok: false,
      message: expect.stringContaining("料金")
    });

    expect(insertMock).not.toHaveBeenCalled();
  });
});
