"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { countOwnedCriteria, defaultCriteriaValues, getPublicCriteria, incrementCriteriaMetric, parseTags } from "@/lib/criteria/templates";
import { db } from "@/lib/db/client";
import { criteriaTemplates, criteriaUsageEvents, savedCriteriaTemplates } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

const retirementRankSchema = z.enum(["S", "A", "B", "C", "D", "E"]);

const ownedCriteriaSchema = z
  .object({
    templateId: z.string().min(1),
    title: z.string().trim().min(1, "基準名を入力してください。").max(60, "基準名は60文字以内で入力してください。"),
    description: z.string().trim().min(1, "説明を入力してください。").max(240, "説明は240文字以内で入力してください。"),
    category: z.string().trim().min(1, "カテゴリを選択してください。").max(40),
    tags: z.string().trim().max(160, "タグは160文字以内で入力してください。"),
    overtimeAMaxHours: z.coerce.number().int().min(0),
    overtimeBMaxHours: z.coerce.number().int().min(0),
    overtimeCMaxHours: z.coerce.number().int().min(0),
    overtimeDMaxHours: z.coerce.number().int().min(0),
    holidaySMinDays: z.coerce.number().int().min(0),
    holidayAMinDays: z.coerce.number().int().min(0),
    holidayBMinDays: z.coerce.number().int().min(0),
    holidayCMinDays: z.coerce.number().int().min(0),
    holidayDMinDays: z.coerce.number().int().min(0),
    bonusSMinCount: z.coerce.number().int().min(1),
    bonusAMinCount: z.coerce.number().int().min(1),
    bonusBMinCount: z.coerce.number().int().min(1),
    bonusCMinCount: z.coerce.number().int().min(1),
    retirementWithAllowanceRank: retirementRankSchema,
    retirementWithoutAllowanceRank: retirementRankSchema
  })
  .superRefine((value, ctx) => {
    if (!(value.overtimeAMaxHours < value.overtimeBMaxHours && value.overtimeBMaxHours < value.overtimeCMaxHours && value.overtimeCMaxHours < value.overtimeDMaxHours)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "固定残業の閾値は A < B < C < D になるように入力してください。"
      });
    }

    if (!(value.holidaySMinDays > value.holidayAMinDays && value.holidayAMinDays > value.holidayBMinDays && value.holidayBMinDays > value.holidayCMinDays && value.holidayCMinDays > value.holidayDMinDays)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "年間休日の閾値は S > A > B > C > D になるように入力してください。"
      });
    }

    if (!(value.bonusSMinCount > value.bonusAMinCount && value.bonusAMinCount >= value.bonusBMinCount && value.bonusBMinCount > value.bonusCMinCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "賞与回数は S > A >= B > C になるように入力してください。"
      });
    }
  });

async function requirePublicTemplate(templateId: string) {
  const template = await getPublicCriteria(templateId);
  if (!template) {
    throw new Error("公開基準が見つかりません。");
  }
  return template;
}

export async function savePublicCriteriaAction(templateId: string) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan].criteria;

  if (!limits.canSaveTemplates) {
    throw new Error("みんなの基準の保存はStarterプラン以上で利用できます。");
  }

  const template = await requirePublicTemplate(templateId);
  const existing = (await db
    .select()
    .from(savedCriteriaTemplates)
    .where(and(eq(savedCriteriaTemplates.userId, user.id), eq(savedCriteriaTemplates.templateId, template.id)))
    .limit(1))[0];

  if (!existing) {
    await db.insert(savedCriteriaTemplates).values({
      id: crypto.randomUUID(),
      userId: user.id,
      templateId: template.id,
      createdAt: new Date()
    });
    await incrementCriteriaMetric(template, "saveCount");
  }

  revalidatePath("/criteria");
  revalidatePath(`/criteria/${template.id}`);
}

export async function clonePublicCriteriaAction(templateId: string) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan].criteria;

  if (!limits.canCloneTemplates) {
    throw new Error("みんなの基準の複製はStarterプラン以上で利用できます。");
  }

  const ownedCount = await countOwnedCriteria(user.id);
  if (ownedCount >= limits.maxOwnedCriteria) {
    throw new Error(`自分の基準の保有上限（${limits.maxOwnedCriteria}件）に達しています。`);
  }

  const template = await requirePublicTemplate(templateId);
  const now = new Date();
  const clonedId = crypto.randomUUID();
  await db.insert(criteriaTemplates).values({
    id: clonedId,
    userId: user.id,
    sourceTemplateId: template.id,
    title: `${template.title} のコピー`,
    description: template.description,
    category: template.category,
    tagsJson: JSON.stringify(parseTags(template.tagsJson)),
    visibility: "private",
    editable: limits.canEditClonedTemplates,
    overtimeAMaxHours: template.overtimeAMaxHours,
    overtimeBMaxHours: template.overtimeBMaxHours,
    overtimeCMaxHours: template.overtimeCMaxHours,
    overtimeDMaxHours: template.overtimeDMaxHours,
    holidaySMinDays: template.holidaySMinDays,
    holidayAMinDays: template.holidayAMinDays,
    holidayBMinDays: template.holidayBMinDays,
    holidayCMinDays: template.holidayCMinDays,
    holidayDMinDays: template.holidayDMinDays,
    bonusSMinCount: template.bonusSMinCount,
    bonusAMinCount: template.bonusAMinCount,
    bonusBMinCount: template.bonusBMinCount,
    bonusCMinCount: template.bonusCMinCount,
    retirementWithAllowanceRank: template.retirementWithAllowanceRank,
    retirementWithoutAllowanceRank: template.retirementWithoutAllowanceRank,
    createdAt: now,
    updatedAt: now
  });

  await incrementCriteriaMetric(template, "cloneCount");
  revalidatePath("/criteria");
  revalidatePath(`/criteria/${template.id}`);
  redirect(`/criteria?owned=${clonedId}#criteria-detail`);
}

export async function recordCriteriaUseAction(templateId: string) {
  const user = await requireUser();
  const template = await requirePublicTemplate(templateId);
  const now = new Date();

  await db.insert(criteriaUsageEvents).values({
    id: crypto.randomUUID(),
    userId: user.id,
    templateId: template.id,
    eventType: "use",
    createdAt: now
  });
  await incrementCriteriaMetric(template, "useCount");

  revalidatePath("/criteria");
  revalidatePath(`/criteria/${template.id}`);
}

export async function createPrivateCriteriaAction() {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan].criteria;

  if (!limits.canCreatePrivate) {
    throw new Error("自分用基準の新規作成はPlusプラン以上で利用できます。");
  }

  const ownedCount = await countOwnedCriteria(user.id);
  if (ownedCount >= limits.maxOwnedCriteria) {
    throw new Error(`自分の基準の保有上限（${limits.maxOwnedCriteria}件）に達しています。`);
  }

  const now = new Date();
  const createdId = crypto.randomUUID();
  await db.insert(criteriaTemplates).values({
    id: createdId,
    userId: user.id,
    title: "新しい自分用基準",
    description: "非公開のカスタム基準です。",
    category: "balanced",
    tagsJson: JSON.stringify(["自分用"]),
    visibility: "private",
    editable: true,
    ...defaultCriteriaValues(),
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/criteria");
  redirect(`/criteria?owned=${createdId}#criteria-detail`);
}

export async function updateOwnedCriteriaAction(formData: FormData) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan].criteria;

  if (!limits.canEditClonedTemplates) {
    throw new Error("自分用基準の編集はPlusプラン以上で利用できます。");
  }

  const parsed = ownedCriteriaSchema.safeParse({
    templateId: formData.get("templateId"),
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags: formData.get("tags"),
    overtimeAMaxHours: formData.get("overtimeAMaxHours"),
    overtimeBMaxHours: formData.get("overtimeBMaxHours"),
    overtimeCMaxHours: formData.get("overtimeCMaxHours"),
    overtimeDMaxHours: formData.get("overtimeDMaxHours"),
    holidaySMinDays: formData.get("holidaySMinDays"),
    holidayAMinDays: formData.get("holidayAMinDays"),
    holidayBMinDays: formData.get("holidayBMinDays"),
    holidayCMinDays: formData.get("holidayCMinDays"),
    holidayDMinDays: formData.get("holidayDMinDays"),
    bonusSMinCount: formData.get("bonusSMinCount"),
    bonusAMinCount: formData.get("bonusAMinCount"),
    bonusBMinCount: formData.get("bonusBMinCount"),
    bonusCMinCount: formData.get("bonusCMinCount"),
    retirementWithAllowanceRank: formData.get("retirementWithAllowanceRank"),
    retirementWithoutAllowanceRank: formData.get("retirementWithoutAllowanceRank")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "自分用基準の入力値が不正です。");
  }

  const existing = (await db
    .select()
    .from(criteriaTemplates)
    .where(and(eq(criteriaTemplates.id, parsed.data.templateId), eq(criteriaTemplates.userId, user.id), eq(criteriaTemplates.visibility, "private")))
    .limit(1))[0];

  if (!existing) {
    throw new Error("編集対象の自分用基準が見つかりません。");
  }

  if (!existing.editable) {
    throw new Error("この基準は編集できません。");
  }

  const tags = parsed.data.tags
    .split(/[,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  await db
    .update(criteriaTemplates)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tagsJson: JSON.stringify(tags),
      overtimeAMaxHours: parsed.data.overtimeAMaxHours,
      overtimeBMaxHours: parsed.data.overtimeBMaxHours,
      overtimeCMaxHours: parsed.data.overtimeCMaxHours,
      overtimeDMaxHours: parsed.data.overtimeDMaxHours,
      holidaySMinDays: parsed.data.holidaySMinDays,
      holidayAMinDays: parsed.data.holidayAMinDays,
      holidayBMinDays: parsed.data.holidayBMinDays,
      holidayCMinDays: parsed.data.holidayCMinDays,
      holidayDMinDays: parsed.data.holidayDMinDays,
      bonusSMinCount: parsed.data.bonusSMinCount,
      bonusAMinCount: parsed.data.bonusAMinCount,
      bonusBMinCount: parsed.data.bonusBMinCount,
      bonusCMinCount: parsed.data.bonusCMinCount,
      retirementWithAllowanceRank: parsed.data.retirementWithAllowanceRank,
      retirementWithoutAllowanceRank: parsed.data.retirementWithoutAllowanceRank,
      updatedAt: new Date()
    })
    .where(eq(criteriaTemplates.id, existing.id));

  revalidatePath("/criteria");
  revalidatePath(`/criteria/${existing.id}`);
  redirect(`/criteria?owned=${existing.id}#criteria-detail`);
}
