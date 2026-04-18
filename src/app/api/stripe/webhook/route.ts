import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { getStripeServerClient } from "@/lib/stripe/server";
import { setSubscriptionCanceled, upsertSubscriptionFromStripe } from "@/lib/subscription";

function getHeader(headers: Headers, key: string): string {
  const value = headers.get(key);
  if (!value) {
    throw new Error(`${key} header is missing`);
  }
  return value;
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && subscriptionId && customerId) {
        const subscriptionRaw = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as {
          id: string;
          status: string;
          current_period_end?: number;
        };

        await upsertSubscriptionFromStripe({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionRaw.id,
          status: subscriptionRaw.status,
          currentPeriodEnd: subscriptionRaw.current_period_end ?? null
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      // NOTE: metadata.userIdが無い更新イベントを考慮し、customer検索は今後改善余地あり。
      const userId = subscription.metadata.userId;
      if (userId) {
        await upsertSubscriptionFromStripe({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: (subscription as unknown as { current_period_end?: number }).current_period_end ?? null
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await setSubscriptionCanceled(subscription.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook処理に失敗しました" }, { status: 400 });
  }
}
