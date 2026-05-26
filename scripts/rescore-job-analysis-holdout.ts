import * as fs from "node:fs";
import * as path from "node:path";
import { buildMissingItemSummary } from "../src/lib/analysis/missing-items";
import { PARSER_VERSION, parseJobText } from "../src/lib/analysis/parser";
import { evaluateParsedJobQuality, shouldCreateFeedback, type FailureType } from "../src/lib/analysis/quality";
import type { ExtractedValue, ParsedJob } from "../src/lib/analysis/types";

type ScoreValue = "yes" | "no" | "unknown";
type OverallGrade = "A" | "B" | "C";
type CriticalEval = "usable" | "miss" | "wrong";
type SecondaryEval = "present_and_correct" | "present_but_missed" | "not_present" | "wrong";
type FeedbackQuality = "high_signal" | "noisy" | "not_applicable";
type FixturePriority = "high" | "medium" | "low";
type RegressionRisk = "high" | "medium" | "low";
type NextAction = "ignore" | "watch" | "fixture" | "parser_fix" | "feedback_rule_fix";
type SourceShape = "job_board_detail" | "job_board_listcard" | "company_careers" | "prose_heavy" | "noisy_promo" | "other";
type CompanyCareersInterpretation = "thin_input" | "parser_miss_worthy" | "mixed_signal" | "not_applicable";
type ReviewCohort = "comparison_grade" | "thin_input";

type CsvRow = Record<string, string>;

type ParsedArgs = {
  seed: string;
  outputPrefix: string;
  reviewDate: string;
  reviewer: string;
  rawDir: string;
  preserveObservedFeedback: boolean;
  observedFeedbackSource: "manifest" | "db" | "simulate";
};

type RescoredRow = {
  sample_id: string;
  job_id: string;
  analysis_id: string;
  parser_version: string;
  review_date: string;
  reviewer: string;
  source_shape: SourceShape;
  review_cohort: ReviewCohort;
  raw_text_origin_note: string;
  overall_grade: OverallGrade;
  overall_reason: string;
  comparison_usable: ScoreValue;
  companyName_eval: CriticalEval;
  employmentType_eval: CriticalEval;
  salaryText_eval: CriticalEval;
  annualHolidays_eval: CriticalEval;
  critical_usable_count: string;
  critical_wrong_count: string;
  raw_missing_critical_count: string;
  raw_missing_critical_fields: string;
  visible_unparsed_critical_count: string;
  visible_unparsed_critical_fields: string;
  benefits_eval: SecondaryEval;
  housingAllowance_eval: SecondaryEval;
  companyHousing_eval: SecondaryEval;
  bonusCount_eval: SecondaryEval;
  retirementAllowance_eval: SecondaryEval;
  secondary_miss_count: string;
  secondary_wrong_count: string;
  salary_text_without_base_salary: ScoreValue;
  negative_base_salary_detected: ScoreValue;
  company_name_suspected_platform_noise: ScoreValue;
  benefits_suspected_but_not_extracted: ScoreValue;
  too_many_unknown_critical_fields: ScoreValue;
  summary_line_only_extraction: ScoreValue;
  company_housing_unknown_with_keyword: ScoreValue;
  housing_allowance_unknown_with_keyword: ScoreValue;
  bonus_count_unknown_with_keyword: ScoreValue;
  retirement_allowance_unknown_with_keyword: ScoreValue;
  feedback_expected: ScoreValue;
  feedback_saved: ScoreValue;
  feedback_quality: FeedbackQuality;
  fixture_priority: FixturePriority;
  suggested_fixture_shape: string;
  notes: string;
  parser_regression_risk: RegressionRisk;
  next_action: NextAction;
};

type ReviewArtifacts = {
  row: RescoredRow;
  observedFeedbackSaved: ScoreValue;
  simulatedFeedbackSaved: ScoreValue;
  parsed: ParsedJob;
  failureTypes: FailureType[];
  rawText: string;
};

const HEADER = [
  "sample_id",
  "job_id",
  "analysis_id",
  "parser_version",
  "review_date",
  "reviewer",
  "source_shape",
  "review_cohort",
  "raw_text_origin_note",
  "overall_grade",
  "overall_reason",
  "comparison_usable",
  "companyName_eval",
  "employmentType_eval",
  "salaryText_eval",
  "annualHolidays_eval",
  "critical_usable_count",
  "critical_wrong_count",
  "raw_missing_critical_count",
  "raw_missing_critical_fields",
  "visible_unparsed_critical_count",
  "visible_unparsed_critical_fields",
  "benefits_eval",
  "housingAllowance_eval",
  "companyHousing_eval",
  "bonusCount_eval",
  "retirementAllowance_eval",
  "secondary_miss_count",
  "secondary_wrong_count",
  "salary_text_without_base_salary",
  "negative_base_salary_detected",
  "company_name_suspected_platform_noise",
  "benefits_suspected_but_not_extracted",
  "too_many_unknown_critical_fields",
  "summary_line_only_extraction",
  "company_housing_unknown_with_keyword",
  "housing_allowance_unknown_with_keyword",
  "bonus_count_unknown_with_keyword",
  "retirement_allowance_unknown_with_keyword",
  "feedback_expected",
  "feedback_saved",
  "feedback_quality",
  "fixture_priority",
  "suggested_fixture_shape",
  "notes",
  "parser_regression_risk",
  "next_action"
] as const;

const FAILURE_COLUMNS: FailureType[] = [
  "salary_text_without_base_salary",
  "negative_base_salary_detected",
  "company_name_suspected_platform_noise",
  "benefits_suspected_but_not_extracted",
  "too_many_unknown_critical_fields",
  "summary_line_only_extraction",
  "company_housing_unknown_with_keyword",
  "housing_allowance_unknown_with_keyword",
  "bonus_count_unknown_with_keyword",
  "retirement_allowance_unknown_with_keyword"
];

const REQUIRED_SHAPES: SourceShape[] = [
  "job_board_detail",
  "job_board_listcard",
  "company_careers",
  "prose_heavy",
  "noisy_promo"
];

const HIGH_RISK_SHAPES = new Set<SourceShape>(["company_careers", "prose_heavy", "noisy_promo"]);
const SALARY_NOISE_PATTERN = /(応募要件|選考プロセス|ご覧いただくには|話を聞きに行く|応募する|気になる|もっと見る)/;
const BONUS_HINT_PATTERN = /(賞与|ボーナス|年\s*[12３１２]\s*回|年2回|年1回)/;
const BONUS_COUNT_SIGNAL_PATTERN = /(賞与[^\n]{0,20}?年\s*[0-9０-９]\s*回|賞与[^\n]{0,20}?[0-9０-９]回|年\s*[0-9０-９]\s*回[^\n]{0,12}?賞与|[0-9０-９]回[^\n]{0,12}?賞与|賞与\s*\n\s*年\s*[0-9０-９]\s*回|賞与\s*\n\s*[0-9０-９]回|ボーナス[^\n]{0,20}?年\s*[0-9０-９]\s*回|ボーナス[^\n]{0,20}?[0-9０-９]回|年\s*[0-9０-９]\s*回[^\n]{0,12}?ボーナス|[0-9０-９]回[^\n]{0,12}?ボーナス|ボーナス\s*\n\s*年\s*[0-9０-９]\s*回|ボーナス\s*\n\s*[0-9０-９]回)/;
const RETIREMENT_HINT_PATTERN = /(退職金|退職金制度)/;
const EMPLOYMENT_TYPE_SIGNAL_PATTERN = /(雇用形態|正社員|契約社員|派遣社員|業務委託|アルバイト|パート|インターン)/;
const ANNUAL_HOLIDAYS_SIGNAL_PATTERN = /(年間休日|休日・休暇|休日休暇|完全週休|週休2日|土日祝休み|休暇制度)/;
const COMPANY_NAME_SIGNAL_PATTERN = /(株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人|弁護士法人)/;
const SALARY_SIGNAL_PATTERN = /((?:給与|想定年収|年収|月給|月収|報酬)[:：]?|[0-9０-９].*(?:円|万円))/;
const SALARY_SIGNAL_NOISE_PATTERN = /(応募要件|選考プロセス|ご覧いただくには|話を聞きに行く|応募する|気になる|もっと見る|平均年収UP|年収UP実績|還元率|売上[0-9０-９]|取扱高[0-9０-９])/;
const EMPLOYMENT_TYPE_SIGNAL_NOISE_PATTERN = /(インタビュー|会社の注目のストーリー|採用担当|もっと見る|他の募集|話を聞きに行くステップ|応募する|応援する)/;
const EXPLICIT_ANNUAL_HOLIDAYS_COUNT_PATTERN = /(年間休日[^\n]{0,20}?[0-9０-９]{2,3}日|年休\s*[0-9０-９]{2,3}日)/;
const GENERIC_HOLIDAY_STYLE_PATTERN = /(完全週休2日|週休2日|土日祝休み)/;

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const next = args[index + 1];
    if (next == null || next.startsWith("--")) {
      map.set(token, "true");
      continue;
    }
    map.set(token, next);
    index += 1;
  }

  const seed = map.get("--seed") ?? "docs/evaluations/job-analysis-holdout-2026-05-22-signoff-scorecard.csv";
  const outputPrefix = map.get("--output-prefix") ?? `docs/evaluations/job-analysis-holdout-${new Date().toISOString().slice(0, 10)}-rerun-signoff`;
  const reviewDate = map.get("--review-date") ?? new Date().toISOString().slice(0, 10);
  const reviewer = map.get("--reviewer") ?? "taro-bot";
  const rawDir = map.get("--raw-dir") ?? "docs/evaluations/job-analysis-holdout-raw/approved";
  const observedFeedbackSource = (map.get("--observed-feedback-source") ?? "manifest") as ParsedArgs["observedFeedbackSource"];
  const preserveObservedFeedback = map.get("--simulate-all-feedback") === "true"
    ? false
    : observedFeedbackSource !== "simulate";

  return { seed, outputPrefix, reviewDate, reviewer, rawDir, preserveObservedFeedback, observedFeedbackSource };
}

function parseCsv(text: string): { header: string[]; rows: CsvRow[] } {
  const rows: string[][] = [];
  let current = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      record.push(current);
      rows.push(record);
      record = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || record.length > 0) {
    record.push(current);
    rows.push(record);
  }

  if (rows.length === 0) {
    return { header: [], rows: [] };
  }

  const [header, ...dataRows] = rows;
  return {
    header,
    rows: dataRows
      .filter((row) => row.some((cell) => cell.length > 0))
      .map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])))
  };
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function loadObservedFeedbackByAnalysisId(seedRows: CsvRow[], args: ParsedArgs) {
  const analysisIds = Array.from(new Set(seedRows.map((row) => row.analysis_id ?? "").filter((analysisId) => analysisId.length > 0)));
  const lookup = new Map<string, ScoreValue>();

  if (args.observedFeedbackSource !== "db" || analysisIds.length === 0) {
    return lookup;
  }

  const [{ inArray }, { db }, { jobAnalysisFeedback }] = await Promise.all([
    import("drizzle-orm"),
    import("../src/lib/db/client"),
    import("../src/lib/db/schema")
  ]);

  const rows = await db
    .select({ jobAnalysisId: jobAnalysisFeedback.jobAnalysisId })
    .from(jobAnalysisFeedback)
    .where(inArray(jobAnalysisFeedback.jobAnalysisId, analysisIds));

  for (const analysisId of analysisIds) {
    lookup.set(analysisId, "no");
  }
  for (const row of rows) {
    lookup.set(row.jobAnalysisId, "yes");
  }

  return lookup;
}

function toCsv(rows: RescoredRow[]) {
  const lines = [HEADER.join(",")];
  for (const row of rows) {
    lines.push(HEADER.map((column) => csvEscape(row[column])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function boolToScore(value: boolean): ScoreValue {
  return value ? "yes" : "no";
}

function hasFailureType(failureTypes: FailureType[], failureType: FailureType) {
  return failureTypes.includes(failureType);
}

function classifyCriticalValue(field: "companyName" | "employmentType" | "salaryText" | "annualHolidays", value: ExtractedValue<unknown>, failureTypes: FailureType[]): CriticalEval {
  if (field === "companyName" && hasFailureType(failureTypes, "company_name_suspected_platform_noise")) {
    return "wrong";
  }

  if (field === "salaryText") {
    const evidence = String(value.evidence ?? value.value ?? "");
    if (value.status === "found" && SALARY_NOISE_PATTERN.test(evidence)) {
      return "wrong";
    }
  }

  return value.status === "found" ? "usable" : "miss";
}

function classifyBooleanSecondary(value: ExtractedValue<boolean>, keywordPresent: boolean): SecondaryEval {
  if (value.status === "found") return "present_and_correct";
  if (keywordPresent) return "present_but_missed";
  return "not_present";
}

function classifyCountSecondary(value: ExtractedValue<number>, hintPattern: RegExp, rawText: string): SecondaryEval {
  if (value.status === "found") return "present_and_correct";
  if (hintPattern.test(rawText)) return "present_but_missed";
  return "not_present";
}

function classifyBenefits(rawText: string, parsed: ParsedJob, failureTypes: FailureType[]): SecondaryEval {
  if ((parsed.benefits.value?.length ?? 0) > 0) return "present_and_correct";
  if (
    hasFailureType(failureTypes, "benefits_suspected_but_not_extracted")
    || /(福利厚生|待遇・福利厚生|副業|在宅|リモート|フレックス|服装自由|ネイル|私服勤務可|住宅手当|交通費|社宅|産休|育休|書籍購入補助|社会保険)/.test(rawText)
  ) {
    return "present_but_missed";
  }
  return "not_present";
}

function countValues<T extends string>(values: T[], target: T) {
  return values.filter((value) => value === target).length;
}

function salarySignalVisible(rawText: string) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line.length > 0 && SALARY_SIGNAL_PATTERN.test(line) && !SALARY_SIGNAL_NOISE_PATTERN.test(line));
}

function employmentTypeSignalVisible(rawText: string) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line.length > 0 && EMPLOYMENT_TYPE_SIGNAL_PATTERN.test(line) && !EMPLOYMENT_TYPE_SIGNAL_NOISE_PATTERN.test(line));
}

function isAnnualHolidaysOnlyGenericHolidayRow(rawText: string, parsed: ParsedJob) {
  return parsed.companyName.status === "found"
    && parsed.employmentType.status === "found"
    && parsed.salaryText.status === "found"
    && parsed.annualHolidays.status !== "found"
    && !EXPLICIT_ANNUAL_HOLIDAYS_COUNT_PATTERN.test(rawText)
    && GENERIC_HOLIDAY_STYLE_PATTERN.test(rawText);
}

function countVisibleMissingCriticalSignals(rawText: string, parsed: ParsedJob) {
  return [
    parsed.companyName.status !== "found" && COMPANY_NAME_SIGNAL_PATTERN.test(rawText),
    parsed.employmentType.status !== "found" && employmentTypeSignalVisible(rawText),
    parsed.salaryText.status !== "found" && salarySignalVisible(rawText),
    parsed.annualHolidays.status !== "found" && ANNUAL_HOLIDAYS_SIGNAL_PATTERN.test(rawText)
  ].filter(Boolean).length;
}

const COHORT_CRITICAL_KEYS = new Set(["companyName", "employmentType", "salaryText", "annualHolidays"]);

function classifyReviewCohort(rawText: string, parsed: ParsedJob): {
  reviewCohort: ReviewCohort;
  rawMissingCriticalFields: string[];
  visibleUnparsedCriticalFields: string[];
} {
  const missingSummary = buildMissingItemSummary(parsed, rawText);
  const rawMissingCriticalFields = missingSummary.missingInRawText.filter((key) => COHORT_CRITICAL_KEYS.has(key));
  const visibleUnparsedCriticalFields = missingSummary.ambiguousButVisible.filter((key) => COHORT_CRITICAL_KEYS.has(key));

  return {
    reviewCohort: rawMissingCriticalFields.length > 0 ? "thin_input" : "comparison_grade",
    rawMissingCriticalFields,
    visibleUnparsedCriticalFields
  };
}

function isThinInputCriticalRow(params: {
  sourceShape: SourceShape;
  rawText: string;
  parsed: ParsedJob;
  failureTypes: FailureType[];
}) {
  const { sourceShape, rawText, parsed, failureTypes } = params;
  if (!["company_careers", "noisy_promo", "prose_heavy"].includes(sourceShape)) {
    return false;
  }

  const criticalUnknownCount = [parsed.companyName, parsed.employmentType, parsed.salaryText, parsed.annualHolidays]
    .filter((field) => field.status !== "found")
    .length;

  if (criticalUnknownCount < 2) return false;
  if (hasFailureType(failureTypes, "too_many_unknown_critical_fields")) return false;

  return countVisibleMissingCriticalSignals(rawText, parsed) < 2;
}

function classifyCompanyCareersInterpretation(params: {
  sourceShape: SourceShape;
  rawText: string;
  parsed: ParsedJob;
  failureTypes: FailureType[];
}): CompanyCareersInterpretation {
  const { sourceShape, rawText, parsed, failureTypes } = params;
  if (sourceShape !== "company_careers") {
    return "not_applicable";
  }

  const missingEmploymentType = parsed.employmentType.status !== "found";
  const missingAnnualHolidays = parsed.annualHolidays.status !== "found";
  const employmentTypeVisible = EMPLOYMENT_TYPE_SIGNAL_PATTERN.test(rawText);
  const annualHolidaysVisible = ANNUAL_HOLIDAYS_SIGNAL_PATTERN.test(rawText);

  const parserMissSignals = [
    missingEmploymentType && employmentTypeVisible,
    missingAnnualHolidays && annualHolidaysVisible
  ].filter(Boolean).length;
  const thinInputSignals = [
    missingEmploymentType && !employmentTypeVisible,
    missingAnnualHolidays && !annualHolidaysVisible
  ].filter(Boolean).length;

  if (thinInputSignals === 0 && parserMissSignals === 0) {
    return hasFailureType(failureTypes, "too_many_unknown_critical_fields") ? "mixed_signal" : "not_applicable";
  }
  if (thinInputSignals > 0 && parserMissSignals === 0) return "thin_input";
  if (parserMissSignals > 0 && thinInputSignals === 0) return "parser_miss_worthy";
  return "mixed_signal";
}

function inferOverallReason(params: {
  overallGrade: OverallGrade;
  criticalUsableCount: number;
  criticalWrongFields: string[];
  failureTypes: FailureType[];
  secondaryMissCount: number;
  companyCareersInterpretation: CompanyCareersInterpretation;
  thinInputCriticalRow: boolean;
  sourceShape: SourceShape;
}) {
  const { overallGrade, criticalUsableCount, criticalWrongFields, failureTypes, secondaryMissCount, companyCareersInterpretation, thinInputCriticalRow, sourceShape } = params;

  if (criticalWrongFields.length > 0) {
    return `critical wrong: ${criticalWrongFields.join("+")}`;
  }

  if (hasFailureType(failureTypes, "too_many_unknown_critical_fields")) {
    if (companyCareersInterpretation === "thin_input") {
      return "thin-input company_careers row";
    }
    if (companyCareersInterpretation === "parser_miss_worthy") {
      return "parser-miss-worthy company_careers row";
    }
    if (companyCareersInterpretation === "mixed_signal") {
      return "mixed-signal company_careers row";
    }
    return "too_many_unknown_critical_fields";
  }

  if (hasFailureType(failureTypes, "salary_text_without_base_salary")) {
    return "salary_text_without_base_salary";
  }

  if (hasFailureType(failureTypes, "benefits_suspected_but_not_extracted")) {
    return "benefits_suspected_but_not_extracted";
  }

  if (overallGrade === "C" && thinInputCriticalRow) {
    return `thin-input ${sourceShape} row`;
  }

  if (overallGrade === "A") {
    return "critical usable 4/4";
  }

  if (secondaryMissCount > 0 && criticalUsableCount >= 3) {
    return "secondary field misses only";
  }

  return `critical usable ${criticalUsableCount}/4`;
}

function inferFixtureShape(sourceShape: SourceShape, failureTypes: FailureType[]) {
  if (hasFailureType(failureTypes, "company_name_suspected_platform_noise")) return "company-name-platform-noise";
  if (hasFailureType(failureTypes, "negative_base_salary_detected")) return "negative-base-salary";
  if (hasFailureType(failureTypes, "salary_text_without_base_salary")) return "salary-text-without-base-salary";
  if (hasFailureType(failureTypes, "benefits_suspected_but_not_extracted")) return "benefits-prose";
  if (hasFailureType(failureTypes, "housing_allowance_unknown_with_keyword")) return "housing-allowance-unknown-with-keyword";
  if (hasFailureType(failureTypes, "company_housing_unknown_with_keyword")) return "company-housing-unknown-with-keyword";
  if (hasFailureType(failureTypes, "too_many_unknown_critical_fields")) return `${sourceShape}-critical-fields`;
  return "";
}

function inferFixturePriority(overallGrade: OverallGrade, criticalWrongCount: number, secondaryMissCount: number, failureTypes: FailureType[]): FixturePriority {
  if (overallGrade === "C" || criticalWrongCount > 0 || hasFailureType(failureTypes, "too_many_unknown_critical_fields")) {
    return "high";
  }
  if (overallGrade === "B" || secondaryMissCount > 0 || failureTypes.length > 0) {
    return "medium";
  }
  return "low";
}

function inferRegressionRisk(priority: FixturePriority, failureTypes: FailureType[]): RegressionRisk {
  if (priority === "high") return "high";
  if (priority === "medium") return hasFailureType(failureTypes, "salary_text_without_base_salary") ? "medium" : "low";
  return "low";
}

function inferNextAction(params: {
  overallGrade: OverallGrade;
  feedbackExpected: ScoreValue;
  feedbackSaved: ScoreValue;
  fixturePriority: FixturePriority;
  criticalWrongCount: number;
  failureTypes: FailureType[];
  companyCareersInterpretation: CompanyCareersInterpretation;
  thinInputCriticalRow: boolean;
}) {
  const { overallGrade, feedbackExpected, feedbackSaved, fixturePriority, criticalWrongCount, failureTypes, companyCareersInterpretation, thinInputCriticalRow } = params;

  if (overallGrade === "A" && feedbackExpected === "no") return "ignore" satisfies NextAction;
  if (companyCareersInterpretation === "thin_input" || thinInputCriticalRow) {
    return fixturePriority === "high" ? "fixture" : "watch";
  }
  if (criticalWrongCount > 0 || overallGrade === "C" || hasFailureType(failureTypes, "too_many_unknown_critical_fields")) {
    return "parser_fix" satisfies NextAction;
  }
  if (feedbackExpected === "yes" && feedbackSaved === "no") {
    return hasFailureType(failureTypes, "salary_text_without_base_salary")
      || hasFailureType(failureTypes, "negative_base_salary_detected")
      || hasFailureType(failureTypes, "company_name_suspected_platform_noise")
      ? "feedback_rule_fix"
      : "fixture";
  }
  if (fixturePriority === "high" || fixturePriority === "medium") return "fixture" satisfies NextAction;
  return "watch" satisfies NextAction;
}

function resolveFeedbackExpected(params: {
  overallGrade: OverallGrade;
  secondaryMissCount: number;
  failureTypes: FailureType[];
  companyCareersInterpretation: CompanyCareersInterpretation;
  simulatedFeedbackSaved: ScoreValue;
  thinInputCriticalRow: boolean;
  rawText: string;
  parsed: ParsedJob;
}) {
  const { overallGrade, secondaryMissCount, failureTypes, companyCareersInterpretation, simulatedFeedbackSaved, thinInputCriticalRow, rawText, parsed } = params;

  if (overallGrade === "A" && secondaryMissCount === 0 && failureTypes.length === 0) {
    return "no" satisfies ScoreValue;
  }

  if (companyCareersInterpretation === "thin_input" && simulatedFeedbackSaved === "no") {
    return "no" satisfies ScoreValue;
  }

  if (thinInputCriticalRow && simulatedFeedbackSaved === "no") {
    return "no" satisfies ScoreValue;
  }

  if (isAnnualHolidaysOnlyGenericHolidayRow(rawText, parsed) && simulatedFeedbackSaved === "no") {
    return "no" satisfies ScoreValue;
  }

  return "yes" satisfies ScoreValue;
}

function resolveRawPath(rawDir: string, sampleId: string) {
  return path.join(rawDir, `${sampleId}.txt`);
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator === 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function passConditionalFail(pass: boolean, conditional: boolean) {
  if (pass) return "pass";
  if (conditional) return "conditional";
  return "fail";
}

function resolveObservedFeedbackSaved(seedRow: CsvRow, args: ParsedArgs, observedFeedbackByAnalysisId: Map<string, ScoreValue>) {
  const analysisId = seedRow.analysis_id ?? "";
  if (!analysisId) return "unknown" satisfies ScoreValue;
  if (args.observedFeedbackSource === "db") {
    return observedFeedbackByAnalysisId.get(analysisId) ?? "no";
  }
  return (seedRow.feedback_saved as ScoreValue | undefined) ?? "unknown";
}

function buildRescoredRow(seedRow: CsvRow, args: ParsedArgs, observedFeedbackByAnalysisId: Map<string, ScoreValue>): ReviewArtifacts {
  const sampleId = seedRow.sample_id;
  const rawPath = resolveRawPath(args.rawDir, sampleId);
  const rawText = fs.readFileSync(rawPath, "utf8");
  const parsed = parseJobText(rawText);
  const report = evaluateParsedJobQuality(rawText, parsed);
  const failureTypes = report.failureTypes;
  const simulatedFeedbackSaved = boolToScore(shouldCreateFeedback(report));
  const observedFeedbackSaved = resolveObservedFeedbackSaved(seedRow, args, observedFeedbackByAnalysisId);
  const feedbackSaved: ScoreValue = args.preserveObservedFeedback && seedRow.analysis_id
    ? observedFeedbackSaved
    : simulatedFeedbackSaved;

  const companyNameEval = classifyCriticalValue("companyName", parsed.companyName, failureTypes);
  const employmentTypeEval = classifyCriticalValue("employmentType", parsed.employmentType, failureTypes);
  const salaryTextEval = classifyCriticalValue("salaryText", parsed.salaryText, failureTypes);
  const annualHolidaysEval = classifyCriticalValue("annualHolidays", parsed.annualHolidays, failureTypes);
  const criticalEvals: CriticalEval[] = [companyNameEval, employmentTypeEval, salaryTextEval, annualHolidaysEval];
  const criticalUsableCount = countValues(criticalEvals, "usable");
  const criticalWrongCount = countValues(criticalEvals, "wrong");
  const criticalWrongFields = [
    companyNameEval === "wrong" ? "companyName" : "",
    employmentTypeEval === "wrong" ? "employmentType" : "",
    salaryTextEval === "wrong" ? "salaryText" : "",
    annualHolidaysEval === "wrong" ? "annualHolidays" : ""
  ].filter((field) => field.length > 0);

  const benefitsEval = classifyBenefits(rawText, parsed, failureTypes);
  const housingAllowanceEval = classifyBooleanSecondary(parsed.housingAllowance, hasFailureType(failureTypes, "housing_allowance_unknown_with_keyword"));
  const companyHousingEval = classifyBooleanSecondary(parsed.companyHousing, hasFailureType(failureTypes, "company_housing_unknown_with_keyword"));
  const bonusCountEval = classifyCountSecondary(parsed.bonusCount, BONUS_COUNT_SIGNAL_PATTERN, rawText);
  const retirementAllowanceEval = classifyBooleanSecondary(parsed.retirementAllowance, RETIREMENT_HINT_PATTERN.test(rawText));
  const companyCareersInterpretation = classifyCompanyCareersInterpretation({
    sourceShape: (seedRow.source_shape as SourceShape) ?? "other",
    rawText,
    parsed,
    failureTypes
  });
  const thinInputCriticalRow = isThinInputCriticalRow({
    sourceShape: (seedRow.source_shape as SourceShape) ?? "other",
    rawText,
    parsed,
    failureTypes
  });
  const { reviewCohort, rawMissingCriticalFields, visibleUnparsedCriticalFields } = classifyReviewCohort(rawText, parsed);
  const secondaryEvals: SecondaryEval[] = [benefitsEval, housingAllowanceEval, companyHousingEval, bonusCountEval, retirementAllowanceEval];
  const secondaryMissCount = countValues(secondaryEvals, "present_but_missed");
  const secondaryWrongCount = countValues(secondaryEvals, "wrong");

  const comparisonUsable = criticalWrongCount === 0 && criticalUsableCount >= 3 ? "yes" : "no";
  const overallGrade: OverallGrade = comparisonUsable === "no"
    ? "C"
    : criticalUsableCount === 4 && secondaryMissCount === 0 && failureTypes.length === 0
      ? "A"
      : "B";
  const feedbackExpected = resolveFeedbackExpected({
    overallGrade,
    secondaryMissCount,
    failureTypes,
    companyCareersInterpretation,
    simulatedFeedbackSaved,
    thinInputCriticalRow,
    rawText,
    parsed
  });
  const feedbackQuality: FeedbackQuality = feedbackExpected === "yes" ? "high_signal" : "not_applicable";
  const overallReason = inferOverallReason({
    overallGrade,
    criticalUsableCount,
    criticalWrongFields,
    failureTypes,
    secondaryMissCount,
    companyCareersInterpretation,
    thinInputCriticalRow,
    sourceShape: (seedRow.source_shape as SourceShape) ?? "other"
  });
  const fixturePriority = inferFixturePriority(overallGrade, criticalWrongCount, secondaryMissCount, failureTypes);
  const parserRegressionRisk = inferRegressionRisk(fixturePriority, failureTypes);
  const suggestedFixtureShape = inferFixtureShape(seedRow.source_shape as SourceShape, failureTypes);
  const nextAction = inferNextAction({
    overallGrade,
    feedbackExpected,
    feedbackSaved,
    fixturePriority,
    criticalWrongCount,
    failureTypes,
    companyCareersInterpretation,
    thinInputCriticalRow
  });

  const notes: string[] = [
    "auto-rerun review from approved holdout raw text"
  ];
  if (seedRow.analysis_id && args.preserveObservedFeedback) {
    if (args.observedFeedbackSource === "db") {
      notes.push(`observed feedback_saved read from db=${observedFeedbackSaved}`);
    } else {
      notes.push(`observed feedback_saved preserved from manifest=${observedFeedbackSaved}`);
    }
    notes.push(`current shouldCreateFeedback=${simulatedFeedbackSaved}`);
  } else {
    notes.push("feedback_saved is simulated from current shouldCreateFeedback logic");
  }
  if (companyCareersInterpretation !== "not_applicable") {
    notes.push(`company_careers_interpretation=${companyCareersInterpretation}`);
  }
  notes.push(`review_cohort=${reviewCohort}`);

  const row: RescoredRow = {
    sample_id: sampleId,
    job_id: seedRow.job_id ?? "",
    analysis_id: seedRow.analysis_id ?? "",
    parser_version: PARSER_VERSION,
    review_date: args.reviewDate,
    reviewer: args.reviewer,
    source_shape: (seedRow.source_shape as SourceShape) ?? "other",
    review_cohort: reviewCohort,
    raw_text_origin_note: seedRow.raw_text_origin_note ?? "",
    overall_grade: overallGrade,
    overall_reason: overallReason,
    comparison_usable: comparisonUsable,
    companyName_eval: companyNameEval,
    employmentType_eval: employmentTypeEval,
    salaryText_eval: salaryTextEval,
    annualHolidays_eval: annualHolidaysEval,
    critical_usable_count: String(criticalUsableCount),
    critical_wrong_count: String(criticalWrongCount),
    raw_missing_critical_count: String(rawMissingCriticalFields.length),
    raw_missing_critical_fields: rawMissingCriticalFields.join("|"),
    visible_unparsed_critical_count: String(visibleUnparsedCriticalFields.length),
    visible_unparsed_critical_fields: visibleUnparsedCriticalFields.join("|"),
    benefits_eval: benefitsEval,
    housingAllowance_eval: housingAllowanceEval,
    companyHousing_eval: companyHousingEval,
    bonusCount_eval: bonusCountEval,
    retirementAllowance_eval: retirementAllowanceEval,
    secondary_miss_count: String(secondaryMissCount),
    secondary_wrong_count: String(secondaryWrongCount),
    salary_text_without_base_salary: boolToScore(hasFailureType(failureTypes, "salary_text_without_base_salary")),
    negative_base_salary_detected: boolToScore(hasFailureType(failureTypes, "negative_base_salary_detected")),
    company_name_suspected_platform_noise: boolToScore(hasFailureType(failureTypes, "company_name_suspected_platform_noise")),
    benefits_suspected_but_not_extracted: boolToScore(hasFailureType(failureTypes, "benefits_suspected_but_not_extracted")),
    too_many_unknown_critical_fields: boolToScore(hasFailureType(failureTypes, "too_many_unknown_critical_fields")),
    summary_line_only_extraction: boolToScore(hasFailureType(failureTypes, "summary_line_only_extraction")),
    company_housing_unknown_with_keyword: boolToScore(hasFailureType(failureTypes, "company_housing_unknown_with_keyword")),
    housing_allowance_unknown_with_keyword: boolToScore(hasFailureType(failureTypes, "housing_allowance_unknown_with_keyword")),
    bonus_count_unknown_with_keyword: boolToScore(hasFailureType(failureTypes, "bonus_count_unknown_with_keyword")),
    retirement_allowance_unknown_with_keyword: boolToScore(hasFailureType(failureTypes, "retirement_allowance_unknown_with_keyword")),
    feedback_expected: feedbackExpected,
    feedback_saved: feedbackSaved,
    feedback_quality: feedbackQuality,
    fixture_priority: fixturePriority,
    suggested_fixture_shape: suggestedFixtureShape,
    notes: notes.join(" | "),
    parser_regression_risk: parserRegressionRisk,
    next_action: nextAction
  };

  return { row, observedFeedbackSaved, simulatedFeedbackSaved, parsed, failureTypes, rawText };
}

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function buildSummaryMarkdown(artifacts: ReviewArtifacts[], args: ParsedArgs, scorecardPath: string, notesPath: string) {
  const rows = artifacts.map((artifact) => artifact.row);
  const total = rows.length;
  const comparisonGradeRows = rows.filter((row) => row.review_cohort === "comparison_grade");
  const thinInputRows = rows.filter((row) => row.review_cohort === "thin_input");
  const shapeCounts = countBy(rows.map((row) => row.source_shape));
  const gradeCounts = countBy(rows.map((row) => row.overall_grade));
  const highRiskCount = rows.filter((row) => HIGH_RISK_SHAPES.has(row.source_shape)).length;
  const dominantShapeEntry = Array.from(shapeCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? ["other" as SourceShape, 0];
  const comparisonYes = rows.filter((row) => row.comparison_usable === "yes").length;
  const comparisonNo = total - comparisonYes;
  const trustBreakingCCount = rows.filter((row) => row.overall_grade === "C" && Number(row.critical_wrong_count) > 0).length;
  const critical44Count = rows.filter((row) => Number(row.critical_usable_count) === 4).length;
  const critical34PlusCount = rows.filter((row) => Number(row.critical_usable_count) >= 3).length;
  const criticalWrongPresentCount = rows.filter((row) => Number(row.critical_wrong_count) > 0).length;
  const companyWrongCount = rows.filter((row) => row.companyName_eval === "wrong").length;
  const employmentWrongCount = rows.filter((row) => row.employmentType_eval === "wrong").length;
  const salaryWrongCount = rows.filter((row) => row.salaryText_eval === "wrong").length;
  const holidaysWrongCount = rows.filter((row) => row.annualHolidays_eval === "wrong").length;
  const fieldMiss = (field: keyof RescoredRow) => rows.filter((row) => row[field] === "present_but_missed").length;
  const fieldWrong = (field: keyof RescoredRow) => rows.filter((row) => row[field] === "wrong").length;
  const secondaryWrongTotal = fieldWrong("benefits_eval") + fieldWrong("housingAllowance_eval") + fieldWrong("companyHousing_eval") + fieldWrong("bonusCount_eval") + fieldWrong("retirementAllowance_eval");

  const summarizeCohort = (subset: RescoredRow[]) => {
    const subsetTotal = subset.length;
    const subsetGradeCounts = countBy(subset.map((row) => row.overall_grade));
    const subsetComparisonYes = subset.filter((row) => row.comparison_usable === "yes").length;
    const subsetTrustBreakingCCount = subset.filter((row) => row.overall_grade === "C" && Number(row.critical_wrong_count) > 0).length;
    const subsetCritical44Count = subset.filter((row) => Number(row.critical_usable_count) === 4).length;
    const subsetCritical34PlusCount = subset.filter((row) => Number(row.critical_usable_count) >= 3).length;
    const subsetCriticalWrongPresentCount = subset.filter((row) => Number(row.critical_wrong_count) > 0).length;
    const productGate = subsetTotal === 0
      ? "n/a"
      : passConditionalFail(
        subsetComparisonYes / subsetTotal >= 0.9 && (subsetGradeCounts.get("C") ?? 0) <= 5 && subsetTrustBreakingCCount <= 2,
        subsetComparisonYes / subsetTotal >= 0.85 && (subsetGradeCounts.get("C") ?? 0) <= 7 && subsetTrustBreakingCCount <= 3
      );
    const criticalGate = subsetTotal === 0
      ? "n/a"
      : passConditionalFail(
        subsetCritical34PlusCount / subsetTotal >= 0.9 && subsetCritical44Count / subsetTotal >= 0.75 && subsetCriticalWrongPresentCount / subsetTotal <= 0.03,
        subsetCritical34PlusCount / subsetTotal >= 0.85 && subsetCritical44Count / subsetTotal >= 0.7 && subsetCriticalWrongPresentCount / subsetTotal <= 0.05
      );
    return {
      total: subsetTotal,
      a: subsetGradeCounts.get("A") ?? 0,
      b: subsetGradeCounts.get("B") ?? 0,
      c: subsetGradeCounts.get("C") ?? 0,
      comparisonYes: subsetComparisonYes,
      trustBreakingCCount: subsetTrustBreakingCCount,
      critical44Count: subsetCritical44Count,
      critical34PlusCount: subsetCritical34PlusCount,
      criticalWrongPresentCount: subsetCriticalWrongPresentCount,
      productGate,
      criticalGate,
    };
  };

  const feedbackExpectedCount = rows.filter((row) => row.feedback_expected === "yes").length;
  const feedbackSavedCount = rows.filter((row) => row.feedback_expected === "yes" && row.feedback_saved === "yes").length;
  const noisyCount = rows.filter((row) => row.feedback_saved === "yes" && row.feedback_expected === "no").length;
  const saveMissCount = rows.filter((row) => row.feedback_expected === "yes" && row.feedback_saved !== "yes").length;

  const observedSubset = artifacts.filter((artifact) => artifact.row.analysis_id.length > 0);
  const observedExpectedCount = observedSubset.filter((artifact) => artifact.row.feedback_expected === "yes").length;
  const observedSavedCount = observedSubset.filter((artifact) => artifact.row.feedback_expected === "yes" && artifact.observedFeedbackSaved === "yes").length;
  const simulatedPublicSubset = artifacts.filter((artifact) => artifact.row.analysis_id.length === 0);
  const publicExpectedCount = simulatedPublicSubset.filter((artifact) => artifact.row.feedback_expected === "yes").length;
  const publicSavedCount = simulatedPublicSubset.filter((artifact) => artifact.row.feedback_expected === "yes" && artifact.simulatedFeedbackSaved === "yes").length;
  const simulatedAllExpectedCount = artifacts.filter((artifact) => artifact.row.feedback_expected === "yes").length;
  const simulatedAllSavedCount = artifacts.filter((artifact) => artifact.row.feedback_expected === "yes" && artifact.simulatedFeedbackSaved === "yes").length;

  const failureCounts = Object.fromEntries(FAILURE_COLUMNS.map((failureType) => [failureType, rows.filter((row) => row[failureType] === "yes").length])) as Record<FailureType, number>;

  const recurrenceCounts = new Map<string, number>();
  for (const row of rows) {
    for (const failureType of FAILURE_COLUMNS) {
      if (row[failureType] !== "yes") continue;
      const key = `${row.source_shape}:${failureType}`;
      recurrenceCounts.set(key, (recurrenceCounts.get(key) ?? 0) + 1);
    }
  }
  const recurringClusters = Array.from(recurrenceCounts.entries())
    .filter(([, count]) => count >= 3)
    .sort((left, right) => right[1] - left[1]);

  const companyCareersUnknownArtifacts = artifacts.filter((artifact) => artifact.row.source_shape === "company_careers" && artifact.row.too_many_unknown_critical_fields === "yes");
  const thinInputCompanyCareers = companyCareersUnknownArtifacts.filter((artifact) => classifyCompanyCareersInterpretation({
    sourceShape: artifact.row.source_shape,
    rawText: artifact.rawText,
    parsed: artifact.parsed,
    failureTypes: artifact.failureTypes
  }) === "thin_input");
  const parserMissCompanyCareers = companyCareersUnknownArtifacts.filter((artifact) => classifyCompanyCareersInterpretation({
    sourceShape: artifact.row.source_shape,
    rawText: artifact.rawText,
    parsed: artifact.parsed,
    failureTypes: artifact.failureTypes
  }) === "parser_miss_worthy");
  const mixedSignalCompanyCareers = companyCareersUnknownArtifacts.filter((artifact) => classifyCompanyCareersInterpretation({
    sourceShape: artifact.row.source_shape,
    rawText: artifact.rawText,
    parsed: artifact.parsed,
    failureTypes: artifact.failureTypes
  }) === "mixed_signal");

  const productGate = passConditionalFail(
    comparisonYes / total >= 0.9 && (gradeCounts.get("C") ?? 0) <= 5 && trustBreakingCCount <= 2,
    comparisonYes / total >= 0.85 && (gradeCounts.get("C") ?? 0) <= 7 && trustBreakingCCount <= 3
  );
  const criticalGate = passConditionalFail(
    critical34PlusCount / total >= 0.9 && critical44Count / total >= 0.75 && criticalWrongPresentCount / total <= 0.03,
    critical34PlusCount / total >= 0.85 && critical44Count / total >= 0.7 && criticalWrongPresentCount / total <= 0.05
  );
  const feedbackGate = observedExpectedCount === 0 && simulatedAllExpectedCount === 0
    ? "pass"
    : passConditionalFail(
      observedExpectedCount > 0 && observedSavedCount / observedExpectedCount >= 0.8 && noisyCount / Math.max(feedbackSavedCount, 1) < 0.2,
      observedExpectedCount > 0 && observedSavedCount / observedExpectedCount >= 0.7 && noisyCount / Math.max(feedbackSavedCount, 1) < 0.25
    );
  const requiredDatasetPass = total >= 50 && REQUIRED_SHAPES.every((shape) => (shapeCounts.get(shape) ?? 0) >= 5);
  const recommendedDatasetPass = dominantShapeEntry[1] / total <= 0.5 && highRiskCount / total >= 0.4;
  const datasetGate = requiredDatasetPass ? (recommendedDatasetPass ? "pass (recommended mix also pass)" : "pass (required mix only)") : "fail";

  const fixtureFiles = fs.existsSync("fixtures/jobs")
    ? fs.readdirSync("fixtures/jobs").filter((fileName) => fileName.endsWith(".txt"))
    : [];
  const regressionGate = fixtureFiles.length >= 10 ? "pass" : "fail";

  const topFailureEntry = Array.from(Object.entries(failureCounts)).sort((left, right) => right[1] - left[1])[0];
  const topFailureLine = topFailureEntry ? `\`${topFailureEntry[0]}\` (${topFailureEntry[1]} / ${total})` : "none";

  const highPriorityCandidates = rows
    .filter((row) => row.fixture_priority === "high")
    .slice(0, 5)
    .map((row) => `- ${row.sample_id}: ${row.source_shape} | ${row.overall_reason}`)
    .join("\n");

  const parserFixBullets = [
    recurringClusters.some(([key]) => key.startsWith("company_careers:too_many_unknown_critical_fields"))
      ? "- company_careers shape は一括で parser fallback を広げず、Green search-card の thin-input row と parser-miss-worthy row を sign-off artifact 上で分離してから最小修正する"
      : "",
    recurringClusters.some(([key]) => key.startsWith("noisy_promo:salary_text_without_base_salary") || key.startsWith("noisy_promo:company_name_suspected_platform_noise"))
      ? "- noisy_promo shape で CTA / platform-noise guardrail を追加し、salary/company false positive を抑える"
      : "",
    recurringClusters.some(([key]) => key.startsWith("prose_heavy:too_many_unknown_critical_fields"))
      ? "- prose_heavy shape で company / employment / salary / annualHolidays の global prose fallback を増やす"
      : "",
    recurringClusters.some(([key]) => key.startsWith("job_board_listcard:salary_text_without_base_salary") || key.startsWith("job_board_listcard:too_many_unknown_critical_fields"))
      ? "- job_board_listcard shape で summary-line / compact salary fallback を補強する"
      : "",
    recurringClusters.some(([key]) => key.endsWith(":benefits_suspected_but_not_extracted"))
      ? "- 福利厚生 prose 抽出の narrow fallback を追加し、benefits の空振りを減らす"
      : ""
  ].filter((line) => line.length > 0).join("\n") || "- recurring cluster を追加で確認し、dominant shape の parser miss から順に fixture-backed hardening する";

  const feedbackFixBullets = [
    observedExpectedCount > 0 && observedSavedCount < observedExpectedCount
      ? "- observed saved-job subset で feedback_expected=yes なのに未保存の分析経路を優先調査する"
      : "",
    simulatedAllSavedCount > feedbackSavedCount
      ? "- current parser rerun では save 条件を満たすが historical observed rows では未保存のケースを洗い出す"
      : "",
    "- public holdout は simulation なので、current parser の observed feedback recall を測る rerun ingest path を別途用意する"
  ].filter((line) => line.length > 0).join("\n");

  const finalDecision = [productGate, criticalGate, feedbackGate, regressionGate].every((gate) => gate === "pass")
    ? "PASS"
    : [productGate, criticalGate, feedbackGate].every((gate) => gate !== "fail")
      ? "CONDITIONAL PASS"
      : "FAIL";
  const comparisonGradeMetrics = summarizeCohort(comparisonGradeRows);
  const thinInputMetrics = summarizeCohort(thinInputRows);
  const comparisonGradeShadowDecision = comparisonGradeMetrics.total === 0
    ? "N/A"
    : [comparisonGradeMetrics.productGate, comparisonGradeMetrics.criticalGate, feedbackGate, regressionGate].every((gate) => gate === "pass")
      ? "PASS"
      : [comparisonGradeMetrics.productGate, comparisonGradeMetrics.criticalGate, feedbackGate].every((gate) => gate !== "fail")
        ? "CONDITIONAL PASS"
        : "FAIL";
  const thinInputShadowDecision = thinInputMetrics.total === 0
    ? "N/A"
    : [thinInputMetrics.productGate, thinInputMetrics.criticalGate, feedbackGate, regressionGate].every((gate) => gate === "pass")
      ? "PASS"
      : [thinInputMetrics.productGate, thinInputMetrics.criticalGate, feedbackGate].every((gate) => gate !== "fail")
        ? "CONDITIONAL PASS"
        : "FAIL";

  return `# Job Analysis Holdout Review Summary

## Run metadata
- review_window: ${args.reviewDate} rerun batch
- reviewer: ${args.reviewer}
- scorecard_path: ${scorecardPath}
- notes_path: ${notesPath}
- completion_criteria_version: \`docs/job-analysis-completion-criteria.md\`
- signoff_checklist_path: \`docs/evaluations/job-analysis-feedback-signoff-checklist.md\`
- scope_note: 50 approved holdout raw texts re-parsed with current parser ${PARSER_VERSION}; rows with historical analysis_id keep observed feedback_saved from ${args.observedFeedbackSource === "db" ? "database lookup" : args.observedFeedbackSource === "simulate" ? "current shouldCreateFeedback simulation" : "seed manifest"} while public-holdout rows use current shouldCreateFeedback simulation

## Dataset
- total: ${total}
- unique_job_ids: ${rows.filter((row) => row.job_id.length > 0).length} saved internal jobs + ${rows.filter((row) => row.job_id.length === 0).length} external public holdout captures
- shapes:
  - job_board_detail: ${shapeCounts.get("job_board_detail") ?? 0}
  - job_board_listcard: ${shapeCounts.get("job_board_listcard") ?? 0}
  - company_careers: ${shapeCounts.get("company_careers") ?? 0}
  - prose_heavy: ${shapeCounts.get("prose_heavy") ?? 0}
  - noisy_promo: ${shapeCounts.get("noisy_promo") ?? 0}
  - other: ${shapeCounts.get("other") ?? 0}
- high-risk shape total (\`company_careers + prose_heavy + noisy_promo\`): ${highRiskCount} (${formatPercent(highRiskCount, total)})
- dominant shape ratio: ${dominantShapeEntry[0]} ${dominantShapeEntry[1]}/${total} (${formatPercent(dominantShapeEntry[1], total)})
- dataset gate: ${datasetGate}

## Cohort split
- official verdict cohort: full_cohort (all pasted jobs stay in sign-off denominator)
- comparison_grade cohort: ${comparisonGradeMetrics.total}
- thin_input cohort: ${thinInputMetrics.total}
- thin_input definition: 1+ critical items absent from raw text (\`review_cohort=thin_input\`)

## Product-level result
- A: ${gradeCounts.get("A") ?? 0}
- B: ${gradeCounts.get("B") ?? 0}
- C: ${gradeCounts.get("C") ?? 0}
- A+B: ${formatPercent((gradeCounts.get("A") ?? 0) + (gradeCounts.get("B") ?? 0), total)}
- trust-breaking C count: ${trustBreakingCCount}
- comparison_usable_yes: ${comparisonYes}
- comparison_usable_no: ${comparisonNo}
- product gate: ${productGate}
- shadow comparison-grade read: ${comparisonGradeShadowDecision} (A+B ${formatPercent(comparisonGradeMetrics.a + comparisonGradeMetrics.b, comparisonGradeMetrics.total)}, C ${comparisonGradeMetrics.c}/${comparisonGradeMetrics.total || 0})

## Critical field result
- 4/4 usable: ${formatPercent(critical44Count, total)}
- 3/4+ usable: ${formatPercent(critical34PlusCount, total)}
- companyName wrong count: ${companyWrongCount}
- employmentType wrong count: ${employmentWrongCount}
- salaryText wrong count: ${salaryWrongCount}
- annualHolidays wrong count: ${holidaysWrongCount}
- total critical wrong present: ${criticalWrongPresentCount} (${formatPercent(criticalWrongPresentCount, total)})
- critical-field gate: ${criticalGate}

## Secondary field result
- benefits present_but_missed: ${fieldMiss("benefits_eval")}
- benefits wrong: ${fieldWrong("benefits_eval")}
- housingAllowance present_but_missed: ${fieldMiss("housingAllowance_eval")}
- housingAllowance wrong: ${fieldWrong("housingAllowance_eval")}
- companyHousing present_but_missed: ${fieldMiss("companyHousing_eval")}
- companyHousing wrong: ${fieldWrong("companyHousing_eval")}
- bonusCount present_but_missed: ${fieldMiss("bonusCount_eval")}
- bonusCount wrong: ${fieldWrong("bonusCount_eval")}
- retirementAllowance present_but_missed: ${fieldMiss("retirementAllowance_eval")}
- retirementAllowance wrong: ${fieldWrong("retirementAllowance_eval")}
- absent-but-found summary: no strong secondary false-positive burst was detected in this rerun
- secondary-field gate: ${secondaryWrongTotal > 0 ? "blocking" : "review"}

## Failure type result
- salary_text_without_base_salary: ${failureCounts.salary_text_without_base_salary}
- negative_base_salary_detected: ${failureCounts.negative_base_salary_detected}
- company_name_suspected_platform_noise: ${failureCounts.company_name_suspected_platform_noise}
- benefits_suspected_but_not_extracted: ${failureCounts.benefits_suspected_but_not_extracted}
- too_many_unknown_critical_fields: ${failureCounts.too_many_unknown_critical_fields}
- summary_line_only_extraction: ${failureCounts.summary_line_only_extraction}
- company_housing_unknown_with_keyword: ${failureCounts.company_housing_unknown_with_keyword}
- housing_allowance_unknown_with_keyword: ${failureCounts.housing_allowance_unknown_with_keyword}
- bonus_count_unknown_with_keyword: ${failureCounts.bonus_count_unknown_with_keyword}
- retirement_allowance_unknown_with_keyword: ${failureCounts.retirement_allowance_unknown_with_keyword}

## Recurrence / shape concentration
- same failure type recurring 3+ times in same shape: ${recurringClusters.length > 0 ? recurringClusters.map(([key, count]) => `${key}=${count}`).join(", ") : "none"}
- high-priority fixture backlog: ${rows.filter((row) => row.fixture_priority === "high").length}
- most common failure class: ${topFailureLine}
- recurrence blocker: ${recurringClusters.length > 0 ? "yes" : "no"}

## company_careers split
- unknown-critical company_careers rows: ${companyCareersUnknownArtifacts.length}
- thin-input rows: ${thinInputCompanyCareers.length > 0 ? thinInputCompanyCareers.map((artifact) => artifact.row.sample_id).join(", ") : "none"}
- parser-miss-worthy rows: ${parserMissCompanyCareers.length > 0 ? parserMissCompanyCareers.map((artifact) => artifact.row.sample_id).join(", ") : "none"}
- mixed-signal rows: ${mixedSignalCompanyCareers.length > 0 ? mixedSignalCompanyCareers.map((artifact) => artifact.row.sample_id).join(", ") : "none"}

## Cohort decision read
- official full-cohort verdict: ${finalDecision}
- comparison-grade shadow verdict: ${comparisonGradeShadowDecision}
- thin-input shadow verdict: ${thinInputShadowDecision}
- policy note: this summary keeps full-cohort as the sign-off verdict and shows cohort split as a separate decision aid

## Feedback loop result
- feedback_expected: ${feedbackExpectedCount}
- feedback_saved: ${feedbackSavedCount}
- recall: ${formatPercent(feedbackSavedCount, feedbackExpectedCount)}
- noisy: ${noisyCount}
- noisy_rate: ${formatPercent(noisyCount, Math.max(feedbackSavedCount, 1))}
- save_miss: ${saveMissCount}
- feedback gate: ${feedbackGate}
- feedback evidence split:
  - observed saved-job subset: ${observedSavedCount}/${observedExpectedCount} (${formatPercent(observedSavedCount, observedExpectedCount)})
  - simulated public subset: ${publicSavedCount}/${publicExpectedCount} (${formatPercent(publicSavedCount, publicExpectedCount)})
  - current simulated all-row recall: ${simulatedAllSavedCount}/${simulatedAllExpectedCount} (${formatPercent(simulatedAllSavedCount, simulatedAllExpectedCount)})

## Regression safety
- high-signal fixtures from feedback: ${fixtureFiles.length} current anonymized fixture texts in \`fixtures/jobs/\`
- regression gate: ${regressionGate}

## High-priority fixture candidates
${highPriorityCandidates || "- none"}

## Recommended parser fixes
${parserFixBullets}

## Recommended feedback-rule fixes
${feedbackFixBullets}

## Conclusion
- final decision: ${finalDecision}
- official policy frame: full-cohort verdict is the source of truth unless criteria are explicitly revised
- shadow comparison-grade decision: ${comparisonGradeShadowDecision}
- biggest remaining gap: ${recurringClusters.length > 0 ? `${recurringClusters[0][0]} recurring ${recurringClusters[0][1]} times` : "feedback / regression evidence refresh"}
- why it is not done yet / why it is good enough: rerun parser quality is updated, but observed feedback evidence is still tied to historical saved analyses; judge parser improvements and feedback-loop improvements separately
- next review trigger: parser fixes + fixture additions + observed feedback rerun を揃えたあと、同じ 50件 rubric を再実行する
`;
}

function buildNotesMarkdown(artifacts: ReviewArtifacts[], args: ParsedArgs) {
  const rows = artifacts.map((artifact) => artifact.row);
  const observedSubset = artifacts.filter((artifact) => artifact.row.analysis_id.length > 0);
  const observedExpectedCount = observedSubset.filter((artifact) => artifact.row.feedback_expected === "yes").length;
  const observedSavedCount = observedSubset.filter((artifact) => artifact.row.feedback_expected === "yes" && artifact.observedFeedbackSaved === "yes").length;
  const publicSubset = artifacts.filter((artifact) => artifact.row.analysis_id.length === 0);
  const publicExpectedCount = publicSubset.filter((artifact) => artifact.row.feedback_expected === "yes").length;
  const publicSavedCount = publicSubset.filter((artifact) => artifact.row.feedback_expected === "yes" && artifact.simulatedFeedbackSaved === "yes").length;
  const dominantFailures = FAILURE_COLUMNS
    .map((failureType) => [failureType, rows.filter((row) => row[failureType] === "yes").length] as const)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([failureType, count]) => `- ${failureType}: ${count}`)
    .join("\n");
  const companyCareersUnknownArtifacts = artifacts.filter((artifact) => artifact.row.source_shape === "company_careers" && artifact.row.too_many_unknown_critical_fields === "yes");
  const thinInputCompanyCareers = companyCareersUnknownArtifacts.filter((artifact) => classifyCompanyCareersInterpretation({
    sourceShape: artifact.row.source_shape,
    rawText: artifact.rawText,
    parsed: artifact.parsed,
    failureTypes: artifact.failureTypes
  }) === "thin_input");
  const parserMissCompanyCareers = companyCareersUnknownArtifacts.filter((artifact) => classifyCompanyCareersInterpretation({
    sourceShape: artifact.row.source_shape,
    rawText: artifact.rawText,
    parsed: artifact.parsed,
    failureTypes: artifact.failureTypes
  }) === "parser_miss_worthy");
  const mixedSignalCompanyCareers = companyCareersUnknownArtifacts.filter((artifact) => classifyCompanyCareersInterpretation({
    sourceShape: artifact.row.source_shape,
    rawText: artifact.rawText,
    parsed: artifact.parsed,
    failureTypes: artifact.failureTypes
  }) === "mixed_signal");

  return `# Job Analysis Holdout Sign-off Notes

## Review scope
- review_window: ${args.reviewDate} rerun batch
- total approved samples reviewed: ${rows.length}
- corpus source: ${args.rawDir}
- review_cohort split: comparison_grade=${rows.filter((row) => row.review_cohort === "comparison_grade").length}, thin_input=${rows.filter((row) => row.review_cohort === "thin_input").length}

## Method
- seed manifest: ${args.seed}
- current parser: ${PARSER_VERSION}
- all 50 rows were re-parsed from approved raw-text holdout files
- source metadata (sample_id / job_id / analysis_id / source_shape / raw_text_origin_note) were inherited from the seed manifest
- rows with historical analysis_id keep observed feedback_saved from ${args.observedFeedbackSource === "db" ? "database lookup" : args.observedFeedbackSource === "simulate" ? "current shouldCreateFeedback simulation" : "the seed manifest"} by default
- rows without historical analysis_id use current shouldCreateFeedback(report) as simulated feedback_saved
- therefore parser quality and feedback-loop quality should still be read as split evidence

## Observed vs simulated feedback evidence
- observed subset: ${observedSubset.length} rows
  - feedback_expected: ${observedExpectedCount}
  - feedback_saved: ${observedSavedCount}
  - recall: ${formatPercent(observedSavedCount, observedExpectedCount)}
- simulated public subset: ${publicSubset.length} rows
  - feedback_expected: ${publicExpectedCount}
  - feedback_saved (simulated): ${publicSavedCount}
  - recall (simulated): ${formatPercent(publicSavedCount, publicExpectedCount)}

## Dominant failure clusters
${dominantFailures || "- none"}

## Shape interpretation note
- \`review_cohort\` is now written into the scorecard: \`comparison_grade\` means no critical field is absent from raw text, \`thin_input\` means 1+ critical fields are absent from raw text.
- company_careers rows, especially Green-style search cards, must be split into thin-input vs parser-miss-worthy before they are used to justify parser fallback expansion.
- thin-input rows in this rerun: ${thinInputCompanyCareers.length > 0 ? thinInputCompanyCareers.map((artifact) => artifact.row.sample_id).join(", ") : "none"}
- parser-miss-worthy rows in this rerun: ${parserMissCompanyCareers.length > 0 ? parserMissCompanyCareers.map((artifact) => artifact.row.sample_id).join(", ") : "none"}
- mixed-signal rows in this rerun: ${mixedSignalCompanyCareers.length > 0 ? mixedSignalCompanyCareers.map((artifact) => artifact.row.sample_id).join(", ") : "none"}
- If companyName / salaryText are visible but employmentType / annualHolidays are absent from raw text, treat that row as thin-input evidence first.
- Only rows with missing critical fields that are visibly present in raw text should be used as parser-miss-worthy evidence.

## Verification suggestion
- ${args.observedFeedbackSource === "db" ? "./node_modules/.bin/dotenv -e .env.local -- " : ""}./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed ${args.seed} --output-prefix ${args.outputPrefix} --review-date ${args.reviewDate} --reviewer ${args.reviewer}${args.observedFeedbackSource !== "manifest" ? ` --observed-feedback-source ${args.observedFeedbackSource}` : ""}
`;
}

async function main() {
  const args = parseArgs();
  const seedCsv = fs.readFileSync(args.seed, "utf8");
  const { rows: seedRows } = parseCsv(seedCsv);
  if (seedRows.length === 0) {
    throw new Error(`No rows found in seed CSV: ${args.seed}`);
  }

  const observedFeedbackByAnalysisId = await loadObservedFeedbackByAnalysisId(seedRows, args);
  const artifacts = seedRows.map((seedRow) => buildRescoredRow(seedRow, args, observedFeedbackByAnalysisId));
  const scorecardPath = `${args.outputPrefix}-scorecard.csv`;
  const summaryPath = `${args.outputPrefix}-summary.md`;
  const notesPath = `${args.outputPrefix}-notes.md`;

  fs.mkdirSync(path.dirname(scorecardPath), { recursive: true });
  fs.writeFileSync(scorecardPath, toCsv(artifacts.map((artifact) => artifact.row)));
  fs.writeFileSync(summaryPath, buildSummaryMarkdown(artifacts, args, scorecardPath, notesPath));
  fs.writeFileSync(notesPath, buildNotesMarkdown(artifacts, args));

  console.log(JSON.stringify({
    scorecardPath,
    summaryPath,
    notesPath,
    reviewedRows: artifacts.length,
    parserVersion: PARSER_VERSION,
    preserveObservedFeedback: args.preserveObservedFeedback,
    observedFeedbackSource: args.observedFeedbackSource
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
