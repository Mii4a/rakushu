import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { usageCounters } from "@/lib/db/schema";
import { AI_CREDIT_COSTS, PLAN_LIMITS, type AiCreditFeature } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

async function getUsageCounter(userId: string, periodKey: string) {
  const rows = await db
    .select()
    .from(usageCounters)
    .where(and(eq(usageCounters.userId, userId), eq(usageCounters.monthKey, periodKey)))
    .limit(1);

  return rows[0] ?? null;
}

export function getMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getWeekKey(date = new Date()): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getAnalysisCount(userId: string, periodKey = getMonthKey()): Promise<number> {
  const record = await getUsageCounter(userId, periodKey);

  return record?.analysisCount ?? 0;
}

export async function getAiCreditsUsed(userId: string, monthKey = getMonthKey()): Promise<number> {
  const record = await getUsageCounter(userId, monthKey);

  return record?.aiCreditsUsed ?? 0;
}

export async function incrementAnalysisCount(userId: string, periodKey = getMonthKey()): Promise<void> {
  const existing = await getUsageCounter(userId, periodKey);

  const now = new Date();
  if (!existing) {
    await db.insert(usageCounters).values({
      id: crypto.randomUUID(),
      userId,
      monthKey: periodKey,
      analysisCount: 1,
      compareCount: 0,
      aiCreditsUsed: 0,
      createdAt: now,
      updatedAt: now
    });
    return;
  }

  await db
    .update(usageCounters)
    .set({
      analysisCount: existing.analysisCount + 1,
      updatedAt: now
    })
    .where(eq(usageCounters.id, existing.id));
}

export async function consumeAiCredits(userId: string, feature: AiCreditFeature, monthKey = getMonthKey()): Promise<void> {
  const plan = await getUserPlan(userId);
  const monthlyLimit = PLAN_LIMITS[plan].monthlyAiCredits;
  const cost = AI_CREDIT_COSTS[feature];
  const existing = await getUsageCounter(userId, monthKey);
  const current = existing?.aiCreditsUsed ?? 0;

  if (current + cost > monthlyLimit) {
    throw new Error(`今月のAIクレジット上限（${monthlyLimit}）に達しています。`);
  }

  const now = new Date();
  if (!existing) {
    await db.insert(usageCounters).values({
      id: crypto.randomUUID(),
      userId,
      monthKey,
      analysisCount: 0,
      compareCount: 0,
      aiCreditsUsed: cost,
      createdAt: now,
      updatedAt: now
    });
    return;
  }

  await db
    .update(usageCounters)
    .set({
      aiCreditsUsed: current + cost,
      updatedAt: now
    })
    .where(eq(usageCounters.id, existing.id));
}
