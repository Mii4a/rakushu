import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export async function requireUser() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session.user;
}
