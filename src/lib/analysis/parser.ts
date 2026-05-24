import { buildSectionMap, firstNonEmptyLine, getCombinedSectionValue, getSectionValue, isSectionHeadingLine, normalizeLineValue, normalizeText, type SectionMap } from "./section-map";
import type { ExtractConfidence, ExtractedValue, ExtractSource, JobWarnings, ParsedJob } from "./types";

export const PARSER_VERSION = "v1.6.1";

type ParserContext = {
  text: string;
  sections: SectionMap;
};

function found<T>(value: T, evidence: string, source: ExtractSource = "global_scan", confidence: ExtractConfidence = "medium"): ExtractedValue<T> {
  return { status: "found", value, evidence, source, confidence };
}

function unknown<T>(source: ExtractSource = "validation", confidence: ExtractConfidence = "low"): ExtractedValue<T> {
  return { status: "unknown", value: null, evidence: null, source, confidence };
}

function none<T>(evidence: string, source: ExtractSource = "global_scan", confidence: ExtractConfidence = "high"): ExtractedValue<T> {
  return { status: "none", value: null, evidence, source, confidence };
}

function captureByRegex(text: string, regexes: RegExp[]): RegExpExecArray | null {
  for (const regex of regexes) {
    const match = regex.exec(text);
    if (match) return match;
  }
  return null;
}


const companyEntityWords = ["株式会社", "有限会社", "合同会社", "学校法人", "社会福祉法人", "一般社団法人", "弁護士法人"] as const;
const companyNameTokenPattern = "[A-Za-zＡ-Ｚａ-ｚ0-9０-９ぁ-んァ-ヶー一-龠々・･＆&.．ー－_-]+";
const companyNameBodyPattern = `${companyNameTokenPattern}(?:[\\s　]+${companyNameTokenPattern}){0,4}`;

function normalizeCompanyCandidate(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人)\s+/, "$1")
    .replace(/\s+(株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人)$/, "$1")
    .replace(/(?:の他の募集.*|の求人.*|求人・中途採用情報.*)$/, "")
    .trim();
}

function extractCompanyCandidate(line: string): string | null {
  const normalized = normalizeLineValue(line);
  const trimmedNoise = normalized.replace(/(?:の他の募集.*|の求人.*|求人・中途採用情報.*)$/, "").trim();
  const suffixPattern = new RegExp(`(${companyNameBodyPattern}[\\s　]*(?:${companyEntityWords.join("|")}))$`);
  const prefixPattern = new RegExp(`((?:${companyEntityWords.join("|")})[\\s　]*${companyNameBodyPattern})`);

  const suffixMatch = suffixPattern.exec(trimmedNoise);
  if (suffixMatch?.[1]) return normalizeCompanyCandidate(suffixMatch[1]);

  const prefixMatch = prefixPattern.exec(trimmedNoise);
  if (prefixMatch?.[1]) return normalizeCompanyCandidate(prefixMatch[1]);

  return null;
}

function findCompanyNameFromTopLines(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0)
    .slice(0, 8);

  const candidates: Array<{ company: string; line: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isSectionHeadingLine(line)) continue;
    if (lines[index - 1] === "連絡先") continue;
    const company = extractCompanyCandidate(line);
    if (company) candidates.push({ company, line });
  }

  if (candidates.length === 0) return null;
  const bestCandidate = candidates.sort((left, right) => left.company.length - right.company.length)[0];
  return found(bestCandidate.company, bestCandidate.line, "summary_line", "medium");
}

function findCompanyNameFromOtherJobsLine(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (!line.includes("他の募集")) continue;
    const prefix = line.split("の他の募集")[0] ?? line;
    const company = extractCompanyCandidate(prefix);
    if (company) return found(company, line, "global_scan", "medium");
  }

  return null;
}

function findCompanyNameFromBrandedProse(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0)
    .slice(0, 40);

  for (const line of lines) {
    const brandedMatch = /([A-Za-z][A-Za-z0-9&._-]{1,30})の(?:広報活動|採用広報|採用活動|採用|サービス|事業|開発|プロダクト)/.exec(line);
    if (brandedMatch?.[1]) {
      return found(normalizeCompanyCandidate(brandedMatch[1]), line, "global_scan", "low");
    }
  }

  return null;
}

const employmentTypeKeywords = [
  "正社員",
  "契約社員",
  "派遣社員",
  "紹介予定派遣",
  "アルバイト・パート",
  "アルバイト",
  "パート",
  "業務委託",
  "インターン"
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function employmentKeywordPattern(keyword: string): RegExp {
  return new RegExp(`${escapeRegex(keyword)}(?:$|[^ぁ-んァ-ヶーA-Za-zＡ-Ｚａ-ｚ0-9０-９])`);
}

function isEmploymentKeywordNoise(line: string, keyword: string): boolean {
  if (keyword !== "パート") return false;
  return /(パートナー|エキスパート)/.test(line);
}

function findEmploymentTypeInCompressedSummaryLine(line: string): string | null {
  const summaryDescriptors = ["既卒", "第二新卒", "社会人経験", "未経験", "経験者", "歓迎", "転勤", "学歴", "ブランク", "リモート", "在宅", "副業", "服装"];

  for (const keyword of employmentTypeKeywords) {
    if (isEmploymentKeywordNoise(line, keyword)) continue;
    if (line.startsWith(keyword)) return keyword;

    if (summaryDescriptors.some((descriptor) => line.includes(`${keyword}${descriptor}`))) {
      return keyword;
    }
  }

  return null;
}

function findEmploymentTypeInLines(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0)
    .slice(0, 30);

  for (const line of lines) {
    const compressedKeyword = findEmploymentTypeInCompressedSummaryLine(line);
    if (compressedKeyword) return found(compressedKeyword, line, "summary_line", "medium");

    for (const keyword of employmentTypeKeywords) {
      if (isEmploymentKeywordNoise(line, keyword)) continue;
      if (employmentKeywordPattern(keyword).test(line)) return found(keyword, line, "summary_line", "medium");
    }
  }

  return null;
}

function findEmploymentTypeInProseNotes(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (/募集は行っておりません|募集しておりません|募集なし/.test(line)) continue;

    for (const keyword of employmentTypeKeywords) {
      if (isEmploymentKeywordNoise(line, keyword)) continue;
      if (new RegExp(`(?:^|[※\s])${escapeRegex(keyword)}募集(?:$|[^ぁ-んァ-ヶーA-Za-zＡ-Ｚａ-ｚ0-9０-９])`).test(line)) {
        return found(keyword, line, "global_scan", "medium");
      }
    }
  }

  return null;
}

function extractCompanyName(context: ParserContext): ExtractedValue<string> {
  const match = captureByRegex(context.text, [/会社名[:：]\s*([^\n]+)/, /企業名[:：]\s*([^\n]+)/]);
  if (match) return found(match[1].trim(), match[0], "direct_label", "high");

  const companySection = getSectionValue(context.sections, ["会社名"]);
  const companyLine = companySection ? firstNonEmptyLine(companySection) : null;
  if (companyLine) {
    return found(companyLine, `会社名\n${companyLine}`, "section", "high");
  }

  const enterpriseSection = getSectionValue(context.sections, ["企業名"]);
  const enterpriseLine = enterpriseSection ? firstNonEmptyLine(enterpriseSection) : null;
  if (enterpriseLine) {
    return found(enterpriseLine, `企業名\n${enterpriseLine}`, "section", "high");
  }

  const topLineCompany = findCompanyNameFromTopLines(context);
  if (topLineCompany) return topLineCompany;

  const otherJobsCompany = findCompanyNameFromOtherJobsLine(context);
  if (otherJobsCompany) return otherJobsCompany;

  const brandedProseCompany = findCompanyNameFromBrandedProse(context);
  if (brandedProseCompany) return brandedProseCompany;

  const contactSection = getSectionValue(context.sections, ["連絡先"]);
  if (contactSection) {
    const contactCompanyLine = contactSection
      .split("\n")
      .map((line) => normalizeLineValue(line))
      .find((line) => /株式会社/.test(line));

    if (contactCompanyLine) {
      const companyMatch = /([^\s　]+株式会社|株式会社[^\s　]+)/.exec(contactCompanyLine);
      if (companyMatch) return found(companyMatch[1].trim(), contactCompanyLine, "contact", "medium");
    }
  }

  return unknown();
}

function extractTitle(context: ParserContext): ExtractedValue<string> {
  const match = captureByRegex(context.text, [/職種[:：]\s*([^\n]+)/, /募集職種[:：]\s*([^\n]+)/, /仕事内容[:：]\s*([^\n]+)/]);
  if (match) return found(match[1].trim(), match[0], "direct_label", "high");

  const section = getSectionValue(context.sections, ["募集職種", "職種"]);
  const line = section ? firstNonEmptyLine(section) : null;
  if (!line) return unknown();
  return found(line, `募集職種\n${line}`, "section", "high");
}

function extractEmploymentType(context: ParserContext): ExtractedValue<string> {
  const match = captureByRegex(context.text, [/雇用形態[:：]\s*([^\n]+)/, /雇用区分[:：]\s*([^\n]+)/, /契約形態[:：]\s*([^\n]+)/]);
  if (match) return found(match[1].trim(), match[0], "direct_label", "high");

  const section = getSectionValue(context.sections, ["雇用形態", "雇用区分", "契約形態"]);
  const line = section ? firstNonEmptyLine(section) : null;
  if (line) return found(line, line, "section", "high");

  const inferred = findEmploymentTypeInLines(context);
  if (inferred) return inferred;

  const proseInferred = findEmploymentTypeInProseNotes(context);
  if (proseInferred) return proseInferred;

  return unknown();
}

const salaryInlinePatterns = [
  /((?:月給|年収|想定年収|給与)\s*[:：]?\s*[0-9０-９,]+円\s*[〜~\-]\s*[0-9０-９,]+円)/,
  /((?:月給|年収|想定年収|給与)\s*[:：]?\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円\s*[〜~\-]\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円(?:です|以上)?)/,
  /((?:月給|年収|想定年収|給与)\s*[:：]?\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円(?:以上)?)/,
  /((?:月給|年収|想定年収|給与)\s*[:：]?\s*[0-9０-９,]+円)/
] as const;

const summarySalaryPatterns = [
  /(([0-9０-９]+(?:\.[0-9０-９]+)?万円\s*[〜~\-]\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円))/, 
  /(([0-9０-９]+(?:\.[0-9０-９]+)?\s*[〜~\-]\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円))/, 
  /(([0-9０-９,]+円\s*[〜~\-]\s*[0-9０-９,]+円))/, 
  /(([0-9０-９,]+\s*[〜~\-]\s*[0-9０-９,]+円))/, 
  /(([0-9０-９]+(?:\.[0-9０-９]+)?万円以上))/, 
  /(([0-9０-９,]+円以上))/
] as const;

function isLikelySalaryText(value: string): boolean {
  return /[0-9０-９]/.test(value) && /(円|万円)/.test(value);
}

function isLikelySalaryNoise(value: string): boolean {
  return /(応募要件|選考プロセス|ご覧いただくには|話を聞きに行く|応募する|気になる|もっと見る|年収UP実績|平均年収UP|UP実績[0-9０-９]|還元率[0-9０-９]|売上[0-9０-９]+)/.test(value);
}

function cleanSalaryText(value: string): string {
  return value
    .trim()
    .replace(/^(?:給与|想定年収|年収|月給)\s*[:：]?\s*/, "")
    .replace(/[。.]$/, "");
}

function findSalaryTextInLines(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((rawLine) => normalizeLineValue(rawLine))
    .filter((rawLine) => rawLine.length > 0 && !isSectionHeadingLine(rawLine))
    .slice(0, 12);

  for (const line of lines) {
    const match = captureByRegex(line, [...salaryInlinePatterns]);
    if (match) {
      return found(cleanSalaryText(match[1] ?? match[0]), match[0], "summary_line", "medium");
    }

    const summaryMatch = captureByRegex(line, [...summarySalaryPatterns]);
    if (summaryMatch) {
      const value = cleanSalaryText(summaryMatch[1] ?? summaryMatch[0]);
      if (isLikelySalaryText(value) && !isLikelySalaryNoise(value)) {
        return found(value, summaryMatch[0], "summary_line", "medium");
      }
    }
  }

  const proseMatch = captureByRegex(context.text, [
    /((?:想定年収は|年収は|月給は)[^。\n]+(?:円|万円)(?:\s*[〜~\-]\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円)?(?:です)?)/,
    ...salaryInlinePatterns
  ]);
  if (proseMatch) {
    return found(cleanSalaryText(proseMatch[1] ?? proseMatch[0]), proseMatch[0], "global_scan", "medium");
  }

  return null;
}

function extractSalaryText(context: ParserContext): ExtractedValue<string> {
  const directMatch = captureByRegex(context.text, [
    /給与[:：]\s*([^\n]+)/,
    /給与・報酬[:：]\s*([^\n]+)/,
    /想定年収[:：]\s*([^\n]+)/,
    /年収例[:：]\s*([^\n]+)/
  ]);
  if (directMatch) {
    const value = cleanSalaryText(directMatch[1].trim());
    if (isLikelySalaryText(value) && !isLikelySalaryNoise(value)) return found(value, directMatch[0], "direct_label", "high");
  }

  const salarySection = getSectionValue(context.sections, ["給与", "給与・報酬", "想定年収", "年収例"]);
  const salaryLines = salarySection
    ? salarySection
        .split("\n")
        .map((rawLine) => normalizeLineValue(rawLine))
        .filter((rawLine) => rawLine.length > 0)
    : [];
  const line = salaryLines.find((rawLine) => /([0-9０-９].*(?:円|万円)|(?:円|万円).*[0-9０-９])/.test(rawLine))
    ?? salaryLines.find((rawLine) => /(月給|年収|想定年収|時給|日給)/.test(rawLine))
    ?? (salarySection ? firstNonEmptyLine(salarySection) : null);
  if (line) return found(line, `給与\n${line}`, "section", "high");

  const inferred = findSalaryTextInLines(context);
  if (inferred) return inferred;

  const fallbackMatch = captureByRegex(context.text, [/月給[:：]?\s*([^\n]+)/, /年収[:：]?\s*([^\n]+)/, /想定年収[:：]?\s*([^\n]+)/]);
  if (!fallbackMatch) return unknown();
  const fallbackValue = cleanSalaryText(fallbackMatch[1].trim());
  if (!isLikelySalaryText(fallbackValue) || isLikelySalaryNoise(fallbackValue)) return unknown();
  return found(fallbackValue, fallbackMatch[0], "global_scan", "medium");
}

function normalizeJPY(value: string): number {
  const numeric = value.replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function normalizeAsciiDigits(value: string): string {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

function parseJapaneseMoneyAmount(rawValue: string): number | null {
  const normalized = normalizeAsciiDigits(rawValue).replace(/,/g, "").trim();

  const yenMatch = /^([0-9]+)円$/.exec(normalized);
  if (yenMatch) return Number(yenMatch[1]);

  const manPlusYenMatch = /^([0-9]+)万([0-9]+)円(?:以上)?$/.exec(normalized);
  if (manPlusYenMatch) return Number(manPlusYenMatch[1]) * 10000 + Number(manPlusYenMatch[2]);

  const manMatch = /^([0-9]+(?:\.[0-9]+)?)万円(?:以上)?$/.exec(normalized);
  if (manMatch) return Math.round(Number(manMatch[1]) * 10000);

  return null;
}

function extractMoneyAmounts(text: string): number[] {
  const normalizedText = normalizeAsciiDigits(text);
  const matches = normalizedText.matchAll(/([0-9]+万[0-9,]+円(?:以上)?|[0-9]+(?:\.[0-9]+)?万円(?:以上)?|[0-9,]+円)/g);
  return [...matches]
    .map((match) => parseJapaneseMoneyAmount(match[1]))
    .filter((amount): amount is number => amount != null);
}

function extractMonthlyAmounts(text: string): number[] {
  const normalizedText = normalizeAsciiDigits(text);
  const lines = normalizedText.split("\n").filter((line) => /月給/.test(line));
  return lines.flatMap((line) => extractMoneyAmounts(line));
}

function extractFixedOvertimeMatch(text: string) {
  const noneMatch = /(?:固定残業(?:代|手当)|みなし残業代?)(?:制)?(?:は)?\s*(?:なし|無|採用しておりません)/.exec(text);
  if (noneMatch) {
    return {
      none: true as const,
      hours: null,
      pay: null,
      evidence: noneMatch[0]
    };
  }

  const hoursMatch = captureByRegex(text, [/(?:固定残業(?:代|手当)|みなし残業代?)[^\n]{0,60}?([0-9]{1,2})時間(?:\s*([0-9]{1,2})分)?/]);
  const payMatch = captureByRegex(text, [/(?:固定残業(?:代|手当)|みなし残業代?)[^\n]{0,60}?([0-9]+万[0-9,]+円|[0-9]+(?:\.[0-9]+)?万円|[\d,]+円)/]);

  return {
    none: false as const,
    hours: hoursMatch ? Number(hoursMatch[1]) + Number(hoursMatch[2] || 0) / 60 : null,
    pay: payMatch ? parseJapaneseMoneyAmount(payMatch[1]) : null,
    evidence: [hoursMatch?.[0], payMatch?.[0]].filter(Boolean).join(" / ") || null
  };
}

function extractBaseSalary(
  context: ParserContext,
  salaryText: ExtractedValue<string>
): {
  min: ExtractedValue<number>;
  max: ExtractedValue<number>;
} {
  const text = context.text;
  const fixedOvertime = extractFixedOvertimeMatch(text);

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

  const monthlyAmounts = extractMonthlyAmounts(text);

  if (salaryText.status === "found" && salaryText.source === "summary_line") {
    const summaryEvidence = salaryText.evidence ?? salaryText.value ?? "";
    if (monthlyAmounts.length > 1) {
      const monthlyMin = Math.min(...monthlyAmounts);
      const monthlyMax = Math.max(...monthlyAmounts);
      const monthlyEvidence = `月給記載: ${monthlyAmounts.map((amount) => `${amount.toLocaleString("ja-JP")}円`).join(" / ")}`;

      return {
        min: found(monthlyMin, monthlyEvidence, "summary_line", salaryText.confidence ?? "medium"),
        max: found(monthlyMax, monthlyEvidence, "summary_line", salaryText.confidence ?? "medium")
      };
    }

    const summaryAmounts = extractMoneyAmounts(summaryEvidence);
    const summaryAmount = summaryAmounts.length > 0 ? summaryAmounts[0] : null;

    if (summaryAmount != null) {
      if (fixedOvertime.pay != null) {
        return {
          min: found(summaryAmount - fixedOvertime.pay, summaryEvidence, "summary_line", salaryText.confidence ?? "medium"),
          max: unknown("summary_line", salaryText.confidence ?? "medium")
        };
      }

      return {
        min: found(summaryAmount, summaryEvidence, "summary_line", salaryText.confidence ?? "medium"),
        max: unknown("summary_line", salaryText.confidence ?? "medium")
      };
    }
  }

  if (monthlyAmounts.length > 0) {
    const monthlyMin = Math.min(...monthlyAmounts);
    const monthlyMax = Math.max(...monthlyAmounts);
    const monthlyEvidence = `月給記載: ${monthlyAmounts.map((amount) => `${amount.toLocaleString("ja-JP")}円`).join(" / ")}`;

    if (fixedOvertime.pay != null) {
      const evidence = `${monthlyEvidence} / ${fixedOvertime.evidence ?? "固定残業代"} / 基本給記載なしのため月給の最小値から固定残業代を差し引いて算出`;
      return {
        min: found(monthlyMin - fixedOvertime.pay, evidence),
        max: monthlyAmounts.length === 1 ? found(monthlyMin - fixedOvertime.pay, evidence) : unknown()
      };
    }

    return {
      min: found(monthlyMin, monthlyEvidence),
      max: monthlyAmounts.length === 1 ? unknown() : found(monthlyMax, monthlyEvidence)
    };
  }

  return {
    min: unknown(),
    max: unknown()
  };
}

function extractFixedOvertimeHours(text: string): ExtractedValue<number> {
  const fixedOvertime = extractFixedOvertimeMatch(text);
  if (fixedOvertime.none && fixedOvertime.evidence) return none(fixedOvertime.evidence);
  if (fixedOvertime.hours == null || !fixedOvertime.evidence) return unknown();
  return found(fixedOvertime.hours, fixedOvertime.evidence);
}

function extractFixedOvertimePay(text: string): ExtractedValue<number> {
  const fixedOvertime = extractFixedOvertimeMatch(text);
  if (fixedOvertime.none && fixedOvertime.evidence) return none(fixedOvertime.evidence);
  if (fixedOvertime.pay == null || !fixedOvertime.evidence) return unknown();
  return found(fixedOvertime.pay, fixedOvertime.evidence);
}

function extractAnnualHolidays(context: ParserContext): ExtractedValue<number> {
  const normalizedText = normalizeAsciiDigits(context.text);
  const match = captureByRegex(normalizedText, [
    /年間休日[:：]?\s*([0-9]{2,3})\s*[〜~\-]\s*([0-9]{2,3})日/,
    /年間休日[:：]?\s*([0-9]{2,3})日(?:以上)?/,
    /年間休日[^\n]{0,20}?([0-9]{2,3})日(?:以上)?/
  ]);
  if (match) return found(Number(match[1]), match[0], "direct_label", "high");

  const holidaySection = getSectionValue(context.sections, ["休日・休暇", "休日休暇", "休日"]);
  const holidayMatch = holidaySection ? captureByRegex(normalizeAsciiDigits(holidaySection), [/年間休日[^\n]{0,20}?([0-9]{2,3})日(?:以上)?/]) : null;
  if (holidayMatch) return found(Number(holidayMatch[1]), holidayMatch[0], "section", "high");

  const monthlyDaysOffMatch = holidaySection
    ? captureByRegex(normalizeAsciiDigits(holidaySection), [/([0-9]{1,2})\s*[〜～~\-]\s*([0-9]{1,2})日休み\s*[／/]\s*1ヵ月/, /月\s*([0-9]{1,2})\s*[〜～~\-]\s*([0-9]{1,2})日休み/])
    : null;
  if (!monthlyDaysOffMatch) return unknown();

  return found(Number(monthlyDaysOffMatch[1]) * 12, monthlyDaysOffMatch[0], "section", "medium");
}

function extractHolidayType(context: ParserContext): ExtractedValue<"完全週休2日制" | "週休2日制"> {
  const holidaySection = getSectionValue(context.sections, ["休日・休暇", "休日休暇", "休日"]);
  const sectionText = holidaySection ?? context.text;

  const exact = /完全週休2日制/.exec(sectionText);
  if (exact) return found("完全週休2日制", exact[0], holidaySection ? "section" : "global_scan", holidaySection ? "high" : "medium");

  const compressedExact = /完全土日祝休み|土日祝休み/.exec(sectionText);
  if (compressedExact) {
    return found("完全週休2日制", compressedExact[0], holidaySection ? "section" : "global_scan", holidaySection ? "high" : "medium");
  }

  const weekly = /週休2日制/.exec(sectionText);
  if (weekly) return found("週休2日制", weekly[0], holidaySection ? "section" : "global_scan", holidaySection ? "high" : "medium");

  if (/シフト制|会社カレンダー/.test(sectionText)) {
    const vague = /シフト制|会社カレンダー/.exec(sectionText);
    return { status: "unknown", value: null, evidence: vague?.[0] ?? null, source: holidaySection ? "section" : "global_scan", confidence: "low" };
  }

  return unknown();
}

function extractBonusCount(context: ParserContext): ExtractedValue<number> {
  const noneMatch = /賞与\s*(?:なし|無|無し|支給なし)/.exec(context.text);
  if (noneMatch) return none(noneMatch[0], "global_scan", "high");

  const exactMatch = captureByRegex(context.text, [
    /賞与[^\n]{0,20}?年\s*([0-9０-９])\s*回/,
    /賞与[^\n]{0,20}?([0-9０-９])回/,
    /年\s*([0-9０-９])\s*回[^\n]{0,12}?賞与/,
    /([0-9０-９])回[^\n]{0,12}?賞与/
  ]);
  if (exactMatch) return found(Number(normalizeAsciiDigits(exactMatch[1])), exactMatch[0], "global_scan", "high");

  const bonusSection = getSectionValue(context.sections, ["昇給・賞与", "賞与・昇給"]);
  if (bonusSection) {
    if (/賞与\s*(?:なし|無|無し|支給なし)/.test(bonusSection)) {
      const sectionNone = /賞与\s*(?:なし|無|無し|支給なし)/.exec(bonusSection);
      if (sectionNone) return none(sectionNone[0], "section", "high");
    }

    const sectionCount = captureByRegex(bonusSection, [/年\s*([0-9０-９])\s*回/, /([0-9０-９])回/]);
    if (sectionCount) return found(Number(normalizeAsciiDigits(sectionCount[1])), sectionCount[0], "section", "high");
  }

  return unknown();
}

function extractBonusPerformanceLinked(text: string): ExtractedValue<boolean> {
  const linkedMatch =
    /賞与[^\n]{0,24}?(?:業績により|会社業績により|業績による|業績連動|業績次第|業績により有無を検討)|(?:業績により|会社業績により|業績による|業績連動|業績次第|業績により有無を検討)[^\n]{0,24}?賞与/.exec(
      text
    );
  if (linkedMatch) return found(true, linkedMatch[0]);
  return unknown();
}

function extractHousingAllowance(text: string): ExtractedValue<boolean> {
  const noneMatch = /住宅手当\s*(?:なし|無)/.exec(text);
  if (noneMatch) return none(noneMatch[0]);

  const hasMatch = /住宅手当(?:あり|有|支給)?/.exec(text);
  if (!hasMatch) return unknown();
  return found(true, hasMatch[0]);
}

function extractCompanyHousing(text: string): ExtractedValue<boolean> {
  const noneMatch = /(社宅|借上社宅)\s*(?:なし|無)/.exec(text);
  if (noneMatch) return none(noneMatch[0]);

  const hasMatch = /(社宅|借上社宅)(?:あり|制度あり|利用可|制度)?/.exec(text);
  if (!hasMatch) return unknown();
  return found(true, hasMatch[0]);
}

function extractRetirementAllowance(text: string): ExtractedValue<boolean> {
  const noneMatch = /退職金(?:制度)?\s*(?:なし|無|無し)/.exec(text);
  if (noneMatch) return none(noneMatch[0]);

  const hasMatch = /退職金(?:制度)?(?:あり|有|支給|制度あり|共済加入)/.exec(text);
  if (!hasMatch) return unknown();
  return found(true, hasMatch[0]);
}

const benefitKeywords = [
  "社会保険完備",
  "交通費（全額支給）",
  "交通費支給",
  "交通費",
  "通勤手当",
  "残業手当",
  "資格取得補助手当",
  "資格手当",
  "引越手当",
  "退職金制度",
  "資格取得支援",
  "研修制度",
  "育休取得実績",
  "通信費補助",
  "住宅手当",
  "書籍購入補助",
  "PC支給",
  "社宅制度",
  "リモート勤務可能",
  "フルリモート可能",
  "副業可能",
  "副業制度",
  "産休・育休制度",
  "自己啓発制度",
  "メンター制度",
  "こども手当"
] as const;

const summaryBenefitKeywords = ["家賃補助有", "フレックス制度有", "家賃補助あり", "フレックス制度あり"] as const;
const proseBenefitHeadingPattern = /(福利厚生|待遇|働く環境|会社文化|社内制度|自己啓発制度|社内コミュニケーション|ご家族にもハッピーな制度)/;
const proseBenefitLinePattern = /(社会保険|交通費|通勤手当|残業手当|資格|引越|退職金|研修|育休|産休|住宅手当|書籍購入|PC|社宅|リモート|副業|フレックス|時短勤務|完全週休2日制|祝日|年末年始|手当|制度|貸与|補助|メンター|面談|こども手当|夏休み|休暇)/;
const proseBenefitBoundaryPattern = /^(なにをやっているのか|なぜやるのか|どうやっているのか|こんなことやります|このポジションの魅力|具体的な仕事内容|会社の文化|開発環境|必須要件|必須スキル|歓迎スキル|おわりに|会社の注目のストーリー|会社紹介資料|他の募集)$/;
const proseBenefitNoisePattern = /^(続きを読む|応援する|もっと見る|話を聞きに行くステップ|応募する|[0-9０-９]+人がこの募集を応援しています)$/;

function collectBenefitTokens(text: string): string[] {
  const matched = benefitKeywords.filter((keyword) => text.includes(keyword));
  return Array.from(new Set(matched));
}

function collectBenefitLinesFromProse(text: string): string[] {
  const lines = text.split("\n");
  const matches: string[] = [];
  let inBenefitBlock = false;

  for (const rawLine of lines) {
    const line = normalizeLineValue(rawLine);
    if (line.length === 0) continue;

    if (proseBenefitHeadingPattern.test(line)) {
      inBenefitBlock = true;
      continue;
    }

    if (!inBenefitBlock) continue;
    if (isSectionHeadingLine(line) || proseBenefitBoundaryPattern.test(line)) {
      inBenefitBlock = false;
      continue;
    }
    if (proseBenefitNoisePattern.test(line) || /^\[REDACTED_URL\]$/.test(line)) continue;
    if (proseBenefitLinePattern.test(line)) matches.push(line);
  }

  return Array.from(new Set(matches));
}

function extractBenefits(context: ParserContext): ExtractedValue<string[]> {
  const benefitsSection = getCombinedSectionValue(context.sections, ["福利厚生", "待遇・福利厚生", "諸手当"]);
  const sectionMatches = benefitsSection ? collectBenefitTokens(benefitsSection) : [];

  if (sectionMatches.length > 0) {
    return found(sectionMatches, sectionMatches.join(" / "), "section", "high");
  }

  const proseMatches = collectBenefitTokens(context.text);
  if (proseMatches.length > 0) {
    return found(proseMatches, proseMatches.join(" / "), "global_scan", "medium");
  }

  const proseBenefitLines = collectBenefitLinesFromProse(context.text);
  if (proseBenefitLines.length > 0) {
    return found(proseBenefitLines, proseBenefitLines.join(" / "), "global_scan", "medium");
  }

  const summaryLines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0 && !isSectionHeadingLine(line))
    .slice(0, 20);
  const summaryMatches = summaryBenefitKeywords.filter((keyword) => summaryLines.some((line) => line.includes(keyword)));

  if (summaryMatches.length > 0) {
    return found(summaryMatches, summaryMatches.join(" / "), "summary_line", "medium");
  }

  return unknown();
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
  const hasBaseSalary = /基本給[:：]?/.test(text);
  const monthlyAmounts = extractMonthlyAmounts(text);

  if (/未経験歓迎|未経験の方もご安心ください|100％IT未経験/.test(text)) matched.push("未経験強調");
  if (!hasBaseSalary && monthlyAmounts.length > 0) matched.push("基本給記載なし");
  if (/32歳以下|例外事由3号イ/.test(text)) matched.push("年齢制限");
  if (/フォロワー|総再生回数|いいね数|バズ実績|50万再生|2\.5億回|5\.6万人/.test(text)) matched.push("SNS実績誇張");
  if (/ホワイト企業認定|ベストベンチャー100|Wantedly Awards|GOLD/.test(text)) matched.push("外部評価アピール");
  if (/湘南美容外科|にしたんクリニック|美容点滴/.test(text)) matched.push("美容福利厚生");
  if (/有給消化率100％|有給消化率100%/.test(text)) matched.push("有給消化率強調");

  const deduped = [...new Set(matched)];
  if (deduped.length === 0) return none("警告キーワードなし");
  return found(deduped, deduped.join(" / "));
}

export function parseJobText(rawText: string): ParsedJob {
  const normalizedText = normalizeText(rawText);
  const context: ParserContext = {
    text: normalizedText,
    sections: buildSectionMap(normalizedText)
  };
  const salaryText = extractSalaryText(context);
  const baseSalary = extractBaseSalary(context, salaryText);

  return {
    parserVersion: PARSER_VERSION,
    companyName: extractCompanyName(context),
    title: extractTitle(context),
    employmentType: extractEmploymentType(context),
    salaryText,
    baseSalaryMin: baseSalary.min,
    baseSalaryMax: baseSalary.max,
    fixedOvertimeHours: extractFixedOvertimeHours(normalizedText),
    fixedOvertimePay: extractFixedOvertimePay(normalizedText),
    annualHolidays: extractAnnualHolidays(context),
    holidayType: extractHolidayType(context),
    bonusCount: extractBonusCount(context),
    bonusPerformanceLinked: extractBonusPerformanceLinked(normalizedText),
    housingAllowance: extractHousingAllowance(normalizedText),
    companyHousing: extractCompanyHousing(normalizedText),
    retirementAllowance: extractRetirementAllowance(normalizedText),
    benefits: extractBenefits(context),
    warnings: extractWarnings(normalizedText)
  };
}
