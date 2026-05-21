import type { ExtractConfidence, ExtractedValue, ExtractSource, JobWarnings, ParsedJob } from "@/lib/analysis/types";

export const PARSER_VERSION = "v1.5.0";

type SectionMap = Map<string, string>;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sectionHeadings = [
  "会社名",
  "企業名",
  "募集職種",
  "職種",
  "仕事内容",
  "求める人材",
  "勤務地",
  "勤務時間",
  "休日・休暇",
  "休日休暇",
  "休日",
  "給与",
  "給与・報酬",
  "想定年収",
  "年収例",
  "雇用形態",
  "雇用区分",
  "契約形態",
  "試用期間",
  "受動喫煙対策",
  "昇給・賞与",
  "賞与・昇給",
  "諸手当",
  "福利厚生",
  "待遇・福利厚生",
  "教育・研修が充実",
  "温かい社風が自慢",
  "頑張りをしっかり評価",
  "応募・選考について",
  "応募方法",
  "選考プロセス",
  "連絡先"
];

function normalizeText(rawText: string): string {
  return rawText.replace(/\r\n?/g, "\n").replace(/\u3000/g, " ");
}

function normalizeLineValue(line: string): string {
  return line.replace(/^[■●◆◯○・※*]+/, "").trim();
}

function isSectionHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  return sectionHeadings.some((heading) => {
    const pattern = new RegExp(`^${escapeRegExp(heading)}(?:\\s*[:：].*)?$`);
    return pattern.test(trimmed);
  });
}

function extractSection(text: string, headings: string[]): string | null {
  const lines = text.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    const matchedHeading = headings.find((heading) => {
      const pattern = new RegExp(`^${escapeRegExp(heading)}(?:\\s*[:：](.*))?$`);
      return pattern.test(trimmed);
    });

    if (!matchedHeading) continue;

    const inlinePattern = new RegExp(`^${escapeRegExp(matchedHeading)}\\s*[:：]\\s*(.*)$`);
    const inlineMatch = inlinePattern.exec(trimmed);
    const inlineValue = normalizeLineValue(inlineMatch?.[1] ?? "");
    if (inlineValue.length > 0) return inlineValue;

    const collected: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (isSectionHeadingLine(lines[cursor])) break;
      const normalized = normalizeLineValue(lines[cursor]);
      if (normalized.length > 0) collected.push(normalized);
    }

    const content = collected.join("\n").trim();
    if (content.length > 0) return content;
  }

  return null;
}

function buildSectionMap(text: string): SectionMap {
  const sections = new Map<string, string>();

  for (const heading of sectionHeadings) {
    const content = extractSection(text, [heading]);
    if (content && !sections.has(heading)) {
      sections.set(heading, content);
    }
  }

  return sections;
}

function getSectionValue(sections: SectionMap, headings: string[]): string | null {
  for (const heading of headings) {
    const content = sections.get(heading);
    if (content) return content;
  }
  return null;
}

function getCombinedSectionValue(sections: SectionMap, headings: string[]): string | null {
  const parts = headings.map((heading) => sections.get(heading)).filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join("\n") : null;
}

function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = normalizeLineValue(line);
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function extractCompanyCandidate(line: string): string | null {
  const normalized = normalizeLineValue(line);
  const match = /((?:株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人)\S+|\S+(?:株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人))/.exec(
    normalized
  );
  return match?.[1]?.trim() ?? null;
}

function findCompanyNameFromTopLines(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0)
    .slice(0, 8);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isSectionHeadingLine(line)) continue;
    if (lines[index - 1] === "連絡先") continue;
    const company = extractCompanyCandidate(line);
    if (company) return found(company, line, "summary_line", "medium");
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

function findEmploymentTypeInLines(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0)
    .slice(0, 12);

  for (const line of lines) {
    for (const keyword of employmentTypeKeywords) {
      if (line.includes(keyword)) return found(keyword, line, "summary_line", "medium");
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

  return unknown();
}

function extractSalaryText(context: ParserContext): ExtractedValue<string> {
  const directMatch = captureByRegex(context.text, [
    /給与[:：]\s*([^\n]+)/,
    /給与・報酬[:：]\s*([^\n]+)/,
    /想定年収[:：]\s*([^\n]+)/,
    /年収例[:：]\s*([^\n]+)/
  ]);
  if (directMatch) return found(directMatch[1].trim(), directMatch[0], "direct_label", "high");

  const salarySection = getSectionValue(context.sections, ["給与", "給与・報酬", "想定年収", "年収例"]);
  const line = salarySection
    ? salarySection
        .split("\n")
        .map((rawLine) => normalizeLineValue(rawLine))
        .find((rawLine) => /(月給|年収|想定年収|時給|日給)/.test(rawLine)) ?? firstNonEmptyLine(salarySection)
    : null;
  if (line) return found(line, `給与\n${line}`, "section", "high");

  const summaryLine = context.text
    .split("\n")
    .map((rawLine) => normalizeLineValue(rawLine))
    .filter((rawLine) => rawLine.length > 0 && !isSectionHeadingLine(rawLine))
    .slice(0, 12)
    .find((rawLine) => /(月給\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円(?:以上)?|月給\s*[0-9０-９,]+円|年収\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円(?:以上)?)/.test(rawLine));
  if (summaryLine) {
    const summaryMatch = /(月給\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円(?:以上)?|月給\s*[0-9０-９,]+円|年収\s*[0-9０-９]+(?:\.[0-9０-９]+)?万円(?:以上)?)/.exec(summaryLine);
    if (summaryMatch) return found(summaryMatch[1].trim().replace(/^月給\s*/, ""), summaryMatch[1], "summary_line", "medium");
  }

  const fallbackMatch = captureByRegex(context.text, [/月給[:：]?\s*([^\n]+)/, /年収[:：]?\s*([^\n]+)/, /想定年収[:：]?\s*([^\n]+)/]);
  if (!fallbackMatch) return unknown();
  return found(fallbackMatch[1].trim(), fallbackMatch[0]);
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

  const manMatch = /^([0-9]+(?:\.[0-9]+)?)万円(?:以上)?$/.exec(normalized);
  if (manMatch) return Math.round(Number(manMatch[1]) * 10000);

  return null;
}

function extractMonthlyAmounts(text: string): number[] {
  const normalizedText = normalizeAsciiDigits(text);
  const matches = normalizedText.matchAll(/月給[:：]?\s*([0-9,]+円|[0-9]+(?:\.[0-9]+)?万円(?:以上)?)/g);
  return [...matches]
    .map((match) => parseJapaneseMoneyAmount(match[1]))
    .filter((amount): amount is number => amount != null);
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

  if (salaryText.status === "found" && salaryText.source === "summary_line") {
    const summaryEvidence = salaryText.evidence ?? salaryText.value ?? "";
    const summaryAmountMatch = /(月給[:：]?\s*)?([0-9０-９]+(?:\.[0-9０-９]+)?万円(?:以上)?|[0-9０-９,]+円)/.exec(summaryEvidence);
    const summaryAmount = summaryAmountMatch ? parseJapaneseMoneyAmount(summaryAmountMatch[2]) : null;

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
  if (!holidayMatch) return unknown();
  return found(Number(holidayMatch[1]), holidayMatch[0], "section", "high");
}

function extractHolidayType(context: ParserContext): ExtractedValue<"完全週休2日制" | "週休2日制"> {
  const holidaySection = getSectionValue(context.sections, ["休日・休暇", "休日休暇", "休日"]);
  const sectionText = holidaySection ?? context.text;

  const exact = /完全週休2日制/.exec(sectionText);
  if (exact) return found("完全週休2日制", exact[0], holidaySection ? "section" : "global_scan", holidaySection ? "high" : "medium");

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

function extractRetirementAllowance(text: string): ExtractedValue<boolean> {
  const noneMatch = /退職金(?:制度)?\s*(?:なし|無|無し)/.exec(text);
  if (noneMatch) return none(noneMatch[0]);

  const hasMatch = /退職金(?:制度)?(?:あり|有|支給|制度あり|共済加入)/.exec(text);
  if (!hasMatch) return unknown();
  return found(true, hasMatch[0]);
}

function extractBenefits(context: ParserContext): ExtractedValue<string[]> {
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
  const benefitsSection = getCombinedSectionValue(context.sections, ["福利厚生", "待遇・福利厚生", "諸手当"]);
  const matched = keywords.filter((keyword) => (benefitsSection ?? context.text).includes(keyword));

  if (matched.length > 0) {
    return found(matched, matched.join(" / "), benefitsSection ? "section" : "global_scan", benefitsSection ? "high" : "medium");
  }

  const summaryBenefitKeywords = ["家賃補助有", "フレックス制度有", "家賃補助あり", "フレックス制度あり"];
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
