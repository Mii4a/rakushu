import { eq, getTableColumns } from "drizzle-orm";

import { DEFAULT_RANK_SETTINGS, normalizeConfigurableRank, type RankSettings } from "@/lib/analysis";
import { db } from "@/lib/db/client";
import { rankSettings } from "@/lib/db/schema";
import { getUserPlan } from "@/lib/subscription";

const rankSettingsColumns = getTableColumns(rankSettings);

export async function getUserRankSettings(userId: string): Promise<RankSettings> {
  const plan = await getUserPlan(userId);
  if (plan !== "plus" && plan !== "pro") {
    return DEFAULT_RANK_SETTINGS;
  }

  const recordRows = await db
    .select({
      ...rankSettingsColumns
    })
    .from(rankSettings)
    .where(eq(rankSettings.userId, userId))
    .limit(1);
  const record = recordRows[0] ?? null;

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
