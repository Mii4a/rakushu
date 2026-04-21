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
    expect(scored.benefitRank).toBe("A");
  });

  it("returns UNKNOWN when values are missing", () => {
    const parsed = parseJobText("福利厚生のみ記載");
    const scored = scoreParsedJob(parsed);

    expect(scored.holidayRank).toBe("UNKNOWN");
    expect(scored.holidayTypeRank).toBe("UNKNOWN");
    expect(scored.benefitRank).toBe("UNKNOWN");
  });

  it("supports custom threshold settings", () => {
    const parsed = parseJobText(`
固定残業代 12時間分 20,000円
年間休日: 126日
完全週休2日制
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
  });

  it("downgrades total rank when skeptical warnings accumulate", () => {
    const parsed = parseJobText(`
固定残業代 10時間分 20,000円
年間休日: 130日
完全週休2日制
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
    expect(scored.benefitRank).toBe("A");
    expect(scored.totalRank).toBe("C");
  });
});
