import { describe, expect, it } from "vitest";

import type { ExtractedValue, JobWarnings, ParsedJob } from "./types";
import { evaluateParsedJobQuality, shouldCreateFeedback } from "./quality";

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
    salaryText: extracted({ status: "found", value: "25万円以上", evidence: "給与: 月給25万円以上", source: "direct_label", confidence: "high" }),
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
    retirementAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    benefits: extracted({ status: "found", value: ["社会保険完備"], evidence: "福利厚生: 社会保険完備", source: "section", confidence: "high" }),
    warnings: extracted<JobWarnings[]>({ status: "none", value: null, evidence: "警告キーワードなし", source: "global_scan", confidence: "high" }),
    ...overrides
  };
}

describe("evaluateParsedJobQuality", () => {
  it("marks salary text without base salary as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      baseSalaryMin: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
      baseSalaryMax: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("給与: 月給25万円以上", parsed);

    expect(report.failureTypes).toContain("salary_text_without_base_salary");
    expect(report.severity).toBe("high");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("marks benefits suspicion without extracted benefits as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      benefits: extracted<string[]>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("福利厚生: 住宅手当 / 通勤手当 / 社会保険完備", parsed);

    expect(report.failureTypes).toContain("benefits_suspected_but_not_extracted");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("marks summary-line-heavy parses with missing critical fields as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      companyName: extracted({ status: "found", value: "株式会社らくしゅう", evidence: "株式会社らくしゅう", source: "summary_line", confidence: "medium" }),
      employmentType: extracted({ status: "found", value: "正社員", evidence: "正社員", source: "summary_line", confidence: "medium" }),
      salaryText: extracted({ status: "found", value: "25万円以上", evidence: "月給25万円以上", source: "summary_line", confidence: "medium" }),
      baseSalaryMin: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
      annualHolidays: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("株式会社らくしゅう 正社員 月給25万円以上", parsed);

    expect(report.failureTypes).toContain("summary_line_only_extraction");
    expect(report.failureTypes).toContain("too_many_unknown_critical_fields");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("does not create feedback when only company name is unknown", () => {
    const parsed = buildParsedJob({
      companyName: extracted<string>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("雇用形態: 正社員\n給与: 月給25万円以上\n年間休日125日", parsed);

    expect(report.failureTypes).not.toContain("too_many_unknown_critical_fields");
    expect(shouldCreateFeedback(report)).toBe(false);
  });

  it("does not create feedback for warning-heavy text when critical extraction is still healthy", () => {
    const parsed = buildParsedJob({
      warnings: extracted<JobWarnings[]>({
        status: "found",
        value: ["アットホーム", "若手活躍", "やりがい"],
        evidence: "アットホーム / 若手活躍 / やりがい",
        source: "global_scan",
        confidence: "high"
      })
    });

    const report = evaluateParsedJobQuality("アットホームで若手活躍、やりがいのある職場です。", parsed);

    expect(report.failureTypes).toEqual([]);
    expect(report.severity).toBe("none");
    expect(shouldCreateFeedback(report)).toBe(false);
  });
});
