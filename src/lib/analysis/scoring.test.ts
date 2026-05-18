import { describe, expect, it } from "vitest";

import { DEFAULT_RANK_SETTINGS } from "./rank-settings";
import { parseJobText } from "./parser";
import { scoreParsedJob } from "./scoring";

describe("scoreParsedJob", () => {
  it("ranks overtime and holidays according to rules", () => {
    const parsed = parseJobText(`
固定残業代 10時間分 20,000円
年間休日: 130日
完全週休2日制
賞与 年2回
退職金制度あり
福利厚生
社会保険完備
通勤手当
資格取得支援
研修制度
住宅手当あり
`);

    const scored = scoreParsedJob(parsed);

    expect(scored.fixedOvertimeRank).toBe("A");
    expect(scored.holidayRank).toBe("S");
    expect(scored.holidayTypeRank).toBe("A");
    expect(scored.bonusRank).toBe("A");
    expect(scored.retirementAllowanceRank).toBe("A");
    expect(scored.benefitRank).toBe("S");
  });

  it("returns UNKNOWN when values are missing", () => {
    const parsed = parseJobText("福利厚生のみ記載");
    const scored = scoreParsedJob(parsed);

    expect(scored.holidayRank).toBe("UNKNOWN");
    expect(scored.holidayTypeRank).toBe("UNKNOWN");
    expect(scored.bonusRank).toBe("UNKNOWN");
    expect(scored.retirementAllowanceRank).toBe("UNKNOWN");
    expect(scored.benefitRank).toBe("UNKNOWN");
  });

  it("supports custom threshold settings", () => {
    const parsed = parseJobText(`
固定残業代 12時間分 20,000円
年間休日: 126日
完全週休2日制
賞与 年1回
退職金制度なし
`);

    const scored = scoreParsedJob(parsed, {
      ...DEFAULT_RANK_SETTINGS,
      fixedOvertime: {
        aMaxHours: 15,
        bMaxHours: 25,
        cMaxHours: 35,
        dMaxHours: 45
      },
      annualHolidays: {
        sMinDays: 140,
        aMinDays: 130,
        bMinDays: 125,
        cMinDays: 120,
        dMinDays: 115
      }
    });

    expect(scored.fixedOvertimeRank).toBe("A");
    expect(scored.holidayRank).toBe("B");
    expect(scored.holidayTypeRank).toBe("A");
    expect(scored.bonusRank).toBe("C");
    expect(scored.retirementAllowanceRank).toBe("D");
  });

  it("downgrades total rank when skeptical warnings accumulate", () => {
    const parsed = parseJobText(`
固定残業代 10時間分 20,000円
年間休日: 130日
完全週休2日制
賞与 年2回（業績による）
退職金制度あり
福利厚生
社会保険完備
通勤手当
資格取得支援
研修制度
住宅手当あり
未経験歓迎
有給消化率100％
ベストベンチャー100
フォロワー：5.6万人
`);

    const scored = scoreParsedJob(parsed);

    expect(scored.fixedOvertimeRank).toBe("A");
    expect(scored.holidayRank).toBe("S");
    expect(scored.holidayTypeRank).toBe("A");
    expect(scored.bonusRank).toBe("B");
    expect(scored.retirementAllowanceRank).toBe("A");
    expect(scored.benefitRank).toBe("S");
    expect(scored.totalRank).toBe("C");
  });

  it("downgrades bonus rank by one step when bonus depends on performance", () => {
    const parsed = parseJobText(`
年間休日: 125日
完全週休2日制
賞与 年2回（会社業績により変動）
`);

    const scored = scoreParsedJob(parsed);

    expect(scored.bonusRank).toBe("B");
  });

  it("keeps annual one-time performance-linked bonus at a low rank", () => {
    const parsed = parseJobText(`
賞与 年１回（業績により有無を検討）
`);

    const scored = scoreParsedJob(parsed);

    expect(scored.bonusRank).toBe("D");
  });

  it("supports custom bonus and retirement settings", () => {
    const parsed = parseJobText(`
年間休日: 125日
完全週休2日制
賞与 年2回
退職金制度なし
`);

    const scored = scoreParsedJob(parsed, {
      ...DEFAULT_RANK_SETTINGS,
      bonus: {
        sMinCount: 4,
        aMinCount: 3,
        bMinCount: 2,
        cMinCount: 1
      },
      retirementAllowance: {
        withAllowanceRank: "S",
        withoutAllowanceRank: "E"
      }
    });

    expect(scored.bonusRank).toBe("B");
    expect(scored.retirementAllowanceRank).toBe("E");
  });
});
