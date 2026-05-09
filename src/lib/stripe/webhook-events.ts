import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { stripeWebhookEvents } from "@/lib/db/schema";

export async function hasProcessedStripeEvent(stripeEventId: string): Promise<boolean> {
  const record = await db.query.stripeWebhookEvents.findFirst({
    where: eq(stripeWebhookEvents.stripeEventId, stripeEventId)
  });

  return Boolean(record);
}

export async function markStripeEventProcessed(params: { stripeEventId: string; eventType: string }) {
  await db.insert(stripeWebhookEvents).values({
    id: crypto.randomUUID(),
    stripeEventId: params.stripeEventId,
    eventType: params.eventType,
    processedAt: new Date(),
    createdAt: new Date()
  });
}
