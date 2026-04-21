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

  it("extracts fields from section-based Japanese job posts", () => {
    const raw = `
募集職種
インフラエンジニア

仕事内容
スマホやPCをつなげるためのネットワークを構築・運用し、通信の安定と安全を守る仕事です。

勤務地
★転居を伴う転勤なし★　本社（東京都千代田区）及び東京都・千葉県・埼玉県の各プロジェクト先

勤務時間
10：00～19：00（実働8時間／休憩60分）

休日・休暇
■完全週休2日制（土日祝）
■年間休日134日＋有休休暇10日（初年度）

給与
初年度想定年収：300～400万円
■月給：230,000円～
【固定残業代制】 固定残業代制は採用しておりません。

諸手当
■交通費（全額支給）
■資格手当
■引越手当（当社規定により30万円支給）
■通信費補助

福利厚生
■社会保険完備

連絡先
〒101-0044　東京都千代田区鍛冶町1-7-11 KCAビル2階
ITカンファー株式会社　採用担当
`;

    const parsed = parseJobText(raw);

    expect(parsed.title.value).toBe("インフラエンジニア");
    expect(parsed.companyName.value).toBe("ITカンファー株式会社");
    expect(parsed.salaryText.value).toBe("初年度想定年収：300～400万円");
    expect(parsed.baseSalaryMin.value).toBe(230000);
    expect(parsed.baseSalaryMax.status).toBe("unknown");
    expect(parsed.fixedOvertimeHours.status).toBe("none");
    expect(parsed.fixedOvertimePay.status).toBe("none");
    expect(parsed.annualHolidays.value).toBe(134);
    expect(parsed.holidayType.value).toBe("完全週休2日制");
    expect(parsed.benefits.value).toEqual(
      expect.arrayContaining(["社会保険完備", "交通費（全額支給）", "資格手当", "引越手当", "通信費補助"])
    );
  });

  it("extracts skeptical warnings from hype-heavy sns job posts", () => {
    const raw = `
募集職種
YouTube/TikTok運用

仕事内容
【未経験歓迎】SNSを活用した広報活動・企画・編集・投稿・分析・Live配信までお任せします！

求める人材
■32歳以下の方
※［例外事由3号イ］長期勤続によるキャリア形成を図るため

休日・休暇
【年間休日120日＋有給10日付与】
☆有給消化率100％！

福利厚生
湘南美容外科クリニック提携

公式SNSも日々更新中！「freemova」で検索！
■TikTok
＃フォロワー：5.6万人以上
＃総再生回数：2.5億回／いいね数：150万
＃「2m社長」をはじめバズ実績多数！

受賞歴多数あり！
☆ホワイト企業認定取得！
☆ベストベンチャー100に選出！
☆Wantedly Awards 2024 Profile Craft部門 GOLD 受賞！
`;

    const parsed = parseJobText(raw);

    expect(parsed.title.value).toBe("YouTube/TikTok運用");
    expect(parsed.warnings.value).toEqual(
      expect.arrayContaining(["未経験強調", "年齢制限", "SNS実績誇張", "外部評価アピール", "美容福利厚生", "有給消化率強調"])
    );
  });

  it("derives base salary from monthly salary minus fixed overtime pay when base salary is not stated", () => {
    const raw = `
給与
月給：250,000円
(固定残業代18,699円含む)※固定残業代は10時間分18,699円、時間超過分は追加支給
`;

    const parsed = parseJobText(raw);

    expect(parsed.baseSalaryMin.value).toBe(231301);
    expect(parsed.baseSalaryMax.value).toBe(231301);
    expect(parsed.baseSalaryMin.evidence).toContain("基本給記載なしのため月給の最小値から固定残業代を差し引いて算出");
    expect(parsed.fixedOvertimeHours.value).toBe(10);
    expect(parsed.fixedOvertimePay.value).toBe(18699);
    expect(parsed.warnings.value).toContain("基本給記載なし");
  });

  it("extracts fixed overtime with minute precision when minutes are present", () => {
    const raw = `固定残業代は10時間30分分で20,000円を含む`;

    const parsed = parseJobText(raw);

    expect(parsed.fixedOvertimeHours.value).toBe(10.5);
    expect(parsed.fixedOvertimePay.value).toBe(20000);
  });

  it("extracts company name from section-based company heading", () => {
    const raw = `
会社名
青葉クラウドサポート株式会社

募集職種
クラウド運用サポート
`;

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("青葉クラウドサポート株式会社");
    expect(parsed.companyName.evidence).toBe("会社名\n青葉クラウドサポート株式会社");
  });

  it("uses the minimum monthly salary when multiple monthly salaries are present and base salary is not stated", () => {
    const raw = `
給与
■東京
月給：280,000円
■大阪
月給：240,000円
※固定残業代は10時間分18,000円、時間超過分は追加支給
`;

    const parsed = parseJobText(raw);

    expect(parsed.baseSalaryMin.value).toBe(222000);
    expect(parsed.baseSalaryMin.evidence).toContain("月給記載: 280,000円 / 240,000円");
    expect(parsed.baseSalaryMin.evidence).toContain("基本給記載なしのため月給の最小値から固定残業代を差し引いて算出");
    expect(parsed.warnings.value).toContain("基本給記載なし");
  });
});
