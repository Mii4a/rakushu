import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUserInApi } from "@/lib/auth/require-user-api";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server";
import { getStripeServerClient } from "@/lib/stripe/server";

export async function POST() {
  try {
    const user = await requireUserInApi();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = (await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1))[0];

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "Stripe顧客情報が見つかりません" }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/pricing`
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ポータルの作成に失敗しました" }, { status: 500 });
  }
}
