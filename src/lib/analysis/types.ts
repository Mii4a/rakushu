export type ExtractStatus = "found" | "none" | "unknown";

export type ExtractedValue<T> = {
  status: ExtractStatus;
  value: T | null;
  evidence: string | null;
};

export type JobWarnings =
  | "アットホーム"
  | "若手活躍"
  | "成長できる環境"
  | "裁量が大きい"
  | "やりがい"
  | "風通しが良い"
  | "人物重視"
  | "基本給記載なし"
  | "未経験強調"
  | "年齢制限"
  | "SNS実績誇張"
  | "外部評価アピール"
  | "美容福利厚生"
  | "有給消化率強調";

export type ParsedJob = {
  parserVersion: string;
  companyName: ExtractedValue<string>;
  title: ExtractedValue<string>;
  employmentType: ExtractedValue<string>;
  salaryText: ExtractedValue<string>;
  baseSalaryMin: ExtractedValue<number>;
  baseSalaryMax: ExtractedValue<number>;
  fixedOvertimeHours: ExtractedValue<number>;
  fixedOvertimePay: ExtractedValue<number>;
  annualHolidays: ExtractedValue<number>;
  holidayType: ExtractedValue<"完全週休2日制" | "週休2日制">;
  bonusCount: ExtractedValue<number>;
  bonusPerformanceLinked: ExtractedValue<boolean>;
  housingAllowance: ExtractedValue<boolean>;
  companyHousing: ExtractedValue<boolean>;
  retirementAllowance: ExtractedValue<boolean>;
  benefits: ExtractedValue<string[]>;
  warnings: ExtractedValue<JobWarnings[]>;
};

export type Rank = "S" | "A" | "B" | "C" | "D" | "E" | "UNKNOWN";

export type ScoredJob = {
  fixedOvertimeRank: Rank;
  holidayRank: Rank;
  holidayTypeRank: Rank;
  bonusRank: Rank;
  retirementAllowanceRank: Rank;
  benefitRank: Rank;
  totalRank: Rank;
};
