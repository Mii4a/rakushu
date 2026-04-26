import { PLAN_LIMITS } from "@/lib/plans";
import { requireUser } from "@/lib/auth/require-user";
import { getUserPlan } from "@/lib/subscription";
import { CheckoutButton } from "@/components/checkout-button";

export default async function PricingPage() {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">料金プラン</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">無料プラン</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>求人保存: {PLAN_LIMITS.free.maxJobs}件まで</li>
            <li>解析: {PLAN_LIMITS.free.maxAnalysesPerMonth}件 / 月</li>
            <li>詳細評価: なし</li>
          </ul>
        </article>

        <article className="rounded-xl border border-rakushu-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">有料プラン (Pro)</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>求人保存: 無制限</li>
            <li>解析: {PLAN_LIMITS.pro.maxAnalysesPerMonth}件 / 月</li>
            <li>詳細評価: あり</li>
          </ul>
          <div className="mt-4">
            {plan === "pro" ? <p className="text-sm text-emerald-700">現在Proプランをご利用中です。</p> : <CheckoutButton />}
          </div>
        </article>
      </div>
    </section>
  );
}
