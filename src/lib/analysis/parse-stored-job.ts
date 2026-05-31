import type { ParsedJob, ExtractedValue, JobWarnings } from "./types";

function withDefault<T>(value: unknown, fallback: ExtractedValue<T>): ExtractedValue<T> {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<ExtractedValue<T>>;
  return {
    status: candidate.status ?? fallback.status,
    value: candidate.value ?? fallback.value,
    evidence: candidate.evidence ?? fallback.evidence,
    confidence: candidate.confidence ?? fallback.confidence,
    source: candidate.source ?? fallback.source
  };
}

function unknownValue<T>(value: T | null = null): ExtractedValue<T> {
  return {
    status: "unknown",
    value,
    evidence: null
  };
}

function normalizeParsedJob(parsed: ParsedJob): ParsedJob {
  return {
    parserVersion: parsed.parserVersion ?? "legacy",
    companyName: withDefault(parsed.companyName, unknownValue<string>()),
    title: withDefault(parsed.title, unknownValue<string>()),
    employmentType: withDefault(parsed.employmentType, unknownValue<string>()),
    salaryText: withDefault(parsed.salaryText, unknownValue<string>()),
    baseSalaryMin: withDefault(parsed.baseSalaryMin, unknownValue<number>()),
    baseSalaryMax: withDefault(parsed.baseSalaryMax, unknownValue<number>()),
    fixedOvertimeHours: withDefault(parsed.fixedOvertimeHours, unknownValue<number>()),
    fixedOvertimePay: withDefault(parsed.fixedOvertimePay, unknownValue<number>()),
    annualHolidays: withDefault(parsed.annualHolidays, unknownValue<number>()),
    holidayType: withDefault(parsed.holidayType, unknownValue<"完全週休2日制" | "週休2日制">()),
    bonusCount: withDefault(parsed.bonusCount, unknownValue<number>()),
    bonusPerformanceLinked: withDefault(parsed.bonusPerformanceLinked, unknownValue<boolean>()),
    housingAllowance: withDefault(parsed.housingAllowance, unknownValue<boolean>()),
    companyHousing: withDefault(parsed.companyHousing, unknownValue<boolean>()),
    retirementAllowance: withDefault(parsed.retirementAllowance, unknownValue<boolean>()),
    benefits: withDefault(parsed.benefits, unknownValue<string[]>([])),
    warnings: withDefault(parsed.warnings, unknownValue<JobWarnings[]>([]))
  };
}

export function parseStoredParsedJob(value: string | null | undefined, context = "unknown"): ParsedJob | null {
  if (!value) return null;

  try {
    return normalizeParsedJob(JSON.parse(value) as ParsedJob);
  } catch (error) {
    console.error(`[analysis] failed to parse stored ParsedJob (${context})`, error);
    return null;
  }
}
