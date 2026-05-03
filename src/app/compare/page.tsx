import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  await requireUser();
  redirect("/jobs");
}
