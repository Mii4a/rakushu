import { headers } from "next/headers";

import { AccountSettingsForm } from "@/components/account-settings-form";
import { auth } from "@/lib/auth/server";
import { requireUser } from "@/lib/auth/require-user";
import { getUserCommuteProfile } from "@/lib/commute";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey, getWeekKey } from "@/lib/usage/counters";

export const dynamic = "force-dynamic";

const planCopy: Record<Plan, { label: string; level: string }> = {
  free: { label: "フリープラン", level: "Lv.1" },
  starter: { label: "スタータープラン", level: "Lv.2" },
  plus: { label: "プラスプラン", level: "Lv.3" },
  pro: { label: "プロプラン", level: "Lv.4" }
};

export default async function AccountSettingsPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const sessionHeaders = await headers();
  const [accounts, plan, commuteProfile] = await Promise.all([
    auth.api.listUserAccounts({
      headers: sessionHeaders
    }),
    getUserPlan(user.id),
    getUserCommuteProfile(user.id)
  ]);
  const limits = PLAN_LIMITS[plan];
  const periodKey = limits.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const analysisCount = await getAnalysisCount(user.id, periodKey);

  return (
    <AccountSettingsForm
      key={user.name}
      name={user.name}
      email={user.email}
      image={user.image ?? null}
      planLabel={planCopy[plan].label}
      planLevel={planCopy[plan].level}
      analysisCount={analysisCount}
      analysisMax={limits.maxAnalyses}
      analysisPeriodLabel={limits.analysisPeriod === "week" ? "今週" : "今月"}
      hasCommuteProfile={Boolean(commuteProfile)}
      accounts={accounts.map((account) => ({
        id: account.id,
        providerId: account.providerId
      }))}
    />
  );
}
