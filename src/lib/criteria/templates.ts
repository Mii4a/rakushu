import { and, desc, eq, getTableColumns, like, or, sql } from "drizzle-orm";

import { DEFAULT_RANK_SETTINGS, normalizeConfigurableRank, type RankSettings } from "@/lib/analysis";
import { db } from "@/lib/db/client";
import { criteriaTemplates, user } from "@/lib/db/schema";

const criteriaTemplateColumns = getTableColumns(criteriaTemplates);

function attachTemplateUser<T extends typeof criteriaTemplates.$inferSelect & { userName?: string | null }>(rows: T[]) {
  return rows.map(({ userName, ...template }) => ({
    ...template,
    user: {
      name: userName ?? "不明"
    }
  }));
}

export const CRITERIA_CATEGORIES = ["balanced", "work-life", "salary", "growth", "stability"] as const;

export type CriteriaSort = "popular" | "new" | "saves" | "uses";

export type PublicCriteriaFilters = {
  sort?: CriteriaSort;
  category?: string;
  tag?: string;
  keyword?: string;
};

export function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export function calculatePopularityScore(input: {
  viewCount: number;
  saveCount: number;
  cloneCount: number;
  useCount: number;
}) {
  return input.viewCount + input.saveCount * 5 + input.cloneCount * 8 + input.useCount * 10;
}

export function criteriaToRankSettings(template: typeof criteriaTemplates.$inferSelect): RankSettings {
  return {
    fixedOvertime: {
      aMaxHours: template.overtimeAMaxHours,
      bMaxHours: template.overtimeBMaxHours,
      cMaxHours: template.overtimeCMaxHours,
      dMaxHours: template.overtimeDMaxHours
    },
    annualHolidays: {
      sMinDays: template.holidaySMinDays,
      aMinDays: template.holidayAMinDays,
      bMinDays: template.holidayBMinDays,
      cMinDays: template.holidayCMinDays,
      dMinDays: template.holidayDMinDays
    },
    bonus: {
      sMinCount: template.bonusSMinCount,
      aMinCount: template.bonusAMinCount,
      bMinCount: template.bonusBMinCount,
      cMinCount: template.bonusCMinCount
    },
    retirementAllowance: {
      withAllowanceRank: normalizeConfigurableRank(template.retirementWithAllowanceRank, DEFAULT_RANK_SETTINGS.retirementAllowance.withAllowanceRank),
      withoutAllowanceRank: normalizeConfigurableRank(template.retirementWithoutAllowanceRank, DEFAULT_RANK_SETTINGS.retirementAllowance.withoutAllowanceRank)
    }
  };
}

export function defaultCriteriaValues() {
  return {
    overtimeAMaxHours: DEFAULT_RANK_SETTINGS.fixedOvertime.aMaxHours,
    overtimeBMaxHours: DEFAULT_RANK_SETTINGS.fixedOvertime.bMaxHours,
    overtimeCMaxHours: DEFAULT_RANK_SETTINGS.fixedOvertime.cMaxHours,
    overtimeDMaxHours: DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours,
    holidaySMinDays: DEFAULT_RANK_SETTINGS.annualHolidays.sMinDays,
    holidayAMinDays: DEFAULT_RANK_SETTINGS.annualHolidays.aMinDays,
    holidayBMinDays: DEFAULT_RANK_SETTINGS.annualHolidays.bMinDays,
    holidayCMinDays: DEFAULT_RANK_SETTINGS.annualHolidays.cMinDays,
    holidayDMinDays: DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays,
    bonusSMinCount: DEFAULT_RANK_SETTINGS.bonus.sMinCount,
    bonusAMinCount: DEFAULT_RANK_SETTINGS.bonus.aMinCount,
    bonusBMinCount: DEFAULT_RANK_SETTINGS.bonus.bMinCount,
    bonusCMinCount: DEFAULT_RANK_SETTINGS.bonus.cMinCount,
    retirementWithAllowanceRank: DEFAULT_RANK_SETTINGS.retirementAllowance.withAllowanceRank,
    retirementWithoutAllowanceRank: DEFAULT_RANK_SETTINGS.retirementAllowance.withoutAllowanceRank
  };
}

const DEFAULT_PUBLIC_CRITERIA_SOURCE_ID = "system-default-public-criteria-v1";

export async function ensureDefaultPublicCriteria(ownerUserId: string) {
  const existingDefaultRows = await db
    .select({
      ...criteriaTemplateColumns
    })
    .from(criteriaTemplates)
    .where(eq(criteriaTemplates.sourceTemplateId, DEFAULT_PUBLIC_CRITERIA_SOURCE_ID))
    .limit(1);
  const existingDefault = existingDefaultRows[0] ?? null;

  if (existingDefault) {
    return existingDefault;
  }

  const publicCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(criteriaTemplates)
    .where(eq(criteriaTemplates.visibility, "public"));

  if ((publicCount[0]?.count ?? 0) > 0) {
    return null;
  }

  const now = new Date();
  const defaultMetrics = {
    viewCount: 5612,
    saveCount: 980,
    cloneCount: 620,
    useCount: 1125
  };

  await db.insert(criteriaTemplates).values({
    id: crypto.randomUUID(),
    userId: ownerUserId,
    sourceTemplateId: DEFAULT_PUBLIC_CRITERIA_SOURCE_ID,
    title: "固定残業・休日重視の働きやすさ基準",
    description:
      "ワークライフバランスを重視したい方におすすめの基準です。長く働き続けられる環境かどうかを、固定残業時間と年間休日を主軸に、賞与制度・退職金制度・福利厚生も含めて判断します。",
    category: "work-life",
    tagsJson: JSON.stringify(["固定残業", "年間休日", "賞与制度", "退職金制度", "ワークライフバランス", "安定志向"]),
    visibility: "public",
    editable: false,
    overtimeAMaxHours: 10,
    overtimeBMaxHours: 20,
    overtimeCMaxHours: 30,
    overtimeDMaxHours: 45,
    holidaySMinDays: 125,
    holidayAMinDays: 115,
    holidayBMinDays: 105,
    holidayCMinDays: 95,
    holidayDMinDays: 95,
    bonusSMinCount: DEFAULT_RANK_SETTINGS.bonus.sMinCount,
    bonusAMinCount: DEFAULT_RANK_SETTINGS.bonus.aMinCount,
    bonusBMinCount: DEFAULT_RANK_SETTINGS.bonus.bMinCount,
    bonusCMinCount: DEFAULT_RANK_SETTINGS.bonus.cMinCount,
    retirementWithAllowanceRank: DEFAULT_RANK_SETTINGS.retirementAllowance.withAllowanceRank,
    retirementWithoutAllowanceRank: DEFAULT_RANK_SETTINGS.retirementAllowance.withoutAllowanceRank,
    ...defaultMetrics,
    popularityScore: calculatePopularityScore(defaultMetrics),
    publishedAt: now,
    createdAt: now,
    updatedAt: now
  });

  const createdRows = await db
    .select({
      ...criteriaTemplateColumns
    })
    .from(criteriaTemplates)
    .where(eq(criteriaTemplates.sourceTemplateId, DEFAULT_PUBLIC_CRITERIA_SOURCE_ID))
    .limit(1);
  return createdRows[0] ?? null;
}

export async function listPublicCriteria(filters: PublicCriteriaFilters = {}) {
  const where = [
    eq(criteriaTemplates.visibility, "public"),
    filters.category ? eq(criteriaTemplates.category, filters.category) : undefined,
    filters.tag ? like(criteriaTemplates.tagsJson, `%"${filters.tag}"%`) : undefined,
    filters.keyword
      ? or(
          like(criteriaTemplates.title, `%${filters.keyword}%`),
          like(criteriaTemplates.description, `%${filters.keyword}%`),
          like(criteriaTemplates.tagsJson, `%${filters.keyword}%`)
        )
      : undefined
  ].filter(Boolean);

  const orderBy =
    filters.sort === "new"
      ? desc(criteriaTemplates.publishedAt)
      : filters.sort === "saves"
        ? desc(criteriaTemplates.saveCount)
        : filters.sort === "uses"
          ? desc(criteriaTemplates.useCount)
          : desc(criteriaTemplates.popularityScore);

  const rows = await db
    .select({
      ...criteriaTemplateColumns,
      userName: user.name
    })
    .from(criteriaTemplates)
    .leftJoin(user, eq(criteriaTemplates.userId, user.id))
    .where(and(...where))
    .orderBy(orderBy, desc(criteriaTemplates.createdAt));

  return attachTemplateUser(rows);
}

export async function getPublicCriteria(id: string) {
  const rows = await db
    .select({
      ...criteriaTemplateColumns,
      userName: user.name
    })
    .from(criteriaTemplates)
    .leftJoin(user, eq(criteriaTemplates.userId, user.id))
    .where(and(eq(criteriaTemplates.id, id), eq(criteriaTemplates.visibility, "public")))
    .limit(1);

  return attachTemplateUser(rows)[0] ?? null;
}

export async function countOwnedCriteria(userId: string) {
  const result = await db.select({ count: sql<number>`count(*)` }).from(criteriaTemplates).where(eq(criteriaTemplates.userId, userId));
  return result[0]?.count ?? 0;
}

export async function incrementCriteriaMetric(
  template: typeof criteriaTemplates.$inferSelect,
  metric: "viewCount" | "saveCount" | "cloneCount" | "useCount"
) {
  const next = {
    viewCount: template.viewCount + (metric === "viewCount" ? 1 : 0),
    saveCount: template.saveCount + (metric === "saveCount" ? 1 : 0),
    cloneCount: template.cloneCount + (metric === "cloneCount" ? 1 : 0),
    useCount: template.useCount + (metric === "useCount" ? 1 : 0)
  };

  await db
    .update(criteriaTemplates)
    .set({
      ...next,
      popularityScore: calculatePopularityScore(next),
      updatedAt: new Date()
    })
    .where(eq(criteriaTemplates.id, template.id));
}
