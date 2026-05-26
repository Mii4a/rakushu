import type { ExtractedValue, ExtractSource, ParsedJob } from "./types";

export type FailureType =
  | "salary_text_without_base_salary"
  | "benefits_suspected_but_not_extracted"
  | "too_many_unknown_critical_fields"
  | "summary_line_only_extraction"
  | "company_housing_unknown_with_keyword"
  | "housing_allowance_unknown_with_keyword"
  | "bonus_count_unknown_with_keyword"
  | "retirement_allowance_unknown_with_keyword"
  | "negative_base_salary_detected"
  | "company_name_suspected_platform_noise";

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
    bonusKeywordPresent: boolean;
    retirementKeywordPresent: boolean;
    housingAllowanceKeywordPresent: boolean;
    companyHousingKeywordPresent: boolean;
  };
};

const CRITICAL_FIELD_KEYS = ["companyName", "employmentType", "salaryText", "annualHolidays"] as const satisfies ReadonlyArray<keyof ParsedJob>;
const SUMMARY_LINE_SOURCES: ExtractSource[] = ["summary_line"];
const BENEFIT_HINT_PATTERN = /(福利厚生|待遇・福利厚生|副業|在宅|リモート|フレックス|服装自由|ネイル|私服勤務可|住宅手当|交通費|社宅|産休|育休|書籍購入補助|社会保険)/;
const HOUSING_ALLOWANCE_PATTERN = /住宅手当/;
const COMPANY_HOUSING_PATTERN = /(社宅|借上社宅)/;
const COMPANY_NAME_PLATFORM_NOISE_PATTERN = /(doda|デューダ|転職・求人|中途採用情報|求人詳細|掲載予定期間|Green|Wantedly|トップ)/i;
const BONUS_PATTERN = /(賞与|ボーナス|年\s*[12３１２]\s*回|年2回|年1回)/;
const BONUS_COUNT_SIGNAL_PATTERN = /(賞与[^\n]{0,20}?年\s*[0-9０-９]\s*回|賞与[^\n]{0,20}?[0-9０-９]回|年\s*[0-9０-９]\s*回[^\n]{0,12}?賞与|[0-9０-９]回[^\n]{0,12}?賞与|賞与\s*\n\s*年\s*[0-9０-９]\s*回|賞与\s*\n\s*[0-9０-９]回|ボーナス[^\n]{0,20}?年\s*[0-9０-９]\s*回|ボーナス[^\n]{0,20}?[0-9０-９]回|年\s*[0-9０-９]\s*回[^\n]{0,12}?ボーナス|[0-9０-９]回[^\n]{0,12}?ボーナス|ボーナス\s*\n\s*年\s*[0-9０-９]\s*回|ボーナス\s*\n\s*[0-9０-９]回)/;
const RETIREMENT_ALLOWANCE_PATTERN = /(退職金|退職金制度)/;
const MONTHLY_SALARY_PATTERN = /(月給|月収|月額|想定月収|時給|日給)/;
const HIGH_ANNUAL_SALARY_PATTERN = /(?:^|[^0-9０-９])([1-9][0-9]{2,}|[１-９][０-９]{2,})(?:\.[0-9０-９]+)?万円/;
const STRUCTURED_SALARY_TEXT_PATTERN = /[0-9０-９].*(?:円|万円)/;
const STRUCTURED_SALARY_TEXT_NOISE_PATTERN = /(応相談|経験|能力|インセンティブ|歩合|賞与|手当込み|条件により|詳細は面談)/;
const COMPANY_NAME_VISIBLE_PATTERN = /(株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人|弁護士法人)/;
const EMPLOYMENT_TYPE_VISIBLE_PATTERN = /(雇用形態|正社員|契約社員|派遣社員|紹介予定派遣|業務委託|アルバイト・パート|アルバイト|パート|インターン)/;
const EMPLOYMENT_TYPE_VISIBLE_NOISE_PATTERN = /(インタビュー|会社の注目のストーリー|採用担当|もっと見る|他の募集|話を聞きに行くステップ|応募する|応援する)/;
const ANNUAL_HOLIDAYS_VISIBLE_PATTERN = /(年間休日|休日・休暇|休日休暇|完全週休|週休2日|土日祝休み|休暇制度|フルフレックス)/;
const SALARY_VISIBLE_PATTERN = /((?:給与|想定年収|年収|月給|月収|報酬)[:：]?|[0-9０-９].*(?:円|万円))/;
const SALARY_VISIBLE_NOISE_PATTERN = /(応募要件|選考プロセス|ご覧いただくには|話を聞きに行く|応募する|気になる|もっと見る|平均年収UP|年収UP実績|還元率|売上[0-9０-９]|取扱高[0-9０-９])/;
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

function hasNegativeBaseSalary(parsed: ParsedJob) {
  const minValue = parsed.baseSalaryMin.value;
  const maxValue = parsed.baseSalaryMax.value;

  return (parsed.baseSalaryMin.status === "found" && minValue != null && minValue < 0)
    || (parsed.baseSalaryMax.status === "found" && maxValue != null && maxValue < 0);
}

function hasPlatformPollutedCompanyName(parsed: ParsedJob) {
  if (parsed.companyName.status !== "found") return false;
  const companyValue = parsed.companyName.value ?? "";
  const evidence = parsed.companyName.evidence ?? companyValue;
  return COMPANY_NAME_PLATFORM_NOISE_PATTERN.test(companyValue) || COMPANY_NAME_PLATFORM_NOISE_PATTERN.test(evidence);
}

function hasComparisonUsableStructuredSalaryText(parsed: ParsedJob) {
  if (parsed.salaryText.status !== "found") return false;
  if (parsed.salaryText.source !== "section" && parsed.salaryText.source !== "direct_label") return false;

  const salaryValue = parsed.salaryText.value ?? "";
  return STRUCTURED_SALARY_TEXT_PATTERN.test(salaryValue) && !STRUCTURED_SALARY_TEXT_NOISE_PATTERN.test(salaryValue);
}

function needsBaseSalaryNormalization(rawText: string, parsed: ParsedJob) {
  if (parsed.salaryText.status !== "found") return false;
  if (parsed.baseSalaryMin.status !== "unknown") return false;
  if (hasComparisonUsableStructuredSalaryText(parsed)) return false;

  const salarySignals = [parsed.salaryText.evidence ?? "", parsed.salaryText.value ?? "", rawText].join("\n");
  if (HIGH_ANNUAL_SALARY_PATTERN.test(parsed.salaryText.value ?? "")) return false;
  if (MONTHLY_SALARY_PATTERN.test(salarySignals)) return true;
  return false;
}

function hasVisibleSalarySignal(rawText: string) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => SALARY_VISIBLE_PATTERN.test(line) && !SALARY_VISIBLE_NOISE_PATTERN.test(line));
}

function hasVisibleEmploymentSignal(rawText: string) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => EMPLOYMENT_TYPE_VISIBLE_PATTERN.test(line) && !EMPLOYMENT_TYPE_VISIBLE_NOISE_PATTERN.test(line));
}

function countVisibleMissingCriticalSignals(rawText: string, parsed: ParsedJob) {
  return [
    parsed.companyName.status === "unknown" && COMPANY_NAME_VISIBLE_PATTERN.test(rawText),
    parsed.employmentType.status === "unknown" && hasVisibleEmploymentSignal(rawText),
    parsed.salaryText.status === "unknown" && hasVisibleSalarySignal(rawText),
    parsed.annualHolidays.status === "unknown" && ANNUAL_HOLIDAYS_VISIBLE_PATTERN.test(rawText)
  ].filter(Boolean).length;
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

  if (failureTypes.includes("negative_base_salary_detected")) {
    return "固定残業代の差し引き結果が負値になっており、基本給推定が崩れています。";
  }

  if (failureTypes.includes("company_name_suspected_platform_noise")) {
    return "会社名に媒体ノイズが混入しており、重要項目の誤抽出候補です。";
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

  if (failureTypes.includes("bonus_count_unknown_with_keyword")) {
    return "賞与の語があるのに回数を判定できていません。";
  }

  if (failureTypes.includes("retirement_allowance_unknown_with_keyword")) {
    return "退職金の語があるのに判定できていません。";
  }

  return "保存対象ではない解析です。";
}

export function evaluateParsedJobQuality(rawText: string, parsed: ParsedJob): QualityReport {
  const failureTypes: FailureType[] = [];
  const criticalUnknownCount = countCriticalUnknownFields(parsed);
  const visibleMissingCriticalSignals = countVisibleMissingCriticalSignals(rawText, parsed);
  const summaryLineOnly = isSummaryLineOnlyExtraction(parsed);
  const benefitsSuspected = hasBenefitsSuspectedWithoutExtraction(rawText, parsed);
  const bonusKeywordPresent = BONUS_PATTERN.test(rawText);
  const actionableBonusSignalPresent = BONUS_COUNT_SIGNAL_PATTERN.test(rawText);
  const retirementKeywordPresent = RETIREMENT_ALLOWANCE_PATTERN.test(rawText);
  const housingAllowanceKeywordPresent = HOUSING_ALLOWANCE_PATTERN.test(rawText);
  const companyHousingKeywordPresent = COMPANY_HOUSING_PATTERN.test(rawText);

  if (needsBaseSalaryNormalization(rawText, parsed)) {
    failureTypes.push("salary_text_without_base_salary");
  }

  if (hasNegativeBaseSalary(parsed)) {
    failureTypes.push("negative_base_salary_detected");
  }

  if (hasPlatformPollutedCompanyName(parsed)) {
    failureTypes.push("company_name_suspected_platform_noise");
  }

  if (benefitsSuspected) {
    failureTypes.push("benefits_suspected_but_not_extracted");
  }

  if (criticalUnknownCount >= 2 && visibleMissingCriticalSignals >= 2) {
    failureTypes.push("too_many_unknown_critical_fields");
  }

  if (summaryLineOnly && criticalUnknownCount >= 1 && visibleMissingCriticalSignals >= 1) {
    failureTypes.push("summary_line_only_extraction");
  }

  if (housingAllowanceKeywordPresent && parsed.housingAllowance.status === "unknown") {
    failureTypes.push("housing_allowance_unknown_with_keyword");
  }

  if (companyHousingKeywordPresent && parsed.companyHousing.status === "unknown") {
    failureTypes.push("company_housing_unknown_with_keyword");
  }

  if (actionableBonusSignalPresent && parsed.bonusCount.status === "unknown") {
    failureTypes.push("bonus_count_unknown_with_keyword");
  }

  if (retirementKeywordPresent && parsed.retirementAllowance.status === "unknown") {
    failureTypes.push("retirement_allowance_unknown_with_keyword");
  }

  const deduped = Array.from(new Set(failureTypes));
  const highSeverityTypes: FailureType[] = [
    "salary_text_without_base_salary",
    "negative_base_salary_detected",
    "company_name_suspected_platform_noise",
    "benefits_suspected_but_not_extracted",
    "too_many_unknown_critical_fields",
    "summary_line_only_extraction",
    "bonus_count_unknown_with_keyword",
    "retirement_allowance_unknown_with_keyword"
  ];
  const severity: QualityReportSeverity = deduped.some((failureType) => highSeverityTypes.includes(failureType))
    ? "high"
    : deduped.length > 0
      ? "medium"
      : "none";
  const excerptKeywords = deduped.flatMap((failureType): string[] => {
    switch (failureType) {
      case "salary_text_without_base_salary":
      case "negative_base_salary_detected":
        return ["給与", "月給", "年収", "固定残業代"];
      case "company_name_suspected_platform_noise":
        return [parsed.companyName.evidence ?? parsed.companyName.value ?? "", "会社名", "求人"];
      case "benefits_suspected_but_not_extracted":
        return ["福利厚生", "待遇", "手当", "制度"];
      case "summary_line_only_extraction":
        return [parsed.companyName.evidence ?? "", parsed.employmentType.evidence ?? "", parsed.salaryText.evidence ?? ""];
      case "housing_allowance_unknown_with_keyword":
        return ["住宅手当"];
      case "company_housing_unknown_with_keyword":
        return ["社宅", "借上社宅"];
      case "bonus_count_unknown_with_keyword":
        return ["賞与", "ボーナス"];
      case "retirement_allowance_unknown_with_keyword":
        return ["退職金", "退職金制度"];
      case "too_many_unknown_critical_fields":
        return ["給与", "雇用形態", "年間休日", "会社名"];
      default:
        return [];
    }
  }).filter((keyword): keyword is string => keyword.length > 0);

  return {
    severity,
    failureTypes: deduped,
    summaryText: buildSummaryText(deduped),
    excerpt: buildExcerpt(rawText, excerptKeywords),
    signals: {
      criticalUnknownCount,
      summaryLineOnly,
      benefitsSuspected,
      bonusKeywordPresent,
      retirementKeywordPresent,
      housingAllowanceKeywordPresent,
      companyHousingKeywordPresent
    }
  };
}

export function shouldCreateFeedback(report: QualityReport) {
  if (report.failureTypes.includes("salary_text_without_base_salary")) return true;
  if (report.failureTypes.includes("negative_base_salary_detected")) return true;
  if (report.failureTypes.includes("company_name_suspected_platform_noise")) return true;
  if (report.failureTypes.includes("benefits_suspected_but_not_extracted")) return true;
  if (report.failureTypes.includes("too_many_unknown_critical_fields")) return true;
  if (report.failureTypes.includes("summary_line_only_extraction") && report.signals.criticalUnknownCount >= 1) return true;
  if (report.failureTypes.includes("company_housing_unknown_with_keyword")) return true;
  if (report.failureTypes.includes("housing_allowance_unknown_with_keyword")) return true;
  if (report.failureTypes.includes("bonus_count_unknown_with_keyword")) return true;
  if (report.failureTypes.includes("retirement_allowance_unknown_with_keyword")) return true;
  return false;
}
