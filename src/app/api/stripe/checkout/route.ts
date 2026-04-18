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

    if (!serverEnv.STRIPE_PRICE_PRO) {
      return NextResponse.json({ error: "STRIPE_PRICE_PRO が未設定です" }, { status: 500 });
    }

    const stripe = getStripeServerClient();

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id)
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/pricing?checkout=success`,
      cancel_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancel`,
      line_items: [{ price: serverEnv.STRIPE_PRICE_PRO, quantity: 1 }],
      customer: sub?.stripeCustomerId ?? undefined,
      customer_email: sub?.stripeCustomerId ? undefined : user.email,
      metadata: {
        userId: user.id
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Checkout作成に失敗しました" }, { status: 500 });
  }
}
