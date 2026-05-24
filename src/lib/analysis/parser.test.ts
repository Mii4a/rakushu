import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseJobText } from "./parser";

function readFixture(name: string): string {
  return readFileSync(resolve(process.cwd(), "fixtures/jobs", name), "utf8");
}

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
賞与 年2回（会社業績により変動）
退職金制度あり
住宅手当あり
社宅あり
福利厚生: 社会保険完備 / 通勤手当
アットホームで若手活躍
`;

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社らくしゅう");
    expect(parsed.companyName.evidence).toContain("会社名");
    expect(parsed.companyName.source).toBe("direct_label");
    expect(parsed.companyName.confidence).toBe("high");
    expect(parsed.baseSalaryMin.value).toBe(250000);
    expect(parsed.baseSalaryMax.value).toBe(300000);
    expect(parsed.fixedOvertimeHours.value).toBe(20);
    expect(parsed.fixedOvertimePay.value).toBe(30000);
    expect(parsed.annualHolidays.value).toBe(125);
    expect(parsed.annualHolidays.source).toBe("direct_label");
    expect(parsed.annualHolidays.confidence).toBe("high");
    expect(parsed.holidayType.value).toBe("完全週休2日制");
    expect(parsed.holidayType.source).toBe("global_scan");
    expect(parsed.bonusCount.value).toBe(2);
    expect(parsed.bonusCount.source).toBe("global_scan");
    expect(parsed.bonusPerformanceLinked.status).toBe("found");
    expect(parsed.retirementAllowance.status).toBe("found");
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

昇給・賞与
■賞与年3回

退職金制度あり

連絡先
〒101-0044　東京都千代田区鍛冶町1-7-11 KCAビル2階
ITカンファー株式会社　採用担当
`;

    const parsed = parseJobText(raw);

    expect(parsed.title.value).toBe("インフラエンジニア");
    expect(parsed.companyName.value).toBe("ITカンファー株式会社");
    expect(parsed.salaryText.value).toBe("300～400万円");
    expect(parsed.baseSalaryMin.value).toBe(230000);
    expect(parsed.baseSalaryMax.status).toBe("unknown");
    expect(parsed.fixedOvertimeHours.status).toBe("none");
    expect(parsed.fixedOvertimePay.status).toBe("none");
    expect(parsed.annualHolidays.value).toBe(134);
    expect(parsed.annualHolidays.source).toBe("direct_label");
    expect(parsed.holidayType.value).toBe("完全週休2日制");
    expect(parsed.holidayType.source).toBe("section");
    expect(parsed.bonusCount.value).toBe(3);
    expect(parsed.bonusCount.source).toBe("global_scan");
    expect(parsed.retirementAllowance.status).toBe("found");
    expect(parsed.benefits.value).toEqual(
      expect.arrayContaining(["社会保険完備", "交通費（全額支給）", "資格手当", "引越手当", "通信費補助"])
    );
    expect(parsed.benefits.source).toBe("section");
  });

  it("extracts bonus count and lowers confidence hint when bonus is performance-linked", () => {
    const raw = `
昇給・賞与
賞与 年2回（業績による）

福利厚生
退職金制度あり
`;

    const parsed = parseJobText(raw);

    expect(parsed.bonusCount.value).toBe(2);
    expect(parsed.bonusPerformanceLinked.status).toBe("found");
    expect(parsed.retirementAllowance.status).toBe("found");
  });

  it("extracts full-width annual bonus count when payout is under review by performance", () => {
    const raw = `
昇給・賞与
賞与 年１回（業績により有無を検討）
`;

    const parsed = parseJobText(raw);

    expect(parsed.bonusCount.value).toBe(1);
    expect(parsed.bonusPerformanceLinked.status).toBe("found");
  });

  it("extracts skeptical warnings from hype-heavy sns job posts", () => {
    const raw = readFixture("sns-media-anon.txt");

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

  it("extracts company name and employment type from media summary lines without explicit labels", () => {
    const raw = readFixture("media-summary-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("エクシオ・デジタルソリューションズ株式会社");
    expect(parsed.companyName.evidence).toBe("エクシオ・デジタルソリューションズ株式会社");
    expect(parsed.companyName.source).toBe("summary_line");
    expect(parsed.companyName.confidence).toBe("medium");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.employmentType.evidence).toContain("正社員");
    expect(parsed.employmentType.source).toBe("summary_line");
    expect(parsed.employmentType.confidence).toBe("medium");
    expect(parsed.salaryText.value).toBe("25万円以上");
    expect(parsed.baseSalaryMin.value).toBe(250000);
    expect(parsed.baseSalaryMin.source).toBe("summary_line");
    expect(parsed.baseSalaryMin.confidence).toBe("medium");
    expect(parsed.annualHolidays.value).toBe(126);
    expect(parsed.annualHolidays.source).toBe("direct_label");
    expect(parsed.holidayType.value).toBe("完全週休2日制");
    expect(parsed.holidayType.source).toBe("global_scan");
    expect(parsed.benefits.value).toEqual(expect.arrayContaining(["家賃補助有", "フレックス制度有"]));
    expect(parsed.benefits.source).toBe("summary_line");
    expect(parsed.benefits.confidence).toBe("medium");
  });

  it("extracts company name from a contact line when only recruiting contact is present", () => {
    const raw = `
募集職種
クラウド運用サポート

連絡先
青葉クラウドサポート株式会社 採用担当
`;

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("青葉クラウドサポート株式会社");
    expect(parsed.companyName.evidence).toBe("青葉クラウドサポート株式会社 採用担当");
    expect(parsed.companyName.source).toBe("contact");
    expect(parsed.companyName.confidence).toBe("medium");
  });

  it("extracts salary text from summary-style fixture", () => {
    const raw = readFixture("phase1-salary-summary-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社サンプルキャリア");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.status).toBe("found");
    expect(parsed.salaryText.value).toContain("320万円〜420万円");
    expect(parsed.benefits.value).toEqual(expect.arrayContaining(["社会保険完備", "交通費支給", "資格手当"]));
  });

  it("extracts benefits from prose-heavy fixture", () => {
    const raw = readFixture("phase1-benefits-summary-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.salaryText.status).toBe("found");
    expect(parsed.salaryText.value).toContain("24万円〜28万円");
    expect(parsed.benefits.value).toEqual(expect.arrayContaining(["社会保険完備", "交通費支給", "住宅手当", "書籍購入補助"]));
    expect(parsed.housingAllowance.status).toBe("found");
  });

  it("extracts salary and benefits from mixed prose fixture", () => {
    const raw = readFixture("phase1-mixed-prose-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.status).toBe("found");
    expect(parsed.salaryText.value).toContain("300万円〜360万円");
    expect(parsed.benefits.value).toEqual(expect.arrayContaining(["社会保険完備", "PC支給", "通勤手当", "社宅制度"]));
    expect(parsed.companyHousing.status).toBe("found");
  });

  it("extracts fixed overtime and salary range from en-gage style fixture", () => {
    const raw = readFixture("phase2-en-gage-fixed-overtime-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.status).toBe("found");
    expect(parsed.salaryText.value).toContain("350万円～520万円");
    expect(parsed.fixedOvertimeHours.value).toBe(20);
    expect(parsed.fixedOvertimePay.value).toBe(38000);
    expect(parsed.annualHolidays.value).toBe(125);
    expect(parsed.holidayType.value).toBe("完全週休2日制");
    expect(parsed.benefits.value).toEqual(expect.arrayContaining(["社会保険完備", "交通費支給"]));
  });

  it("extracts holiday type from compressed en-gage workstyle lines", () => {
    const raw = readFixture("phase2-en-gage-trial-period-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toContain("250,000円 ～ 300,000円");
    expect(parsed.annualHolidays.value).toBe(120);
    expect(parsed.holidayType.value).toBe("完全週休2日制");
  });

  it("keeps list-card salary context from en-japan style fixture", () => {
    const raw = readFixture("phase2-en-japan-listcard-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toContain("28万円");
    expect(parsed.baseSalaryMin.value).toBe(267800);
    expect(parsed.baseSalaryMax.value).toBe(280000);
    expect(parsed.annualHolidays.value).toBe(120);
    expect(parsed.bonusCount.value).toBe(2);
    expect(parsed.warnings.value).toContain("基本給記載なし");
  });

  it("extracts man-plus-yen monthly ranges from kyujinbox short lines", () => {
    const raw = readFixture("phase2-kyujinbox-shortlines-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toContain("19万8,300円～23万9,700円");
    expect(parsed.baseSalaryMin.value).toBe(198300);
    expect(parsed.baseSalaryMax.value).toBe(239700);
    expect(parsed.benefits.value).toEqual(expect.arrayContaining(["社会保険完備", "交通費支給"]));
  });

  it("extracts a clean company name from doda-style platform noise", () => {
    const raw = readFixture("phase3-doda-platform-noise-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("北斗株式会社");
    expect(parsed.companyName.source).toBe("summary_line");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toContain("23万円～40万円");
    expect(parsed.annualHolidays.value).toBe(125);
  });

  it("extracts company and salary from green company-authored search cards with split top lines", () => {
    const raw = readFixture("phase3-green-company-search-card-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社ミラリンク");
    expect(parsed.companyName.evidence).toBe("株式会社 ミラリンク");
    expect(parsed.companyName.source).toBe("summary_line");
    expect(parsed.salaryText.value).toBe("600万円〜650万円");
    expect(parsed.salaryText.source).toBe("summary_line");
    expect(parsed.employmentType.status).toBe("unknown");
  });

  it("keeps top-line company and salary fallback stable on noisy green company cards", () => {
    const raw = readFixture("phase3-green-company-search-card-noisy-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社D・Ace");
    expect(parsed.companyName.evidence).toBe("株式会社 D・Ace");
    expect(parsed.companyName.source).toBe("summary_line");
    expect(parsed.salaryText.value).toBe("410万円〜800万円");
    expect(parsed.salaryText.source).toBe("summary_line");
    expect(parsed.employmentType.status).toBe("unknown");
  });

  it("extracts company, employment type, and salary from condensed green top lines", () => {
    const raw = readFixture("phase3-green-company-search-card-condensed-topline-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社ミラリンク");
    expect(parsed.companyName.source).toBe("summary_line");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.employmentType.evidence).toBe("東京都 / 正社員 / 600〜650万円");
    expect(parsed.employmentType.source).toBe("summary_line");
    expect(parsed.salaryText.value).toBe("600〜650万円");
    expect(parsed.salaryText.evidence).toBe("600〜650万円");
    expect(parsed.salaryText.source).toBe("summary_line");
  });

  it("extracts company and salary from compressed green company cards", () => {
    const raw = readFixture("phase3-green-company-card-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社ミラリンク");
    expect(parsed.companyName.evidence).toBe("株式会社 ミラリンク");
    expect(parsed.salaryText.value).toBe("600万円〜650万円");
    expect(parsed.salaryText.source).toBe("summary_line");
  });

  it("ignores green CTA noise that mentions salary-like labels without actual pay", () => {
    const raw = readFixture("phase3-green-cta-noise-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.salaryText.status).toBe("unknown");
    expect(parsed.baseSalaryMin.status).toBe("unknown");
  });

  it("extracts wantedly company fallback and avoids partner false positives", () => {
    const raw = readFixture("phase3-wantedly-other-jobs-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社FLINTERS");
    expect(["summary_line", "global_scan"]).toContain(parsed.companyName.source);
    expect(parsed.employmentType.status).toBe("unknown");
  });

  it("keeps annual salary text from structured detail pages when annual compensation leads the salary section", () => {
    const raw = readFixture("phase4-job-board-detail-annual-salary-usable-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("匿名化企業株式会社");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toBe("305万円～315万円");
    expect(parsed.salaryText.source).toBe("section");
    expect(parsed.annualHolidays.value).toBe(127);
  });

  it("keeps monthly salary text from structured detail pages when the salary section starts with split 月給 lines", () => {
    const raw = readFixture("phase4-job-board-detail-monthly-salary-usable-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("匿名レンタル株式会社");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.salaryText.value).toBe("21万7,100円 ～ 23万8,100円");
    expect(parsed.salaryText.source).toBe("section");
    expect(parsed.annualHolidays.value).toBe(128);
  });

  it("does not infer パート from partner-related green prose", () => {
    const raw = readFixture("phase3-green-partner-noise-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.status).toBe("unknown");
  });

  it("ignores 年収UP実績 prose as salary while keeping annual holidays", () => {
    const raw = readFixture("phase3-green-income-up-noise-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.salaryText.status).toBe("unknown");
    expect(parsed.baseSalaryMin.status).toBe("unknown");
    expect(parsed.annualHolidays.value).toBe(131);
  });

  it("extracts employment type and monthly-days-off annualized holidays from noisy Re就活 detail fixtures", () => {
    const raw = readFixture("phase3-rekatsu-noisy-promo-010-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("ALSOK近畿株式会社");
    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.employmentType.source).toBe("summary_line");
    expect(parsed.salaryText.value).toBe("300～400万円");
    expect(parsed.annualHolidays.value).toBe(96);
    expect(parsed.annualHolidays.evidence).toContain("8～10日休み／1ヵ月");
    expect(parsed.annualHolidays.source).toBe("section");
  });

  it("extracts company name from early branded prose in company-careers fixtures", () => {
    const raw = readFixture("phase3-company-careers-prose-company-fallback-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("freemova");
    expect(parsed.companyName.evidence).toContain("freemovaの広報活動");
    expect(parsed.companyName.source).toBe("global_scan");
    expect(parsed.salaryText.value).toBe("400～600万円");
    expect(parsed.annualHolidays.value).toBe(120);
  });

  it("extracts benefits from wantedly prose-heavy culture blocks", () => {
    const raw = readFixture("phase3-wantedly-prose-heavy-047-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("株式会社サンプルDX");
    expect(parsed.companyName.source).toBe("global_scan");
    expect(parsed.benefits.status).toBe("found");
    expect(parsed.benefits.source).toBe("global_scan");
    expect(parsed.benefits.value).toEqual(
      expect.arrayContaining([
        "リモート勤務可能",
        "副業制度",
        "産休・育休制度",
        "自己啓発制度"
      ])
    );
  });

  it("extracts benefits from wantedly prose-heavy制度 blocks", () => {
    const raw = readFixture("phase3-wantedly-prose-heavy-049-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.companyName.value).toBe("サンプルドア株式会社");
    expect(parsed.companyName.source).toBe("global_scan");
    expect(parsed.benefits.status).toBe("found");
    expect(parsed.benefits.source).toBe("global_scan");
    expect(parsed.benefits.value).toEqual(
      expect.arrayContaining([
        "フルリモート可能",
        "副業可能",
        "産休・育休制度",
        "自己啓発制度",
        "こども手当"
      ])
    );
  });

  it("extracts employment type from late wantedly prose notes without picking denied side-offers", () => {
    const raw = readFixture("phase3-wantedly-prose-heavy-046-anon.txt");

    const parsed = parseJobText(raw);

    expect(parsed.employmentType.value).toBe("正社員");
    expect(parsed.employmentType.evidence).toBe("正社員募集（フル出社）");
    expect(parsed.employmentType.source).toBe("global_scan");
    expect(parsed.employmentType.confidence).toBe("medium");
  });

  it("keeps teaser-only noisy promo fixtures unresolved instead of hallucinating hidden critical fields", () => {
    const raw043 = readFixture("phase3-rekatsu-noisy-promo-043-anon.txt");
    const raw044 = readFixture("phase3-rekatsu-noisy-promo-044-anon.txt");

    const parsed043 = parseJobText(raw043);
    const parsed044 = parseJobText(raw044);

    expect(parsed043.companyName.status).toBe("unknown");
    expect(parsed043.employmentType.status).toBe("unknown");
    expect(parsed043.salaryText.status).toBe("unknown");
    expect(parsed044.companyName.status).toBe("unknown");
    expect(parsed044.employmentType.status).toBe("unknown");
    expect(parsed044.salaryText.status).toBe("unknown");
    expect(parsed044.annualHolidays.value).toBe(131);
  });
});
