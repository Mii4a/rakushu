import { and, eq } from "drizzle-orm";

import type { Plan } from "@/lib/plans";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
async function getSubscriptionWhere(whereClause: ReturnType<typeof eq> | ReturnType<typeof and>) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(whereClause)
    .limit(1);

  return rows[0] ?? null;
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const record = await getSubscriptionWhere(eq(subscriptions.userId, userId));

  if (!record) return "free";
  if (record.plan !== "starter" && record.plan !== "plus" && record.plan !== "pro") return "free";
  if (!ACTIVE_STATUSES.has(record.status)) return "free";

  return record.plan as Plan;
}

export async function getSubscriptionByStripeCustomerId(stripeCustomerId: string) {
  return getSubscriptionWhere(eq(subscriptions.stripeCustomerId, stripeCustomerId));
}

export async function getSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string) {
  return getSubscriptionWhere(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

export async function upsertSubscriptionFromStripe(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: Exclude<Plan, "free">;
  status: string;
  currentPeriodEnd: number | null;
}) {
  const existing = await getSubscriptionWhere(eq(subscriptions.userId, params.userId));

  const now = new Date();
  if (!existing) {
    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      plan: params.plan,
      status: params.status,
      currentPeriodEnd: params.currentPeriodEnd ? new Date(params.currentPeriodEnd * 1000) : null,
      createdAt: now,
      updatedAt: now
    });
    return;
  }

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      plan: params.plan,
      status: params.status,
      currentPeriodEnd: params.currentPeriodEnd ? new Date(params.currentPeriodEnd * 1000) : null,
      updatedAt: now
    })
    .where(eq(subscriptions.userId, params.userId));
}

export async function setSubscriptionCanceled(stripeSubscriptionId: string) {
  await db
    .update(subscriptions)
    .set({
      plan: "free",
      status: "canceled",
      updatedAt: new Date()
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

export async function findUserIdByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  const record = await getSubscriptionWhere(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  return record?.userId ?? null;
}
