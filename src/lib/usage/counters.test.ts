import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFirstMock,
  insertValuesMock,
  updateWhereMock,
  updateSetMock,
  insertMock,
  updateMock
} = vi.hoisted(() => {
  const findFirst = vi.fn();
  const insertValues = vi.fn();
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const insert = vi.fn(() => ({ values: insertValues }));
  const update = vi.fn(() => ({ set: updateSet }));

  return {
    findFirstMock: findFirst,
    insertValuesMock: insertValues,
    updateWhereMock: updateWhere,
    updateSetMock: updateSet,
    insertMock: insert,
    updateMock: update
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
    query: {
      usageCounters: {
        findFirst: findFirstMock
      }
    },
    insert: insertMock,
    update: updateMock
  }
}));

vi.mock("@/lib/plans", () => ({
  AI_CREDIT_COSTS: {},
  PLAN_LIMITS: {}
}));

vi.mock("@/lib/subscription", () => ({
  getUserPlan: vi.fn()
}));

import { getAnalysisCount, getMonthKey, incrementAnalysisCount } from "./counters";

describe("usage counters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats month key as YYYY-MM", () => {
    expect(getMonthKey(new Date("2026-04-25T12:00:00.000Z"))).toBe("2026-04");
  });

  it("returns zero analysis count when no record exists", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);

    await expect(getAnalysisCount("user-1", "2026-04")).resolves.toBe(0);
  });

  it("creates analysis counter row when missing", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);

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
});
