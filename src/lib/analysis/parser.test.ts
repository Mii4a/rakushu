import { describe, expect, it } from "vitest";

import { parseJobText } from "./parser";

describe("parseJobText", () => {
  it("extracts known fields with evidence", () => {
    const raw = `
会社名: 株式会社らくしゅう
職種: Webエンジニア
雇用形態: 正社員
基本給: 250,000円〜300,000円
固定残業代 20時間分 30,000円
年間休日: 125日
完全週休2日制
住宅手当あり
社宅あり
福利厚生: 社会保険完備 / 通勤手当
アットホームで若手活躍
`;

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社らくしゅう");
    expect(parsed.companyName.evidence).toContain("会社名");
    expect(parsed.baseSalaryMin.value).toBe(250000);
    expect(parsed.baseSalaryMax.value).toBe(300000);
    expect(parsed.fixedOvertimeHours.value).toBe(20);
    expect(parsed.fixedOvertimePay.value).toBe(30000);
    expect(parsed.annualHolidays.value).toBe(125);
    expect(parsed.holidayType.value).toBe("完全週休2日制");
    expect(parsed.housingAllowance.status).toBe("found");
    expect(parsed.companyHousing.status).toBe("found");
    expect(parsed.warnings.value).toEqual(expect.arrayContaining(["アットホーム", "若手活躍"]));
  });

  it("distinguishes none and unknown", () => {
    const raw = `固定残業代なし\n雇用形態: 契約社員`;

    const parsed = parseJobText(raw);

    expect(parsed.fixedOvertimeHours.status).toBe("none");
    expect(parsed.fixedOvertimePay.status).toBe("none");
    expect(parsed.annualHolidays.status).toBe("unknown");
  });
});
