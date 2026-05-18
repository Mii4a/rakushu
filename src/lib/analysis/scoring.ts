import type { ParsedJob, Rank, ScoredJob } from "@/lib/analysis/types";
import { DEFAULT_RANK_SETTINGS, type RankSettings } from "./rank-settings";

function rankFixedOvertime(parsed: ParsedJob, settings: RankSettings): Rank {
  if (parsed.fixedOvertimeHours.status === "none") return "S";
  if (parsed.fixedOvertimeHours.status !== "found" || parsed.fixedOvertimeHours.value == null) return "UNKNOWN";

  const hours = parsed.fixedOvertimeHours.value;
  if (hours <= settings.fixedOvertime.aMaxHours) return "A";
  if (hours <= settings.fixedOvertime.bMaxHours) return "B";
  if (hours <= settings.fixedOvertime.cMaxHours) return "C";
  if (hours <= settings.fixedOvertime.dMaxHours) return "D";
  return "E";
}

function rankHolidays(parsed: ParsedJob, settings: RankSettings): Rank {
  if (parsed.annualHolidays.status !== "found" || parsed.annualHolidays.value == null) return "UNKNOWN";

  const days = parsed.annualHolidays.value;
  if (days >= settings.annualHolidays.sMinDays) return "S";
  if (days >= settings.annualHolidays.aMinDays) return "A";
  if (days >= settings.annualHolidays.bMinDays) return "B";
  if (days >= settings.annualHolidays.cMinDays) return "C";
  if (days >= settings.annualHolidays.dMinDays) return "D";
  return "E";
}

function rankHolidayType(parsed: ParsedJob): Rank {
  if (parsed.holidayType.status === "found" && parsed.holidayType.value === "完全週休2日制") {
    return "A";
  }
  if (parsed.holidayType.status === "found" && parsed.holidayType.value === "週休2日制") {
    return "C";
  }
  return "UNKNOWN";
}

function rankBonus(parsed: ParsedJob, settings: RankSettings): Rank {
  const isPerformanceLinked = parsed.bonusPerformanceLinked?.status === "found" && parsed.bonusPerformanceLinked.value === true;

  if (parsed.bonusCount?.status === "found" && parsed.bonusCount.value != null) {
    const baseRank =
      parsed.bonusCount.value >= settings.bonus.sMinCount
        ? "S"
        : parsed.bonusCount.value >= settings.bonus.aMinCount
          ? "A"
          : parsed.bonusCount.value >= settings.bonus.bMinCount
            ? "B"
            : parsed.bonusCount.value >= settings.bonus.cMinCount
              ? "C"
              : "UNKNOWN";

    return isPerformanceLinked ? downgradeRank(baseRank, 1) : baseRank;
  }
  if (parsed.bonusCount?.status === "none") {
    return "D";
  }
  return "UNKNOWN";
}

function rankRetirementAllowance(parsed: ParsedJob, settings: RankSettings): Rank {
  if (parsed.retirementAllowance?.status === "found" && parsed.retirementAllowance.value === true) {
    return settings.retirementAllowance.withAllowanceRank;
  }
  if (parsed.retirementAllowance?.status === "none") {
    return settings.retirementAllowance.withoutAllowanceRank;
  }
  return "UNKNOWN";
}

function rankBenefits(parsed: ParsedJob): Rank {
  const benefits = parsed.benefits.value ?? [];
  const housingAllowancePoint = parsed.housingAllowance.status === "found" && parsed.housingAllowance.value === true ? 1 : 0;
  const companyHousingPoint = parsed.companyHousing.status === "found" && parsed.companyHousing.value === true ? 1 : 0;
  const retirementAllowancePoint = parsed.retirementAllowance?.status === "found" && parsed.retirementAllowance.value === true ? 1 : 0;
  const score = benefits.length + housingAllowancePoint + companyHousingPoint + retirementAllowancePoint;

  if (score >= 6) return "S";
  if (score >= 5) return "A";
  if (score >= 4) return "B";
  if (score >= 3) return "C";
  if (score >= 1) return "D";
  return "UNKNOWN";
}

function averageRank(ranks: Rank[]): Rank {
  const weight: Record<Exclude<Rank, "UNKNOWN">, number> = {
    S: 6,
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    E: 1
  };

  const valid = ranks.filter((r): r is Exclude<Rank, "UNKNOWN"> => r !== "UNKNOWN");
  if (valid.length === 0) return "UNKNOWN";

  const avg = valid.reduce((sum, rank) => sum + weight[rank], 0) / valid.length;
  if (avg >= 5.5) return "S";
  if (avg >= 4.5) return "A";
  if (avg >= 3.5) return "B";
  if (avg >= 2.5) return "C";
  if (avg >= 1.5) return "D";
  return "E";
}

const skepticalPenaltyWarnings = new Set([
  "アットホーム",
  "若手活躍",
  "成長できる環境",
  "裁量が大きい",
  "やりがい",
  "風通しが良い",
  "人物重視",
  "未経験強調",
  "SNS実績誇張",
  "外部評価アピール",
  "美容福利厚生",
  "有給消化率強調"
]);

function downgradeRank(rank: Rank, steps: number): Rank {
  if (rank === "UNKNOWN") return "UNKNOWN";

  const ordered: Exclude<Rank, "UNKNOWN">[] = ["S", "A", "B", "C", "D", "E"];
  const currentIndex = ordered.indexOf(rank);
  return ordered[Math.min(currentIndex + steps, ordered.length - 1)];
}

function applyWarningPenalty(parsed: ParsedJob, totalRank: Rank): Rank {
  const warnings = parsed.warnings.value ?? [];
  const skepticalCount = warnings.filter((warning) => skepticalPenaltyWarnings.has(warning)).length;

  if (skepticalCount >= 4) return downgradeRank(totalRank, 2);
  if (skepticalCount >= 2) return downgradeRank(totalRank, 1);
  return totalRank;
}

export function scoreParsedJob(parsed: ParsedJob, settings: RankSettings = DEFAULT_RANK_SETTINGS): ScoredJob {
  const fixedOvertimeRank = rankFixedOvertime(parsed, settings);
  const holidayRank = rankHolidays(parsed, settings);
  const holidayTypeRank = rankHolidayType(parsed);
  const bonusRank = rankBonus(parsed, settings);
  const retirementAllowanceRank = rankRetirementAllowance(parsed, settings);
  const benefitRank = rankBenefits(parsed);
  const baseTotalRank = averageRank([fixedOvertimeRank, holidayRank, holidayTypeRank, bonusRank, retirementAllowanceRank, benefitRank]);

  return {
    fixedOvertimeRank,
    holidayRank,
    holidayTypeRank,
    bonusRank,
    retirementAllowanceRank,
    benefitRank,
    totalRank: applyWarningPenalty(parsed, baseTotalRank)
  };
}
