import { describe, expect, it } from "vitest";

import { buildSectionMap, firstNonEmptyLine, getCombinedSectionValue, getSectionValue, isSectionHeadingLine, normalizeLineValue, normalizeText } from "./section-map";

describe("section-map helpers", () => {
  it("builds sections from heading blocks and inline headings", () => {
    const text = normalizeText(`
会社名
株式会社らくしゅう

給与: 月給24万円〜28万円

福利厚生
■社会保険完備
■交通費支給
`);

    const sections = buildSectionMap(text);

    expect(getSectionValue(sections, ["会社名"])).toBe("株式会社らくしゅう");
    expect(getSectionValue(sections, ["給与"])).toBe("月給24万円〜28万円");
    expect(getCombinedSectionValue(sections, ["福利厚生"])).toBe("社会保険完備\n交通費支給");
  });

  it("treats known headings as section boundaries", () => {
    expect(isSectionHeadingLine("福利厚生")).toBe(true);
    expect(isSectionHeadingLine("福利厚生: 社会保険完備")).toBe(true);
    expect(isSectionHeadingLine("福利厚生が充実しています")).toBe(false);
  });

  it("normalizes list bullets and returns the first non-empty line", () => {
    expect(normalizeLineValue("■交通費支給")).toBe("交通費支給");
    expect(firstNonEmptyLine("\n\n■交通費支給\n資格手当")).toBe("交通費支給");
  });
});
