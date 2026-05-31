import { describe, expect, it } from "vitest";

import { buildJobAnalysisFeedbackInsert } from "./feedback";
import type { ExtractedValue, JobWarnings, ParsedJob } from "./types";

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
    salaryText: extracted({ status: "found", value: "25万円以上", evidence: "月給25万円以上", source: "summary_line", confidence: "medium" }),
    baseSalaryMin: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    baseSalaryMax: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    fixedOvertimeHours: extracted<number>({ status: "none", value: null, evidence: "固定残業代なし", source: "global_scan", confidence: "high" }),
    fixedOvertimePay: extracted<number>({ status: "none", value: null, evidence: "固定残業代なし", source: "global_scan", confidence: "high" }),
    annualHolidays: extracted({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    holidayType: extracted({ status: "found", value: "完全週休2日制", evidence: "完全週休2日制", source: "section", confidence: "high" }),
    bonusCount: extracted({ status: "found", value: 2, evidence: "賞与年2回", source: "global_scan", confidence: "high" }),
    bonusPerformanceLinked: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    housingAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    companyHousing: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    retirementAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    benefits: extracted({ status: "found", value: ["社会保険完備"], evidence: "福利厚生: 社会保険完備", source: "section", confidence: "high" }),
    warnings: extracted<JobWarnings[]>({ status: "none", value: null, evidence: "警告キーワードなし", source: "global_scan", confidence: "high" }),
    ...overrides
  };
}

describe("buildJobAnalysisFeedbackInsert", () => {
  it("stops storing raw excerpts for new feedback rows", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const parsed = buildParsedJob();

    const result = buildJobAnalysisFeedbackInsert({
      analysisId: "analysis-1",
      rawText: "株式会社らくしゅう 正社員 月給25万円以上 年間休日125日",
      parsed,
      now
    });

    expect(result).not.toBeNull();
    expect(result?.summaryText).toContain("給与");
    expect(result?.rawExcerpt).toBeNull();
  });
});
