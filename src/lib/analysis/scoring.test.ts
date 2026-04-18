import { describe, expect, it } from "vitest";

import { parseJobText } from "./parser";
import { scoreParsedJob } from "./scoring";

describe("scoreParsedJob", () => {
  it("ranks overtime and holidays according to rules", () => {
    const parsed = parseJobText(`
固定残業代 10時間分 20,000円
年間休日: 130日
完全週休2日制
`);

    const scored = scoreParsedJob(parsed);

    expect(scored.fixedOvertimeRank).toBe("A");
    expect(scored.holidayRank).toBe("S");
    expect(scored.benefitRank).toBe("A");
  });

  it("returns UNKNOWN when values are missing", () => {
    const parsed = parseJobText("福利厚生のみ記載");
    const scored = scoreParsedJob(parsed);

    expect(scored.holidayRank).toBe("UNKNOWN");
  });
});
