import { describe, expect, it } from "vitest";

import { PLAN_LIMITS, PLAN_MARKETING } from "./plans";

describe("plans", () => {
  it("uses the revised paid prices", () => {
    expect(PLAN_MARKETING.starter.priceYen).toBe(480);
    expect(PLAN_MARKETING.plus.priceYen).toBe(980);
    expect(PLAN_MARKETING.pro.priceYen).toBe(1980);
  });

  it("opens one trial company research and one trial AI interview session on free", () => {
    expect(PLAN_LIMITS.free.features.companyResearch).toBe(true);
    expect(PLAN_LIMITS.free.features.aiInterview).toBe(true);
    expect(PLAN_LIMITS.free.maxCompanyResearches).toBe(1);
    expect(PLAN_LIMITS.free.maxAiInterviewSessions).toBe(1);
    expect(PLAN_LIMITS.free.maxAnalyses).toBe(3);
    expect(PLAN_LIMITS.free.analysisPeriod).toBe("week");
  });

  it("positions starter as the first one-company completion pack", () => {
    expect(PLAN_MARKETING.starter.audience).toContain("一社");
    expect(PLAN_MARKETING.starter.uses.some((item) => item.includes("完遂"))).toBe(true);
  });

  it("keeps plus as the ongoing bundled plan after starter", () => {
    expect(PLAN_MARKETING.plus.audience).toContain("複数社");
    expect(PLAN_LIMITS.starter.maxAiInterviewSessions).toBe(2);
    expect(PLAN_LIMITS.plus.features.aiInterview).toBe(true);
    expect(PLAN_LIMITS.plus.maxAiInterviewSessions).toBeGreaterThan(PLAN_LIMITS.starter.maxAiInterviewSessions);
    expect(PLAN_LIMITS.plus.maxCompanyResearches).toBeGreaterThan(PLAN_LIMITS.starter.maxCompanyResearches);
  });
});
