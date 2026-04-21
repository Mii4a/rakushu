"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { countOwnedCriteria, defaultCriteriaValues, getPublicCriteria, incrementCriteriaMetric, parseTags } from "@/lib/criteria/templates";
import { db } from "@/lib/db/client";
import { criteriaTemplates, criteriaUsageEvents, savedCriteriaTemplates } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

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
  const existing = await db.query.savedCriteriaTemplates.findFirst({
    where: and(eq(savedCriteriaTemplates.userId, user.id), eq(savedCriteriaTemplates.templateId, template.id))
  });

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
  await db.insert(criteriaTemplates).values({
    id: crypto.randomUUID(),
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
    createdAt: now,
    updatedAt: now
  });

  await incrementCriteriaMetric(template, "cloneCount");
  revalidatePath("/criteria");
  revalidatePath(`/criteria/${template.id}`);
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
  await db.insert(criteriaTemplates).values({
    id: crypto.randomUUID(),
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
}
