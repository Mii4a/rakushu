import { headers } from "next/headers";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { auth } from "@/lib/auth/server";

export async function getSession() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return null;
  }

  try {
    return await auth.api.getSession({
      headers: await headers()
    });
  } catch (error) {
    console.error("[auth] failed to resolve session", error);
    return null;
  }
}
