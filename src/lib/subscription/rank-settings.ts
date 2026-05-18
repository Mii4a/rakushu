import { eq } from "drizzle-orm";

import { DEFAULT_RANK_SETTINGS, normalizeConfigurableRank, type RankSettings } from "@/lib/analysis";
import { db } from "@/lib/db/client";
import { rankSettings } from "@/lib/db/schema";
import { getUserPlan } from "@/lib/subscription";

export async function getUserRankSettings(userId: string): Promise<RankSettings> {
  const plan = await getUserPlan(userId);
  if (plan !== "plus" && plan !== "pro") {
    return DEFAULT_RANK_SETTINGS;
  }

  const record = await db.query.rankSettings.findFirst({
    where: eq(rankSettings.userId, userId)
  });

  if (!record) {
    return DEFAULT_RANK_SETTINGS;
  }

  return {
    fixedOvertime: {
      aMaxHours: record.overtimeAMaxHours,
      bMaxHours: record.overtimeBMaxHours,
      cMaxHours: record.overtimeCMaxHours,
      dMaxHours: record.overtimeDMaxHours
    },
    annualHolidays: {
      sMinDays: record.holidaySMinDays,
      aMinDays: record.holidayAMinDays,
      bMinDays: record.holidayBMinDays,
      cMinDays: record.holidayCMinDays,
      dMinDays: record.holidayDMinDays
    },
    bonus: {
      sMinCount: record.bonusSMinCount,
      aMinCount: record.bonusAMinCount,
      bMinCount: record.bonusBMinCount,
      cMinCount: record.bonusCMinCount
    },
    retirementAllowance: {
      withAllowanceRank: normalizeConfigurableRank(record.retirementWithAllowanceRank, DEFAULT_RANK_SETTINGS.retirementAllowance.withAllowanceRank),
      withoutAllowanceRank: normalizeConfigurableRank(record.retirementWithoutAllowanceRank, DEFAULT_RANK_SETTINGS.retirementAllowance.withoutAllowanceRank)
    }
  };
}
