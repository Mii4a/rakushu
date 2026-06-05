import fs from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildResumeWorkbookFromTemplate } from "./xlsx-template.server";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildResumeWorkbookFromTemplate", () => {
  it("reuses the template workbook layout and injects current values", () => {
    const bytes = buildResumeWorkbookFromTemplate({
      templateName: "厚労省様式",
      asOfDate: "2026年5月19日",
      fullName: "山田 太郎",
      furigana: "ヤマダ タロウ",
      gender: "男",
      birthDate: "1998年4月12日",
      ageText: "（満 28 歳）",
      postalCode: "160-0004",
      currentAddress: "東京都新宿区四谷1-6-1 コモレ四谷ビル5階",
      contactAddress: "",
      phone: "090-1234-5678",
      email: "yamada@example.com",
      educationRows: [
        ["平成28年", "4月", "東京都立新宿高等学校 入学"],
        ["平成31年", "3月", "東京都立新宿高等学校 卒業"],
        ["令和元年", "4月", "○○大学 経済学部 経済学科 入学"],
        ["令和5年", "3月", "○○大学 経済学部 経済学科 卒業"],
        ["令和5年", "4月", "株式会社○○○○ 入社（営業部 配属）"],
        ["", "", "現在に至る"],
        ["", "", ""],
      ],
      licenseRows: [
        ["令和2年", "6月", "普通自動車第一種運転免許 取得"],
        ["令和3年", "7月", "日商簿記検定試験 2級 合格"],
        ["", "", ""],
      ],
      motivation: "志望動機のサンプルです。",
      selfPr: "自己PRのサンプルです。",
      desiredConditions: "貴社の規定に従います。",
    });

    const text = new TextDecoder().decode(bytes);

    expect(text).toContain("xl/drawings/drawing1.xml");
    expect(text).toContain("xl/styles.xml");
    expect(text).toContain("履　歴　書");
    expect(text).toContain(" 電話  ");
    expect(text).toContain('<row r="5" ht="15.0" customHeight="1">');
    expect(text).toContain('<row r="16" ht="15.0" customHeight="1">');
    expect(text).toContain("山田 太郎");
    expect(text).toContain("東京都新宿区四谷1-6-1 コモレ四谷ビル5階");
    expect(text).toContain("09012345678");
    expect(text).toContain("普通自動車第一種運転免許 取得");
    expect(text).toContain("日商簿記検定試験 2級 合格");
    expect(text).toContain("2026年　　 5月　 　19日現在");
    expect(text).toContain('<c r="F2" s="3" t="inlineStr"><is><t xml:space="preserve">2026年　　 5月　 　19日現在</t></is></c>');
    expect(text).toContain('<c r="C4" s="14" t="inlineStr"><is><t xml:space="preserve">ヤマダ タロウ</t></is></c>');
    expect(text).toContain('<c r="C6" s="27" t="inlineStr"><is><t xml:space="preserve">山田 太郎</t></is></c>');
    expect(text).toContain('<c r="B9" s="30" t="inlineStr"><is><t xml:space="preserve">1998年　4月　12日生　（満 28 歳）</t></is></c>');
    expect(text).toContain('<c r="F10" s="32" t="inlineStr"><is><t xml:space="preserve">男</t></is></c>');
    expect(text).toContain('<c r="D13" s="38" t="inlineStr"><is><t xml:space="preserve">160-0004</t></is></c>');
    expect(text).toContain('<c r="B15" s="41" t="inlineStr"><is><t xml:space="preserve">東京都新宿区四谷1-6-1 コモレ四谷ビル5階</t></is></c>');
    expect(text).toContain('<c r="H11" s="35" t="inlineStr"><is><t xml:space="preserve">電話　09012345678</t></is></c>');
    expect(text).toContain('<c r="H15" s="35" t="inlineStr"><is><t xml:space="preserve">yamada@example.com</t></is></c>');
    expect(text).toContain('<c r="B26" s="60" t="inlineStr"><is><t xml:space="preserve">平成28年</t></is></c>');
    expect(text).toContain('<c r="C26" s="61" t="inlineStr"><is><t xml:space="preserve">4月</t></is></c>');
    expect(text).toContain('<c r="D26" s="62" t="inlineStr"><is><t xml:space="preserve">東京都立新宿高等学校 入学</t></is></c>');
    expect(text).toContain('<c r="K19" s="51" t="inlineStr"><is><t xml:space="preserve">令和2年</t></is></c>');
    expect(text).toContain('<c r="M19" s="53" t="inlineStr"><is><t xml:space="preserve">普通自動車第一種運転免許 取得</t></is></c>');
    expect(text).toContain('<c r="K21" s="51" t="inlineStr"><is><t xml:space="preserve">令和3年</t></is></c>');
    expect(text).toContain('<c r="M21" s="53" t="inlineStr"><is><t xml:space="preserve">日商簿記検定試験 2級 合格</t></is></c>');
    expect(text).toContain('<c r="K34" s="67" t="inlineStr"><is><t xml:space="preserve">志望動機のサンプルです。');
    expect(text).toContain('<c r="K48" s="62" t="inlineStr"><is><t xml:space="preserve">貴社の規定に従います。</t></is></c>');
  });

  it("throws a clear error when no resume template workbook exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(() =>
      buildResumeWorkbookFromTemplate({
        templateName: "厚労省様式",
        asOfDate: "2026年5月19日",
        fullName: "山田 太郎",
        furigana: "ヤマダ タロウ",
        gender: "男",
        birthDate: "1998年4月12日",
        ageText: "（満 28 歳）",
        postalCode: "160-0004",
        currentAddress: "東京都新宿区四谷1-6-1 コモレ四谷ビル5階",
        contactAddress: "",
        phone: "090-1234-5678",
        email: "yamada@example.com",
        educationRows: [],
        licenseRows: [],
        motivation: "志望動機のサンプルです。",
        selfPr: "自己PRのサンプルです。",
        desiredConditions: "貴社の規定に従います。",
      }),
    ).toThrowError(
      /Resume template workbook not found\. Checked: .*UI-mock\/resume\/resume_template\.xlsx, .*UI_samples\/resume\/resume_template\.xlsx/,
    );
  });
});
