import type { ExtractedValue, JobWarnings, ParsedJob } from "@/lib/analysis/types";

export const PARSER_VERSION = "v1.0.0";

function found<T>(value: T, evidence: string): ExtractedValue<T> {
  return { status: "found", value, evidence };
}

function unknown<T>(): ExtractedValue<T> {
  return { status: "unknown", value: null, evidence: null };
}

function none<T>(evidence: string): ExtractedValue<T> {
  return { status: "none", value: null, evidence };
}

function captureByRegex(text: string, regexes: RegExp[]): RegExpExecArray | null {
  for (const regex of regexes) {
    const match = regex.exec(text);
    if (match) return match;
  }
  return null;
}

function extractCompanyName(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/会社名[:：]\s*([^\n]+)/, /企業名[:：]\s*([^\n]+)/]);
  if (!match) return unknown();
  return found(match[1].trim(), match[0]);
}

function extractTitle(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/職種[:：]\s*([^\n]+)/, /募集職種[:：]\s*([^\n]+)/, /仕事内容[:：]\s*([^\n]+)/]);
  if (!match) return unknown();
  return found(match[1].trim(), match[0]);
}

function extractEmploymentType(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/雇用形態[:：]\s*([^\n]+)/]);
  if (!match) return unknown();
  return found(match[1].trim(), match[0]);
}

function extractSalaryText(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/給与[:：]\s*([^\n]+)/, /月給[:：]?\s*([^\n]+)/, /年収[:：]?\s*([^\n]+)/]);
  if (!match) return unknown();
  return found(match[1].trim(), match[0]);
}

function normalizeJPY(value: string): number {
  const numeric = value.replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function extractBaseSalary(text: string): {
  min: ExtractedValue<number>;
  max: ExtractedValue<number>;
} {
  const rangeMatch = captureByRegex(text, [/基本給[:：]?\s*([\d,]+)円?\s*[〜~\-]\s*([\d,]+)円?/]);
  if (rangeMatch) {
    return {
      min: found(normalizeJPY(rangeMatch[1]), rangeMatch[0]),
      max: found(normalizeJPY(rangeMatch[2]), rangeMatch[0])
    };
  }

  const singleMatch = captureByRegex(text, [/基本給[:：]?\s*([\d,]+)円?/]);
  if (singleMatch) {
    const amount = normalizeJPY(singleMatch[1]);
    return {
      min: found(amount, singleMatch[0]),
      max: found(amount, singleMatch[0])
    };
  }

  return {
    min: unknown(),
    max: unknown()
  };
}

function extractFixedOvertimeHours(text: string): ExtractedValue<number> {
  if (/固定残業(?:代|手当)なし/.test(text)) {
    const evidence = /固定残業(?:代|手当)なし/.exec(text);
    if (evidence) return none(evidence[0]);
  }

  const match = captureByRegex(text, [/固定残業(?:代|手当)[^\n]{0,20}?([0-9]{1,2})時間/]);
  if (!match) return unknown();
  return found(Number(match[1]), match[0]);
}

function extractFixedOvertimePay(text: string): ExtractedValue<number> {
  if (/固定残業(?:代|手当)なし/.test(text)) {
    const evidence = /固定残業(?:代|手当)なし/.exec(text);
    if (evidence) return none(evidence[0]);
  }

  const match = captureByRegex(text, [/固定残業(?:代|手当)[^\n]{0,20}?([\d,]+)円/]);
  if (!match) return unknown();
  return found(normalizeJPY(match[1]), match[0]);
}

function extractAnnualHolidays(text: string): ExtractedValue<number> {
  const match = captureByRegex(text, [/年間休日[:：]?\s*([0-9]{2,3})日/]);
  if (!match) return unknown();
  return found(Number(match[1]), match[0]);
}

function extractHolidayType(text: string): ExtractedValue<"完全週休2日制" | "週休2日制"> {
  const exact = /完全週休2日制/.exec(text);
  if (exact) return found("完全週休2日制", exact[0]);

  const weekly = /週休2日制/.exec(text);
  if (weekly) return found("週休2日制", weekly[0]);

  if (/シフト制|会社カレンダー/.test(text)) {
    const vague = /シフト制|会社カレンダー/.exec(text);
    return { status: "unknown", value: null, evidence: vague?.[0] ?? null };
  }

  return unknown();
}

function extractHousingAllowance(text: string): ExtractedValue<boolean> {
  const noneMatch = /住宅手当\s*(?:なし|無)/.exec(text);
  if (noneMatch) return none(noneMatch[0]);

  const hasMatch = /住宅手当(?:あり|支給)/.exec(text);
  if (!hasMatch) return unknown();
  return found(true, hasMatch[0]);
}

function extractCompanyHousing(text: string): ExtractedValue<boolean> {
  const noneMatch = /(社宅|借上社宅)\s*(?:なし|無)/.exec(text);
  if (noneMatch) return none(noneMatch[0]);

  const hasMatch = /(社宅|借上社宅)(?:あり|制度あり|利用可)/.exec(text);
  if (!hasMatch) return unknown();
  return found(true, hasMatch[0]);
}

function extractBenefits(text: string): ExtractedValue<string[]> {
  const keywords = ["社会保険完備", "通勤手当", "退職金制度", "資格取得支援", "研修制度", "育休取得実績"];
  const matched = keywords.filter((keyword) => text.includes(keyword));

  if (matched.length === 0) return unknown();
  return found(matched, matched.join(" / "));
}

const warningKeywords: JobWarnings[] = [
  "アットホーム",
  "若手活躍",
  "成長できる環境",
  "裁量が大きい",
  "やりがい",
  "風通しが良い",
  "人物重視"
];

function extractWarnings(text: string): ExtractedValue<JobWarnings[]> {
  const matched = warningKeywords.filter((keyword) => text.includes(keyword));
  if (matched.length === 0) return none("警告キーワードなし");
  return found(matched, matched.join(" / "));
}

export function parseJobText(rawText: string): ParsedJob {
  const baseSalary = extractBaseSalary(rawText);

  return {
    parserVersion: PARSER_VERSION,
    companyName: extractCompanyName(rawText),
    title: extractTitle(rawText),
    employmentType: extractEmploymentType(rawText),
    salaryText: extractSalaryText(rawText),
    baseSalaryMin: baseSalary.min,
    baseSalaryMax: baseSalary.max,
    fixedOvertimeHours: extractFixedOvertimeHours(rawText),
    fixedOvertimePay: extractFixedOvertimePay(rawText),
    annualHolidays: extractAnnualHolidays(rawText),
    holidayType: extractHolidayType(rawText),
    housingAllowance: extractHousingAllowance(rawText),
    companyHousing: extractCompanyHousing(rawText),
    benefits: extractBenefits(rawText),
    warnings: extractWarnings(rawText)
  };
}
