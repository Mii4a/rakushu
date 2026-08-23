import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectLimitMock,
  selectMock,
  insertValuesMock,
  insertMock,
  updateMock,

} = vi.hoisted(() => {
  const selectLimit = vi.fn();
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));
  const insertValues = vi.fn();
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const insert = vi.fn(() => ({ values: insertValues }));
  const update = vi.fn(() => ({ set: updateSet }));

  return {
    selectLimitMock: selectLimit,
    selectMock: select,
    insertValuesMock: insertValues,
    insertMock: insert,
    updateMock: update,

  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  eq: vi.fn((left: unknown, right: unknown) => ({ type: "eq", left, right }))
}));

vi.mock("@/lib/db/schema", () => ({
  usageCounters: {
    id: "id",
    userId: "userId",
    monthKey: "monthKey"
  }
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock
  }
}));

vi.mock("@/lib/plans", () => ({
  AI_CREDIT_COSTS: {
    company_research: 3
  },
  PLAN_LIMITS: {
    free: { monthlyAiCredits: 5 },
    starter: { monthlyAiCredits: 20 }
  }
}));

vi.mock("@/lib/subscription", () => ({
  getUserPlan: vi.fn(async () => "free")
}));

import { assertAiCreditsAvailable, getAnalysisCount, getMonthKey, incrementAnalysisCount } from "./counters";

describe("usage counters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats month key as YYYY-MM", () => {
    expect(getMonthKey(new Date("2026-04-25T12:00:00.000Z"))).toBe("2026-04");
  });

  it("returns zero analysis count when no record exists", async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(getAnalysisCount("user-1", "2026-04")).resolves.toBe(0);
  });

  it("creates analysis counter row when missing", async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await incrementAnalysisCount("user-1", "2026-04");

    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        monthKey: "2026-04",
        analysisCount: 1
      })
    );
  });

  it("asserts company research credits without writing when under limit", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: "usage-1", aiCreditsUsed: 2 }]);

    await expect(assertAiCreditsAvailable("user-1", "company_research", "2026-04")).resolves.toBeUndefined();

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("throws the same limit message and does not write when credits are exhausted", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: "usage-1", aiCreditsUsed: 3 }]);

    await expect(assertAiCreditsAvailable("user-1", "company_research", "2026-04")).rejects.toThrow("今月のAIクレジット上限（5）に達しています。");

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
