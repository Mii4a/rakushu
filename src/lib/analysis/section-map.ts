export type SectionMap = Map<string, string>;

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
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeText(rawText: string): string {
  return rawText.replace(/\r\n?/g, "\n").replace(/\u3000/g, " ");
}

export function normalizeLineValue(line: string): string {
  return line.replace(/^[■●◆◯○・※*]+/, "").trim();
}

export function isSectionHeadingLine(line: string): boolean {
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

export function buildSectionMap(text: string): SectionMap {
  const sections = new Map<string, string>();

  for (const heading of sectionHeadings) {
    const content = extractSection(text, [heading]);
    if (content && !sections.has(heading)) {
      sections.set(heading, content);
    }
  }

  return sections;
}

export function getSectionValue(sections: SectionMap, headings: string[]): string | null {
  for (const heading of headings) {
    const content = sections.get(heading);
    if (content) return content;
  }
  return null;
}

export function getCombinedSectionValue(sections: SectionMap, headings: string[]): string | null {
  const parts = headings.map((heading) => sections.get(heading)).filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join("\n") : null;
}

export function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = normalizeLineValue(line);
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}
