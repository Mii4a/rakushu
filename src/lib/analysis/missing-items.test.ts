import { describe, expect, it } from "vitest";

import type { ExtractedValue, JobWarnings, ParsedJob, Rank } from "./types";
import { buildMissingItemSummary, getUserFacingRank } from "./missing-items";

function extracted<T>(overrides: Partial<ExtractedValue<T>> = {}): ExtractedValue<T> {
  return {
    status: "unknown",
    value: null,
    evidence: null,
    source: "validation",
    confidence: "low",
    ...overrides
  };
}

function buildParsedJob(overrides: Partial<ParsedJob> = {}): ParsedJob {
  return {
    parserVersion: "v-test",
    companyName: extracted({ status: "found", value: "株式会社らくしゅう", evidence: "会社名: 株式会社らくしゅう", source: "direct_label", confidence: "high" }),
    title: extracted({ status: "found", value: "Webエンジニア", evidence: "職種: Webエンジニア", source: "direct_label", confidence: "high" }),
    employmentType: extracted({ status: "found", value: "正社員", evidence: "雇用形態: 正社員", source: "direct_label", confidence: "high" }),
    salaryText: extracted({ status: "found", value: "月給25万円以上", evidence: "給与: 月給25万円以上", source: "direct_label", confidence: "high" }),
    baseSalaryMin: extracted({ status: "found", value: 250000, evidence: "基本給: 250,000円", source: "direct_label", confidence: "high" }),
    baseSalaryMax: extracted({ status: "found", value: 300000, evidence: "基本給: 250,000円〜300,000円", source: "direct_label", confidence: "high" }),
    fixedOvertimeHours: extracted<number>({ status: "none", value: null, evidence: "固定残業代なし", source: "global_scan", confidence: "high" }),
    fixedOvertimePay: extracted<number>({ status: "none", value: null, evidence: "固定残業代なし", source: "global_scan", confidence: "high" }),
    annualHolidays: extracted({ status: "found", value: 125, evidence: "年間休日125日", source: "direct_label", confidence: "high" }),
    holidayType: extracted({ status: "found", value: "完全週休2日制", evidence: "完全週休2日制", source: "section", confidence: "high" }),
    bonusCount: extracted({ status: "found", value: 2, evidence: "賞与年2回", source: "global_scan", confidence: "high" }),
    bonusPerformanceLinked: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    housingAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    companyHousing: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    retirementAllowance: extracted<boolean>({ status: "found", value: true, evidence: "退職金制度あり", source: "direct_label", confidence: "high" }),
    benefits: extracted({ status: "found", value: ["社会保険完備"], evidence: "福利厚生: 社会保険完備", source: "section", confidence: "high" }),
    warnings: extracted<JobWarnings[]>({ status: "none", value: null, evidence: "警告キーワードなし", source: "global_scan", confidence: "high" }),
    ...overrides
  };
}

describe("buildMissingItemSummary", () => {
  it("classifies annual holidays as missing in raw text when the field is unknown and no visible signal exists", () => {
    const parsed = buildParsedJob({
      annualHolidays: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const summary = buildMissingItemSummary(parsed, [
      "会社名: 株式会社らくしゅう",
      "雇用形態: 正社員",
      "給与: 月給25万円以上",
      "福利厚生: 社会保険完備"
    ].join("\n"));

    expect(summary.missingInRawText).toContain("annualHolidays");
    expect(summary.ambiguousButVisible).not.toContain("annualHolidays");
    expect(summary.thinInput).toBe(true);
  });

  it("classifies employment type as ambiguous when a visible signal exists but extraction stayed unknown", () => {
    const parsed = buildParsedJob({
      employmentType: extracted<string>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const summary = buildMissingItemSummary(parsed, [
      "会社名: 株式会社らくしゅう",
      "雇用形態",
      "給与: 月給25万円以上",
      "年間休日125日"
    ].join("\n"));

    expect(summary.ambiguousButVisible).toContain("employmentType");
    expect(summary.missingInRawText).not.toContain("employmentType");
    expect(summary.thinInput).toBe(false);
  });
});

describe("getUserFacingRank", () => {
  it("maps UNKNOWN to E only when the field is confirmed missing in raw text", () => {
    expect(getUserFacingRank("UNKNOWN", { missingInRawText: true })).toBe("E");
  });

  it("keeps UNKNOWN when extraction may have failed despite a visible signal", () => {
    expect(getUserFacingRank("UNKNOWN", { missingInRawText: false })).toBe("UNKNOWN");
  });

  it("keeps non-UNKNOWN ranks unchanged", () => {
    const rank: Rank = "B";
    expect(getUserFacingRank(rank, { missingInRawText: true })).toBe("B");
  });
});
