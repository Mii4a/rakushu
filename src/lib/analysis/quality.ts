import type { ExtractedValue, ExtractSource, ParsedJob } from "./types";

export type FailureType =
  | "salary_text_without_base_salary"
  | "benefits_suspected_but_not_extracted"
  | "too_many_unknown_critical_fields"
  | "summary_line_only_extraction"
  | "company_housing_unknown_with_keyword"
  | "housing_allowance_unknown_with_keyword";

export type QualityReportSeverity = "none" | "medium" | "high";

export type QualityReport = {
  severity: QualityReportSeverity;
  failureTypes: FailureType[];
  summaryText: string;
  excerpt: string;
  signals: {
    criticalUnknownCount: number;
    summaryLineOnly: boolean;
    benefitsSuspected: boolean;
    housingAllowanceKeywordPresent: boolean;
    companyHousingKeywordPresent: boolean;
  };
};

const CRITICAL_FIELD_KEYS = ["companyName", "employmentType", "salaryText", "baseSalaryMin", "annualHolidays"] as const satisfies ReadonlyArray<keyof ParsedJob>;
const SUMMARY_LINE_SOURCES: ExtractSource[] = ["summary_line"];
const BENEFIT_HINT_PATTERN = /(福利厚生|待遇|手当|制度)/;
const HOUSING_ALLOWANCE_PATTERN = /住宅手当/;
const COMPANY_HOUSING_PATTERN = /(社宅|借上社宅)/;
const MAX_EXCERPT_LENGTH = 400;
const MIN_EXCERPT_LENGTH = 200;

function isUnknown(value: ExtractedValue<unknown>) {
  return value.status === "unknown";
}

function countCriticalUnknownFields(parsed: ParsedJob) {
  return CRITICAL_FIELD_KEYS.filter((key) => isUnknown(parsed[key])).length;
}

function isSummaryLineFound(value: ExtractedValue<unknown>) {
  return value.status === "found" && value.source != null && SUMMARY_LINE_SOURCES.includes(value.source);
}

function isSummaryLineOnlyExtraction(parsed: ParsedJob) {
  return isSummaryLineFound(parsed.companyName) && isSummaryLineFound(parsed.employmentType) && isSummaryLineFound(parsed.salaryText);
}

function hasBenefitsSuspectedWithoutExtraction(rawText: string, parsed: ParsedJob) {
  const benefitCount = parsed.benefits.value?.length ?? 0;
  return BENEFIT_HINT_PATTERN.test(rawText) && benefitCount === 0;
}

function buildExcerpt(rawText: string, keywords: string[]) {
  const normalized = rawText.replace(/\r\n?/g, "\n").trim();
  if (normalized.length <= MAX_EXCERPT_LENGTH) {
    return normalized;
  }

  for (const keyword of keywords) {
    const index = normalized.indexOf(keyword);
    if (index >= 0) {
      const halfWindow = Math.floor(MAX_EXCERPT_LENGTH / 2);
      const start = Math.max(0, index - halfWindow);
      const end = Math.min(normalized.length, start + MAX_EXCERPT_LENGTH);
      const excerpt = normalized.slice(start, end).trim();
      const prefix = start > 0 ? "…" : "";
      const suffix = end < normalized.length ? "…" : "";
      return `${prefix}${excerpt}${suffix}`;
    }
  }

  return `${normalized.slice(0, Math.max(MIN_EXCERPT_LENGTH, MAX_EXCERPT_LENGTH)).trim()}…`;
}

function buildSummaryText(failureTypes: FailureType[]) {
  if (failureTypes.includes("salary_text_without_base_salary")) {
    return "給与表記は取れているのに基本給へ正規化できていません。";
  }

  if (failureTypes.includes("benefits_suspected_but_not_extracted")) {
    return "福利厚生らしき記述があるのに福利厚生抽出が空です。";
  }

  if (failureTypes.includes("too_many_unknown_critical_fields")) {
    return "重要項目の unknown が多く、解析改善候補です。";
  }

  if (failureTypes.includes("summary_line_only_extraction")) {
    return "summary line 依存の抽出で重要項目が不安定です。";
  }

  if (failureTypes.includes("company_housing_unknown_with_keyword")) {
    return "社宅関連の語があるのに判定できていません。";
  }

  if (failureTypes.includes("housing_allowance_unknown_with_keyword")) {
    return "住宅手当の語があるのに判定できていません。";
  }

  return "保存対象ではない解析です。";
}

export function evaluateParsedJobQuality(rawText: string, parsed: ParsedJob): QualityReport {
  const failureTypes: FailureType[] = [];
  const criticalUnknownCount = countCriticalUnknownFields(parsed);
  const summaryLineOnly = isSummaryLineOnlyExtraction(parsed);
  const benefitsSuspected = hasBenefitsSuspectedWithoutExtraction(rawText, parsed);
  const housingAllowanceKeywordPresent = HOUSING_ALLOWANCE_PATTERN.test(rawText);
  const companyHousingKeywordPresent = COMPANY_HOUSING_PATTERN.test(rawText);

  if (parsed.salaryText.status === "found" && parsed.baseSalaryMin.status === "unknown") {
    failureTypes.push("salary_text_without_base_salary");
  }

  if (benefitsSuspected) {
    failureTypes.push("benefits_suspected_but_not_extracted");
  }

  if (criticalUnknownCount >= 2) {
    failureTypes.push("too_many_unknown_critical_fields");
  }

  if (summaryLineOnly && criticalUnknownCount >= 1) {
    failureTypes.push("summary_line_only_extraction");
  }

  if (housingAllowanceKeywordPresent && parsed.housingAllowance.status === "unknown") {
    failureTypes.push("housing_allowance_unknown_with_keyword");
  }

  if (companyHousingKeywordPresent && parsed.companyHousing.status === "unknown") {
    failureTypes.push("company_housing_unknown_with_keyword");
  }

  const deduped = Array.from(new Set(failureTypes));
  const highSeverityTypes: FailureType[] = [
    "salary_text_without_base_salary",
    "benefits_suspected_but_not_extracted",
    "too_many_unknown_critical_fields",
    "summary_line_only_extraction"
  ];
  const severity: QualityReportSeverity = deduped.some((failureType) => highSeverityTypes.includes(failureType))
    ? "high"
    : deduped.length > 0
      ? "medium"
      : "none";
  const excerptKeywords = deduped.flatMap((failureType) => {
    switch (failureType) {
      case "salary_text_without_base_salary":
        return ["給与", "月給", "年収"];
      case "benefits_suspected_but_not_extracted":
        return ["福利厚生", "待遇", "手当", "制度"];
      case "summary_line_only_extraction":
        return [parsed.companyName.evidence ?? "", parsed.employmentType.evidence ?? "", parsed.salaryText.evidence ?? ""];
      case "housing_allowance_unknown_with_keyword":
        return ["住宅手当"];
      case "company_housing_unknown_with_keyword":
        return ["社宅", "借上社宅"];
      case "too_many_unknown_critical_fields":
        return ["給与", "雇用形態", "年間休日", "会社名"];
    }
  }).filter((keyword) => keyword.length > 0);

  return {
    severity,
    failureTypes: deduped,
    summaryText: buildSummaryText(deduped),
    excerpt: buildExcerpt(rawText, excerptKeywords),
    signals: {
      criticalUnknownCount,
      summaryLineOnly,
      benefitsSuspected,
      housingAllowanceKeywordPresent,
      companyHousingKeywordPresent
    }
  };
}

export function shouldCreateFeedback(report: QualityReport) {
  if (report.failureTypes.includes("salary_text_without_base_salary")) return true;
  if (report.failureTypes.includes("benefits_suspected_but_not_extracted")) return true;
  if (report.signals.criticalUnknownCount >= 2) return true;
  if (report.failureTypes.includes("summary_line_only_extraction") && report.signals.criticalUnknownCount >= 1) return true;
  if (report.failureTypes.includes("company_housing_unknown_with_keyword")) return true;
  if (report.failureTypes.includes("housing_allowance_unknown_with_keyword")) return true;
  return false;
}
