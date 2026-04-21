import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUserInApi } from "@/lib/auth/require-user-api";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server";
import type { PaidPlan, Plan } from "@/lib/plans";
import { getStripeServerClient } from "@/lib/stripe/server";

function resolvePriceId(plan: PaidPlan) {
  if (plan === "starter") return serverEnv.STRIPE_PRICE_STARTER;
  if (plan === "plus") return serverEnv.STRIPE_PRICE_PLUS;
  return serverEnv.STRIPE_PRICE_PRO;
}

export async function POST(request: Request) {
  try {
    const user = await requireUserInApi();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { plan?: Plan };
    const plan = body.plan === "pro" ? "pro" : body.plan === "plus" ? "plus" : body.plan === "starter" ? "starter" : null;
    if (!plan) {
      return NextResponse.json({ error: "プラン指定が不正です" }, { status: 400 });
    }

    const priceId = resolvePriceId(plan);
    if (!priceId) {
      return NextResponse.json({ error: `Stripe price が未設定です: ${plan}` }, { status: 500 });
    }

    const stripe = getStripeServerClient();

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id)
    });

    const campaignPromotionCode = serverEnv.STRIPE_CAMPAIGN_PROMOTION_CODE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/pricing?checkout=success`,
      cancel_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancel`,
      allow_promotion_codes: campaignPromotionCode ? undefined : serverEnv.STRIPE_ALLOW_PROMOTION_CODES === "true",
      discounts: campaignPromotionCode ? [{ promotion_code: campaignPromotionCode }] : undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      customer: sub?.stripeCustomerId ?? undefined,
      customer_email: sub?.stripeCustomerId ? undefined : user.email,
      metadata: {
        userId: user.id,
        plan
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan
        }
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Checkout作成に失敗しました" }, { status: 500 });
  }
}
