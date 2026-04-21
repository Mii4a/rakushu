import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { DEFAULT_RANK_SETTINGS, type RankSettings } from "@/lib/analysis";
import { db } from "@/lib/db/client";
import { criteriaTemplates } from "@/lib/db/schema";

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
    holidayDMinDays: DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays
  };
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

  return db.query.criteriaTemplates.findMany({
    where: and(...where),
    orderBy: [orderBy, desc(criteriaTemplates.createdAt)],
    with: {
      user: true
    }
  });
}

export async function getPublicCriteria(id: string) {
  return db.query.criteriaTemplates.findFirst({
    where: and(eq(criteriaTemplates.id, id), eq(criteriaTemplates.visibility, "public")),
    with: {
      user: true
    }
  });
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
