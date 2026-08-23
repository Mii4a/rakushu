import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, fromMock, whereMock, gteMock, ltMock, rows } = vi.hoisted(() => {
  const select = vi.fn();
  const from = vi.fn();
  const where = vi.fn();
  const gte = vi.fn();
  const lt = vi.fn();
  const rows: Array<Record<string, unknown>> = [];
  return { selectMock: select, fromMock: from, whereMock: where, gteMock: gte, ltMock: lt, rows };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  asc: vi.fn((value: unknown) => ({ op: "asc", value })),
  desc: vi.fn((value: unknown) => ({ op: "desc", value })),
  gte: gteMock,
  lt: ltMock
}));

vi.mock("../db/client", () => ({
  db: {
    select: selectMock
  }
}));

vi.mock("../db/schema", () => ({
  aiUsageEvents: {
    createdAt: "createdAt",
    userId: "userId",
    model: "model",
    featureArea: "featureArea",
    actionKey: "actionKey",
    requestStatus: "requestStatus",
    totalCostMilliYen: "totalCostMilliYen"
  }
}));

import { aggregateAiCostEvents, getAiCostDashboard, getJstCalendarRange } from "./ai-cost";

beforeEach(() => {
  vi.clearAllMocks();
  rows.length = 0;
  selectMock.mockReturnValue({ from: fromMock });
  fromMock.mockReturnValue({ where: whereMock });
  whereMock.mockResolvedValue(rows);
});

describe("getJstCalendarRange", () => {
  it("returns JST calendar day boundaries anchored to next JST midnight", () => {
    const now = new Date("2026-08-21T15:30:00.000Z");
    const { from, to } = getJstCalendarRange(7, now);

    expect(from.toISOString()).toBe("2026-08-15T15:00:00.000Z");
    expect(to.toISOString()).toBe("2026-08-22T15:00:00.000Z");
  });

  it("returns a 30-day JST calendar range without drifting at the UTC date boundary", () => {
    const now = new Date("2026-08-21T15:30:00.000Z");
    const { from, to } = getJstCalendarRange(30, now);

    expect(from.toISOString()).toBe("2026-07-23T15:00:00.000Z");
    expect(to.toISOString()).toBe("2026-08-22T15:00:00.000Z");
  });

  it("rejects invalid day counts and dates with a safe error", () => {
    expect(() => getJstCalendarRange(0)).toThrow("Invalid AI cost date range");
    expect(() => getJstCalendarRange(Number.NaN)).toThrow("Invalid AI cost date range");
    expect(() => getJstCalendarRange(Number.MAX_SAFE_INTEGER)).toThrow("Invalid AI cost date range");
    expect(() => getJstCalendarRange(7, new Date("invalid"))).toThrow("Invalid AI cost date range");
  });
});

describe("aggregateAiCostEvents", () => {
  it("tracks priced, unpriced, success-only unit cost, fallback and error rates", () => {
    const dashboard = aggregateAiCostEvents([
      { userId: "u1", model: "m1", featureArea: "f1", actionKey: "a1", requestStatus: "success", totalCostMilliYen: 10 },
      { userId: "null", model: "m1", featureArea: "f1", actionKey: "a1", requestStatus: "success", totalCostMilliYen: null },
      { userId: null, model: "m1", featureArea: "f1", actionKey: "a1", requestStatus: "fallback", totalCostMilliYen: null },
      { userId: "u1", model: "m2", featureArea: "f2", actionKey: "a2", requestStatus: "error", totalCostMilliYen: 5 }
    ]);

    expect(dashboard.totalCalls).toBe(4);
    expect(dashboard.successCalls).toBe(2);
    expect(dashboard.fallbackCalls).toBe(1);
    expect(dashboard.errorCalls).toBe(1);
    expect(dashboard.completedCalls).toBe(3);
    expect(dashboard.totalCostMilliYen).toBe(15);
    expect(dashboard.unpricedCalls).toBe(2);
    expect(dashboard.costPerSuccessfulRunMilliYen).toBe(7.5);
    expect(dashboard.fallbackRate).toBe(1 / 3);
    expect(dashboard.errorRate).toBe(1 / 4);
    expect(dashboard.byModel.map((group) => group.key)).toEqual(["m1", "m2"]);
    expect(dashboard.byModel.find((group) => group.key === "m1")?.totalCostMilliYen).toBe(10);
    expect(dashboard.byAction.find((group) => group.key === "a2")?.errorCalls).toBe(1);
    expect(dashboard.byFeature.find((group) => group.key === "f1")?.completedCalls).toBe(3);
    expect(dashboard.byUser.find((group) => group.key === null)?.unpricedCalls).toBe(1);
    expect(dashboard.byUser.find((group) => group.key === "null")?.successCalls).toBe(1);
    expect(dashboard.byUser.filter((group) => group.key === null || group.key === "null")).toHaveLength(2);
  });

  it("keeps null users distinct from sentinel-looking literal IDs and sorts null last on ties", () => {
    const dashboard = aggregateAiCostEvents([
      { userId: null, model: "m", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 0 },
      { userId: "null", model: "m", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 0 },
      { userId: "__null__", model: "m", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 0 }
    ]);

    expect(dashboard.byUser.map((group) => group.key)).toEqual(["__null__", "null", null]);
  });

  it("sorts breakdowns by cost, then calls, then lexical key", () => {
    const dashboard = aggregateAiCostEvents([
      { userId: "u", model: "a", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 10 },
      { userId: "u", model: "b", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 5 },
      { userId: "u", model: "b", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 5 },
      { userId: "u", model: "d", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 5 },
      { userId: "u", model: "c", featureArea: "f", actionKey: "a", requestStatus: "success", totalCostMilliYen: 5 }
    ]);

    expect(dashboard.byModel.map((group) => group.key)).toEqual(["b", "a", "c", "d"]);
  });

  it("returns zeros and nulls when there are no successful or total calls", () => {
    const dashboard = aggregateAiCostEvents([]);
    expect(dashboard.totalCalls).toBe(0);
    expect(dashboard.totalCostMilliYen).toBe(0);
    expect(dashboard.costPerSuccessfulRunMilliYen).toBeNull();
    expect(dashboard.fallbackRate).toBe(0);
    expect(dashboard.errorRate).toBe(0);
  });
});

describe("getAiCostDashboard", () => {
  it("queries only the safe projection with gte/lt createdAt bounds and omits prompt-like fields", async () => {
    rows.push({ userId: "u1", model: "m1", featureArea: "f1", actionKey: "a1", requestStatus: "success", totalCostMilliYen: 1 });

    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-02T00:00:00.000Z");
    const dashboard = await getAiCostDashboard({ from, to });

    expect(selectMock).toHaveBeenCalledWith({
      userId: "userId",
      model: "model",
      featureArea: "featureArea",
      actionKey: "actionKey",
      requestStatus: "requestStatus",
      totalCostMilliYen: "totalCostMilliYen"
    });
    expect(gteMock).toHaveBeenCalledWith("createdAt", from);
    expect(ltMock).toHaveBeenCalledWith("createdAt", to);
    expect(whereMock).toHaveBeenCalledWith(expect.objectContaining({ op: "and" }));
    expect(dashboard.byUser.find((group) => group.key === "u1")?.totalCalls).toBe(1);
  });

  it("rejects invalid date ranges safely", async () => {
    await expect(getAiCostDashboard({ from: new Date("invalid"), to: new Date() })).rejects.toThrow("Invalid AI cost date range");
    await expect(getAiCostDashboard({ from: new Date(), to: new Date() })).rejects.toThrow("Invalid AI cost date range");
  });
});
