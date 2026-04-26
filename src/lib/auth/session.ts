import { headers } from "next/headers";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { auth } from "@/lib/auth/server";

export async function getSession() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return null;
  }

  return auth.api.getSession({
    headers: await headers()
  });
}
