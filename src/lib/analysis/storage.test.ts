import { describe, expect, it } from "vitest";

import { buildStoredMissingItemSummary, buildStoredParsedJobSnapshot, serializeStoredParsedJobSnapshot } from "./storage";
import type { ExtractedValue, JobWarnings, ParsedJob } from "./types";

function extracted<T>(value: ExtractedValue<T>): ExtractedValue<T> {
  return value;
}

function buildParsedJob(overrides: Partial<ParsedJob> = {}): ParsedJob {
  return {
    parserVersion: "v-test",
    companyName: extracted({ status: "found", value: "株式会社らくしゅう", evidence: "会社名: 株式会社らくしゅう", source: "direct_label", confidence: "high" }),
    title: extracted({ status: "found", value: "Webエンジニア", evidence: "職種: Webエンジニア", source: "direct_label", confidence: "high" }),
    employmentType: extracted({ status: "found", value: "正社員", evidence: "雇用形態: 正社員", source: "direct_label", confidence: "high" }),
    salaryText: extracted({ status: "found", value: "月給25万円以上", evidence: "給与: 月給25万円以上", source: "summary_line", confidence: "medium" }),
    baseSalaryMin: extracted({ status: "found", value: 250000, evidence: "基本給: 250,000円", source: "direct_label", confidence: "high" }),
    baseSalaryMax: extracted({ status: "found", value: 320000, evidence: "基本給: 250,000円〜320,000円", source: "direct_label", confidence: "high" }),
    fixedOvertimeHours: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    fixedOvertimePay: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    annualHolidays: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    holidayType: extracted<"完全週休2日制" | "週休2日制">({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    bonusCount: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    bonusPerformanceLinked: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    housingAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    companyHousing: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    retirementAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
    benefits: extracted({ status: "found", value: ["社会保険完備"], evidence: "福利厚生: 社会保険完備", source: "section", confidence: "high" }),
    warnings: extracted<JobWarnings[]>({ status: "none", value: null, evidence: "警告キーワードなし", source: "global_scan", confidence: "high" }),
    ...overrides
  };
}

describe("buildStoredParsedJobSnapshot", () => {
  it("keeps statuses and values but strips evidence strings", () => {
    const snapshot = buildStoredParsedJobSnapshot(buildParsedJob());

    expect(snapshot.companyName.value).toBe("株式会社らくしゅう");
    expect(snapshot.companyName.status).toBe("found");
    expect(snapshot.companyName.evidence).toBeNull();
    expect(snapshot.salaryText.evidence).toBeNull();
    expect(snapshot.benefits.evidence).toBeNull();
    expect(snapshot.warnings.evidence).toBeNull();
  });

  it("serializes without leaking raw evidence text fragments", () => {
    const serialized = serializeStoredParsedJobSnapshot(buildParsedJob());

    expect(serialized).toContain("株式会社らくしゅう");
    expect(serialized).not.toContain("会社名: 株式会社らくしゅう");
    expect(serialized).not.toContain("給与: 月給25万円以上");
    expect(serialized).not.toContain("福利厚生: 社会保険完備");
  });
});

describe("buildStoredMissingItemSummary", () => {
  it("preserves missing-vs-ambiguous judgment after raw text is discarded", () => {
    const parsed = buildParsedJob();
    const summary = buildStoredMissingItemSummary(
      [
        "会社名: 株式会社らくしゅう",
        "雇用形態: 正社員",
        "給与: 月給25万円以上",
        "福利厚生: 社会保険完備",
        "賞与",
        "完全週休2日制"
      ].join("\n"),
      parsed
    );

    expect(summary.missingInRawText).toContain("retirementAllowance");
    expect(summary.ambiguousButVisible).toContain("bonusCount");
    expect(summary.missingInRawText).toContain("fixedOvertimeHours");
    expect(summary.thinInput).toBe(false);
  });
});
