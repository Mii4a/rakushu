import type { ParsedJob, Rank, ScoredJob } from "@/lib/analysis/types";

function rankFixedOvertime(parsed: ParsedJob): Rank {
  if (parsed.fixedOvertimeHours.status === "none") return "S";
  if (parsed.fixedOvertimeHours.status !== "found" || parsed.fixedOvertimeHours.value == null) return "UNKNOWN";

  const hours = parsed.fixedOvertimeHours.value;
  if (hours <= 10) return "A";
  if (hours <= 20) return "B";
  if (hours <= 30) return "C";
  if (hours <= 45) return "D";
  return "E";
}

function rankHolidays(parsed: ParsedJob): Rank {
  if (parsed.annualHolidays.status !== "found" || parsed.annualHolidays.value == null) return "UNKNOWN";

  const days = parsed.annualHolidays.value;
  if (days >= 130) return "S";
  if (days >= 125) return "A";
  if (days >= 120) return "B";
  if (days >= 115) return "C";
  if (days >= 110) return "D";
  return "E";
}

function rankBenefits(parsed: ParsedJob): Rank {
  if (parsed.holidayType.status === "found" && parsed.holidayType.value === "完全週休2日制") {
    return "A";
  }
  if (parsed.holidayType.status === "found" && parsed.holidayType.value === "週休2日制") {
    return "C";
  }
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

export function scoreParsedJob(parsed: ParsedJob): ScoredJob {
  const fixedOvertimeRank = rankFixedOvertime(parsed);
  const holidayRank = rankHolidays(parsed);
  const benefitRank = rankBenefits(parsed);

  return {
    fixedOvertimeRank,
    holidayRank,
    benefitRank,
    totalRank: averageRank([fixedOvertimeRank, holidayRank, benefitRank])
  };
}
