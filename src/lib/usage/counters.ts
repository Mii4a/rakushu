import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { usageCounters } from "@/lib/db/schema";

export function getMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getAnalysisCount(userId: string, monthKey = getMonthKey()): Promise<number> {
  const record = await db.query.usageCounters.findFirst({
    where: and(eq(usageCounters.userId, userId), eq(usageCounters.monthKey, monthKey))
  });

  return record?.analysisCount ?? 0;
}

export async function incrementAnalysisCount(userId: string, monthKey = getMonthKey()): Promise<void> {
  const existing = await db.query.usageCounters.findFirst({
    where: and(eq(usageCounters.userId, userId), eq(usageCounters.monthKey, monthKey))
  });

  const now = new Date();
  if (!existing) {
    await db.insert(usageCounters).values({
      id: crypto.randomUUID(),
      userId,
      monthKey,
      analysisCount: 1,
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
