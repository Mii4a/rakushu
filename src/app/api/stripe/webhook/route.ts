import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import type { PaidPlan } from "@/lib/plans";
import { getStripeServerClient } from "@/lib/stripe/server";
import { hasProcessedStripeEvent, markStripeEventProcessed } from "@/lib/stripe/webhook-events";
import {
  findUserIdByStripeCustomerId,
  getSubscriptionByStripeCustomerId,
  getSubscriptionByStripeSubscriptionId,
  setSubscriptionCanceled,
  upsertSubscriptionFromStripe
} from "@/lib/subscription";

function getHeader(headers: Headers, key: string): string {
  const value = headers.get(key);
  if (!value) {
    throw new Error(`${key} header is missing`);
  }
  return value;
}

function normalizePaidPlan(raw: string | undefined): PaidPlan {
  if (raw === "pro") return "pro";
  if (raw === "plus") return "plus";
  return "starter";
}

function resolvePlanFromPriceId(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === serverEnv.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === serverEnv.STRIPE_PRICE_PLUS) return "plus";
  if (priceId === serverEnv.STRIPE_PRICE_PRO) return "pro";
  return null;
}

function resolvePlanFromMetadata(raw: string | undefined): PaidPlan | null {
  if (raw === "starter" || raw === "plus" || raw === "pro") {
    return raw;
  }
  return null;
}

async function resolveSubscriptionPlan(subscription: Stripe.Subscription): Promise<PaidPlan | null> {
  const fromMetadata = resolvePlanFromMetadata(subscription.metadata.plan);
  if (fromMetadata) {
    return fromMetadata;
  }

  const primaryPriceId = subscription.items.data[0]?.price?.id;
  const fromPrice = resolvePlanFromPriceId(primaryPriceId);
  if (fromPrice) {
    return fromPrice;
  }

  const bySubscriptionId = await getSubscriptionByStripeSubscriptionId(subscription.id);
  if (bySubscriptionId?.plan === "starter" || bySubscriptionId?.plan === "plus" || bySubscriptionId?.plan === "pro") {
    return bySubscriptionId.plan;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const byCustomerId = await getSubscriptionByStripeCustomerId(customerId);
  if (byCustomerId?.plan === "starter" || byCustomerId?.plan === "plus" || byCustomerId?.plan === "pro") {
    return byCustomerId.plan;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET が未設定です" }, { status: 500 });
    }

    const stripe = getStripeServerClient();
    const signature = getHeader(request.headers, "stripe-signature");
    const rawBody = await request.text();

    const event = stripe.webhooks.constructEvent(rawBody, signature, serverEnv.STRIPE_WEBHOOK_SECRET);

    if (await hasProcessedStripeEvent(event.id)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = resolvePlanFromMetadata(session.metadata?.plan);
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && subscriptionId && customerId && plan) {
        const subscriptionRaw = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as {
          id: string;
          status: string;
          current_period_end?: number;
        };

        await upsertSubscriptionFromStripe({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionRaw.id,
          plan,
          status: subscriptionRaw.status,
          currentPeriodEnd: subscriptionRaw.current_period_end ?? null
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      const userId = subscription.metadata.userId || (await findUserIdByStripeCustomerId(customerId));
      const plan = await resolveSubscriptionPlan(subscription);
      if (userId && plan) {
        await upsertSubscriptionFromStripe({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          plan,
          status: subscription.status,
          currentPeriodEnd: (subscription as unknown as { current_period_end?: number }).current_period_end ?? null
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await setSubscriptionCanceled(subscription.id);
    }

    const didRecordEvent = await markStripeEventProcessed({ stripeEventId: event.id, eventType: event.type });

    if (!didRecordEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook処理に失敗しました" }, { status: 400 });
  }
}
