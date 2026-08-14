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

type DefaultCriteriaValues = Partial<{
  overtimeAMaxHours: number;
  overtimeBMaxHours: number;
  overtimeCMaxHours: number;
  overtimeDMaxHours: number;
  holidaySMinDays: number;
  holidayAMinDays: number;
  holidayBMinDays: number;
  holidayCMinDays: number;
  holidayDMinDays: number;
  bonusSMinCount: number;
  bonusAMinCount: number;
  bonusBMinCount: number;
  bonusCMinCount: number;
  retirementWithAllowanceRank: string;
  retirementWithoutAllowanceRank: string;
}>;

type DefaultPublicCriteriaDefinition = {
  sourceTemplateId: string;
  title: string;
  description: string;
  category: (typeof CRITERIA_CATEGORIES)[number];
  tags: string[];
  metrics: {
    viewCount: number;
    saveCount: number;
    cloneCount: number;
    useCount: number;
  };
  values: DefaultCriteriaValues;
};

const DEFAULT_PUBLIC_CRITERIA_DEFINITIONS: DefaultPublicCriteriaDefinition[] = [
  {
    sourceTemplateId: "system-default-public-criteria-v1",
    title: "固定残業・休日重視の働きやすさ基準",
    description:
      "ワークライフバランスを重視したい方におすすめの基準です。長く働き続けられる環境かどうかを、固定残業時間と年間休日を主軸に、賞与制度・退職金制度・福利厚生も含めて判断します。",
    category: "work-life",
    tags: ["固定残業", "年間休日", "賞与制度", "退職金制度", "ワークライフバランス", "安定志向"],
    metrics: { viewCount: 5612, saveCount: 980, cloneCount: 620, useCount: 1125 },
    values: { overtimeAMaxHours: 10, overtimeBMaxHours: 20, overtimeCMaxHours: 30, overtimeDMaxHours: 45, holidaySMinDays: 125, holidayAMinDays: 115, holidayBMinDays: 105, holidayCMinDays: 95, holidayDMinDays: 95 }
  },
  {
    sourceTemplateId: "system-default-public-criteria-salary-v1",
    title: "給与と賞与を見落とさない収入安定基準",
    description: "初任給だけでなく、賞与回数・退職金・住宅補助まで含めて、学生が生活の見通しを立てやすい求人かを確認します。",
    category: "salary",
    tags: ["年収", "賞与制度", "退職金制度", "住宅補助", "生活安定"],
    metrics: { viewCount: 4840, saveCount: 760, cloneCount: 508, useCount: 980 },
    values: { overtimeAMaxHours: 15, overtimeBMaxHours: 25, overtimeCMaxHours: 35, overtimeDMaxHours: 45, holidaySMinDays: 120, holidayAMinDays: 110, holidayBMinDays: 105, holidayCMinDays: 95, holidayDMinDays: 85, bonusSMinCount: 3, bonusAMinCount: 2, bonusBMinCount: 2, bonusCMinCount: 1, retirementWithAllowanceRank: "A", retirementWithoutAllowanceRank: "D" }
  },
  {
    sourceTemplateId: "system-default-public-criteria-growth-v1",
    title: "成長環境と安心感を両立する若手育成基準",
    description: "研修・裁量・職種一致を重視しつつ、固定残業や休日制度も最低ラインとして確認する、成長志向の学生向け基準です。",
    category: "growth",
    tags: ["若手育成", "研修", "職種一致", "裁量", "成長企業"],
    metrics: { viewCount: 4290, saveCount: 690, cloneCount: 480, useCount: 910 },
    values: { overtimeAMaxHours: 20, overtimeBMaxHours: 30, overtimeCMaxHours: 40, overtimeDMaxHours: 45, holidaySMinDays: 120, holidayAMinDays: 110, holidayBMinDays: 105, holidayCMinDays: 95, holidayDMinDays: 85 }
  },
  {
    sourceTemplateId: "system-default-public-criteria-stability-v1",
    title: "長く働けるかを先に見る安定志向基準",
    description: "雇用形態・退職金・福利厚生・休日制度の未記載を厳しめに扱い、不安を残したまま応募しないための基準です。",
    category: "stability",
    tags: ["雇用形態", "福利厚生", "退職金制度", "休日制度", "未記載チェック"],
    metrics: { viewCount: 3980, saveCount: 650, cloneCount: 410, useCount: 840 },
    values: { overtimeAMaxHours: 10, overtimeBMaxHours: 20, overtimeCMaxHours: 30, overtimeDMaxHours: 45, holidaySMinDays: 125, holidayAMinDays: 115, holidayBMinDays: 110, holidayCMinDays: 100, holidayDMinDays: 90, retirementWithAllowanceRank: "S", retirementWithoutAllowanceRank: "D" }
  },
  {
    sourceTemplateId: "system-default-public-criteria-balanced-v1",
    title: "迷ったら最初に使う総合バランス基準",
    description: "給与・休日・固定残業・福利厚生を偏りなく見て、まず応募候補に残すかを判断するための標準的なチェック基準です。",
    category: "balanced",
    tags: ["標準", "総合判断", "給与", "休日", "福利厚生"],
    metrics: { viewCount: 5200, saveCount: 910, cloneCount: 570, useCount: 1030 },
    values: {}
  }
];

export async function ensureDefaultPublicCriteria(ownerUserId: string) {
  const now = new Date();
  const createdRows = [];

  for (const definition of DEFAULT_PUBLIC_CRITERIA_DEFINITIONS) {
    const existingRows = await db
      .select({
        ...criteriaTemplateColumns
      })
      .from(criteriaTemplates)
      .where(eq(criteriaTemplates.sourceTemplateId, definition.sourceTemplateId))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (existing) {
      createdRows.push(existing);
      continue;
    }

    const metrics = definition.metrics;
    const values = definition.values;
    await db.insert(criteriaTemplates).values({
      id: crypto.randomUUID(),
      userId: ownerUserId,
      sourceTemplateId: definition.sourceTemplateId,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      tagsJson: JSON.stringify(definition.tags),
      visibility: "public",
      editable: false,
      overtimeAMaxHours: values.overtimeAMaxHours ?? DEFAULT_RANK_SETTINGS.fixedOvertime.aMaxHours,
      overtimeBMaxHours: values.overtimeBMaxHours ?? DEFAULT_RANK_SETTINGS.fixedOvertime.bMaxHours,
      overtimeCMaxHours: values.overtimeCMaxHours ?? DEFAULT_RANK_SETTINGS.fixedOvertime.cMaxHours,
      overtimeDMaxHours: values.overtimeDMaxHours ?? DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours,
      holidaySMinDays: values.holidaySMinDays ?? DEFAULT_RANK_SETTINGS.annualHolidays.sMinDays,
      holidayAMinDays: values.holidayAMinDays ?? DEFAULT_RANK_SETTINGS.annualHolidays.aMinDays,
      holidayBMinDays: values.holidayBMinDays ?? DEFAULT_RANK_SETTINGS.annualHolidays.bMinDays,
      holidayCMinDays: values.holidayCMinDays ?? DEFAULT_RANK_SETTINGS.annualHolidays.cMinDays,
      holidayDMinDays: values.holidayDMinDays ?? DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays,
      bonusSMinCount: values.bonusSMinCount ?? DEFAULT_RANK_SETTINGS.bonus.sMinCount,
      bonusAMinCount: values.bonusAMinCount ?? DEFAULT_RANK_SETTINGS.bonus.aMinCount,
      bonusBMinCount: values.bonusBMinCount ?? DEFAULT_RANK_SETTINGS.bonus.bMinCount,
      bonusCMinCount: values.bonusCMinCount ?? DEFAULT_RANK_SETTINGS.bonus.cMinCount,
      retirementWithAllowanceRank: values.retirementWithAllowanceRank ?? DEFAULT_RANK_SETTINGS.retirementAllowance.withAllowanceRank,
      retirementWithoutAllowanceRank: values.retirementWithoutAllowanceRank ?? DEFAULT_RANK_SETTINGS.retirementAllowance.withoutAllowanceRank,
      ...metrics,
      popularityScore: calculatePopularityScore(metrics),
      publishedAt: now,
      createdAt: now,
      updatedAt: now
    });

    const insertedRows = await db
      .select({
        ...criteriaTemplateColumns
      })
      .from(criteriaTemplates)
      .where(eq(criteriaTemplates.sourceTemplateId, definition.sourceTemplateId))
      .limit(1);
    if (insertedRows[0]) createdRows.push(insertedRows[0]);
  }

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
