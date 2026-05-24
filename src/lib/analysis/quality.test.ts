import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseJobText } from "./parser";
import type { ExtractedValue, JobWarnings, ParsedJob } from "./types";
import { evaluateParsedJobQuality, shouldCreateFeedback } from "./quality";

function readFixture(name: string): string {
  return readFileSync(resolve(process.cwd(), "fixtures/jobs", name), "utf8");
}

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
      salaryText: extracted({ status: "found", value: "25万円以上", evidence: "月給25万円以上", source: "summary_line", confidence: "medium" }),
      baseSalaryMin: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
      baseSalaryMax: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("給与: 月給25万円以上", parsed);

    expect(report.failureTypes).toContain("salary_text_without_base_salary");
    expect(report.severity).toBe("high");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("does not mark structured annual-salary detail pages as missing critical salary normalization", () => {
    const raw = readFixture("phase4-job-board-detail-annual-salary-usable-anon.txt");
    const parsed = parseJobText(raw);

    const report = evaluateParsedJobQuality(raw, parsed);

    expect(parsed.salaryText.value).toBe("305万円～315万円");
    expect(parsed.salaryText.source).toBe("section");
    expect(report.failureTypes).not.toContain("salary_text_without_base_salary");
    expect(shouldCreateFeedback(report)).toBe(false);
  });

  it("does not mark structured monthly-salary detail pages as missing critical salary normalization", () => {
    const raw = readFixture("phase4-job-board-detail-monthly-salary-usable-anon.txt");
    const parsed = parseJobText(raw);

    const report = evaluateParsedJobQuality(raw, parsed);

    expect(parsed.salaryText.value).toBe("21万7,100円 ～ 23万8,100円");
    expect(parsed.salaryText.source).toBe("section");
    expect(report.failureTypes).not.toContain("salary_text_without_base_salary");
    expect(shouldCreateFeedback(report)).toBe(false);
  });

  it("does not mark annual-salary-only listcards as missing critical salary normalization", () => {
    const raw = readFixture("phase3-en-agent-annual-salary-listcard-anon.txt");
    const parsed = parseJobText(raw);

    const report = evaluateParsedJobQuality(raw, parsed);

    expect(parsed.companyName.value).toBe("株式会社サンプルIR");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toBe("600万円～1000万円");
    expect(parsed.annualHolidays.status).toBe("unknown");
    expect(report.failureTypes).not.toContain("salary_text_without_base_salary");
    expect(report.failureTypes).not.toContain("too_many_unknown_critical_fields");
    expect(shouldCreateFeedback(report)).toBe(false);
  });

  it("marks benefits suspicion without extracted benefits as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      benefits: extracted<string[]>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("福利厚生: 住宅手当 / 通勤手当 / 社会保険完備", parsed);

    expect(report.failureTypes).toContain("benefits_suspected_but_not_extracted");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("marks summary-line-heavy parses with one missing documented critical field as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      companyName: extracted({ status: "found", value: "株式会社らくしゅう", evidence: "株式会社らくしゅう", source: "summary_line", confidence: "medium" }),
      employmentType: extracted({ status: "found", value: "正社員", evidence: "正社員", source: "summary_line", confidence: "medium" }),
      salaryText: extracted({ status: "found", value: "25万円以上", evidence: "月給25万円以上", source: "summary_line", confidence: "medium" }),
      baseSalaryMin: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" }),
      annualHolidays: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("株式会社らくしゅう 正社員 月給25万円以上", parsed);

    expect(report.failureTypes).toContain("summary_line_only_extraction");
    expect(report.failureTypes).not.toContain("too_many_unknown_critical_fields");
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

  it("marks negative inferred base salary as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      baseSalaryMin: extracted<number>({
        status: "found",
        value: -33200,
        evidence: "月給257,420円 / 固定残業代43,200円 / 基本給記載なしのため月給の最小値から固定残業代を差し引いて算出",
        source: "global_scan",
        confidence: "medium"
      }),
      baseSalaryMax: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("想定年収：300～400万円\n固定残業代43,200円", parsed);

    expect(report.failureTypes).toContain("negative_base_salary_detected");
    expect(report.severity).toBe("high");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("marks platform-polluted company names as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      companyName: extracted({
        status: "found",
        value: "転職・求人doda（デューダ）トップ人材サービス・アウトソーシング業界・コールセンター人材派遣北斗株式会社",
        evidence: "転職・求人doda（デューダ）トップ人材サービス・アウトソーシング業界・コールセンター人材派遣北斗株式会社の求人・中途採用情報",
        source: "summary_line",
        confidence: "medium"
      })
    });

    const report = evaluateParsedJobQuality("転職・求人doda（デューダ）トップ…\n北斗株式会社", parsed);

    expect(report.failureTypes).toContain("company_name_suspected_platform_noise");
    expect(report.severity).toBe("high");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("marks bonus keywords without extracted bonus count as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      bonusCount: extracted<number>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("昇給・賞与\n昇給: 年1回\n賞与: 年2回", parsed);

    expect(report.failureTypes).toContain("bonus_count_unknown_with_keyword");
    expect(report.summaryText).toContain("賞与");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("marks retirement allowance keywords without extracted verdict as save-worthy feedback", () => {
    const parsed = buildParsedJob({
      retirementAllowance: extracted<boolean>({ status: "unknown", value: null, evidence: null, source: "validation", confidence: "low" })
    });

    const report = evaluateParsedJobQuality("福利厚生\n退職金制度\n資格取得支援制度", parsed);

    expect(report.failureTypes).toContain("retirement_allowance_unknown_with_keyword");
    expect(report.summaryText).toContain("退職金");
    expect(shouldCreateFeedback(report)).toBe(true);
  });

  it("clears benefits suspicion for wantedly prose-heavy pages once benefit blocks are extracted", () => {
    const raw = readFixture("phase3-wantedly-prose-heavy-049-anon.txt");
    const parsed = parseJobText(raw);

    const report = evaluateParsedJobQuality(raw, parsed);

    expect(parsed.benefits.status).toBe("found");
    expect(report.failureTypes).not.toContain("benefits_suspected_but_not_extracted");
    expect(report.failureTypes).toContain("too_many_unknown_critical_fields");
    expect(report.signals.benefitsSuspected).toBe(false);
  });
});
