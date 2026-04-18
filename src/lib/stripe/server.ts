import Stripe from "stripe";

import { serverEnv } from "@/lib/env/server";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}
