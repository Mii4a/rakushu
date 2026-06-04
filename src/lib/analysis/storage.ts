import { buildMissingItemSummary, type MissingItemSummary } from "./missing-items";
import type { ExtractedValue, ParsedJob } from "./types";

function stripEvidence<T>(field: ExtractedValue<T>): ExtractedValue<T> {
  return {
    ...field,
    evidence: null
  };
}

export function buildStoredParsedJobSnapshot(parsed: ParsedJob): ParsedJob {
  return {
    parserVersion: parsed.parserVersion,
    companyName: stripEvidence(parsed.companyName),
    title: stripEvidence(parsed.title),
    employmentType: stripEvidence(parsed.employmentType),
    salaryText: stripEvidence(parsed.salaryText),
    baseSalaryMin: stripEvidence(parsed.baseSalaryMin),
    baseSalaryMax: stripEvidence(parsed.baseSalaryMax),
    fixedOvertimeHours: stripEvidence(parsed.fixedOvertimeHours),
    fixedOvertimePay: stripEvidence(parsed.fixedOvertimePay),
    annualHolidays: stripEvidence(parsed.annualHolidays),
    holidayType: stripEvidence(parsed.holidayType),
    bonusCount: stripEvidence(parsed.bonusCount),
    bonusPerformanceLinked: stripEvidence(parsed.bonusPerformanceLinked),
    housingAllowance: stripEvidence(parsed.housingAllowance),
    companyHousing: stripEvidence(parsed.companyHousing),
    retirementAllowance: stripEvidence(parsed.retirementAllowance),
    benefits: stripEvidence(parsed.benefits),
    warnings: stripEvidence(parsed.warnings)
  };
}

export function serializeStoredParsedJobSnapshot(parsed: ParsedJob): string {
  return JSON.stringify(buildStoredParsedJobSnapshot(parsed));
}

export function buildStoredMissingItemSummary(rawText: string, parsed: ParsedJob): MissingItemSummary {
  return buildMissingItemSummary(parsed, rawText);
}

export function serializeStoredMissingItemSummary(rawText: string, parsed: ParsedJob): string {
  return JSON.stringify(buildStoredMissingItemSummary(rawText, parsed));
}

export function parseStoredMissingItemSummary(value: string | null | undefined): MissingItemSummary | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<MissingItemSummary>;
    return {
      missingInRawText: Array.isArray(parsed.missingInRawText) ? parsed.missingInRawText : [],
      ambiguousButVisible: Array.isArray(parsed.ambiguousButVisible) ? parsed.ambiguousButVisible : [],
      thinInput: parsed.thinInput === true,
      thinInputReason: Array.isArray(parsed.thinInputReason) ? parsed.thinInputReason : []
    };
  } catch (error) {
    console.error("[analysis] failed to parse stored missing item summary", error);
    return null;
  }
}
