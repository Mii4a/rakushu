import type { ExtractedValue, JobWarnings, ParsedJob } from "@/lib/analysis/types";

export const PARSER_VERSION = "v1.3.2";

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sectionHeadings = [
  "会社名",
  "企業名",
  "募集職種",
  "仕事内容",
  "求める人材",
  "勤務地",
  "勤務時間",
  "休日・休暇",
  "給与",
  "試用期間",
  "受動喫煙対策",
  "昇給・賞与",
  "諸手当",
  "福利厚生",
  "教育・研修が充実",
  "温かい社風が自慢",
  "頑張りをしっかり評価",
  "応募・選考について",
  "応募方法",
  "選考プロセス",
  "連絡先"
];

function extractSection(text: string, heading: string): string | null {
  const headingPattern = `(?:^|\\n)${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n(?:${sectionHeadings.map(escapeRegExp).join("|")})\\s*\\n|$)`;
  const match = new RegExp(headingPattern).exec(text);
  if (!match) return null;

  const content = match[1].trim();
  return content.length > 0 ? content : null;
}

function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function extractCompanyName(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/会社名[:：]\s*([^\n]+)/, /企業名[:：]\s*([^\n]+)/]);
  if (match) return found(match[1].trim(), match[0]);

  const companySection = extractSection(text, "会社名");
  const companyLine = companySection ? firstNonEmptyLine(companySection) : null;
  if (companyLine) {
    return found(companyLine, `会社名\n${companyLine}`);
  }

  const enterpriseSection = extractSection(text, "企業名");
  const enterpriseLine = enterpriseSection ? firstNonEmptyLine(enterpriseSection) : null;
  if (enterpriseLine) {
    return found(enterpriseLine, `企業名\n${enterpriseLine}`);
  }

  const contactSection = extractSection(text, "連絡先");
  if (contactSection) {
    const contactCompanyLine = contactSection
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /株式会社/.test(line));

    if (contactCompanyLine) {
      const companyMatch = /([^\s　]+株式会社|株式会社[^\s　]+)/.exec(contactCompanyLine);
      if (companyMatch) return found(companyMatch[1].trim(), contactCompanyLine);
    }
  }

  return unknown();
}

function extractTitle(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/職種[:：]\s*([^\n]+)/, /募集職種[:：]\s*([^\n]+)/, /仕事内容[:：]\s*([^\n]+)/]);
  if (match) return found(match[1].trim(), match[0]);

  const section = extractSection(text, "募集職種");
  const line = section ? firstNonEmptyLine(section) : null;
  if (!line) return unknown();
  return found(line, `募集職種\n${line}`);
}

function extractEmploymentType(text: string): ExtractedValue<string> {
  const match = captureByRegex(text, [/雇用形態[:：]\s*([^\n]+)/]);
  if (!match) return unknown();
  return found(match[1].trim(), match[0]);
}

function extractSalaryText(text: string): ExtractedValue<string> {
  const directMatch = captureByRegex(text, [/給与[:：]\s*([^\n]+)/]);
  if (directMatch) return found(directMatch[1].trim(), directMatch[0]);

  const salarySection = extractSection(text, "給与");
  const line = salarySection ? firstNonEmptyLine(salarySection) : null;
  if (line) return found(line, `給与\n${line}`);

  const fallbackMatch = captureByRegex(text, [/月給[:：]?\s*([^\n]+)/, /年収[:：]?\s*([^\n]+)/]);
  if (!fallbackMatch) return unknown();
  return found(fallbackMatch[1].trim(), fallbackMatch[0]);
}

function normalizeJPY(value: string): number {
  const numeric = value.replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function extractMonthlyAmounts(text: string): number[] {
  const matches = text.matchAll(/月給[:：]?\s*([\d,]+)円/g);
  return [...matches].map((match) => normalizeJPY(match[1]));
}

function extractFixedOvertimeMatch(text: string) {
  const noneMatch = /固定残業(?:代|手当)(?:制)?(?:は)?\s*(?:なし|無|採用しておりません)/.exec(text);
  if (noneMatch) {
    return {
      none: true as const,
      hours: null,
      pay: null,
      evidence: noneMatch[0]
    };
  }

  const hoursMatch = captureByRegex(text, [/固定残業(?:代|手当)[^\n]{0,40}?([0-9]{1,2})時間(?:\s*([0-9]{1,2})分)?/]);
  const payMatch = captureByRegex(text, [/固定残業(?:代|手当)[^\n]{0,40}?([\d,]+)円/]);

  return {
    none: false as const,
    hours: hoursMatch ? Number(hoursMatch[1]) + Number(hoursMatch[2] || 0) / 60 : null,
    pay: payMatch ? normalizeJPY(payMatch[1]) : null,
    evidence: [hoursMatch?.[0], payMatch?.[0]].filter(Boolean).join(" / ") || null
  };
}

function extractBaseSalary(text: string): {
  min: ExtractedValue<number>;
  max: ExtractedValue<number>;
} {
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
  const keywords = [
    "社会保険完備",
    "交通費（全額支給）",
    "通勤手当",
    "残業手当",
    "資格取得補助手当",
    "資格手当",
    "引越手当",
    "退職金制度",
    "資格取得支援",
    "研修制度",
    "育休取得実績",
    "通信費補助"
  ];
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
