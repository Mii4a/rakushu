import Link from "next/link";
import { CreditCard, Layers3, Settings2, Sparkles } from "lucide-react";

import { updateRankSettingsAction } from "@/actions/rank-settings-actions";
import { CheckoutButton } from "@/components/checkout-button";
import { DEFAULT_RANK_SETTINGS } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { serverEnv } from "@/lib/env/server";
import { CREDIT_PACKS, DEFAULT_CAMPAIGN_DISCOUNT, PAID_PLAN_ORDER, PLAN_LIMITS, PLAN_MARKETING, type PaidPlan } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { getUserRankSettings } from "@/lib/subscription/rank-settings";

export const dynamic = "force-dynamic";

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function isCurrentOrHigher(current: string, target: PaidPlan) {
  const order = ["free", ...PAID_PLAN_ORDER];
  return order.indexOf(current) >= order.indexOf(target);
}

export default async function PricingPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const rankSettings = await getUserRankSettings(user.id);
  const canEditRankSettings = plan === "plus" || plan === "pro";
  const campaignActive = Boolean(serverEnv.STRIPE_CAMPAIGN_PROMOTION_CODE_ID);

  return (
    <section className="page-stack">
      <div className="page-hero page-hero-split">
        <div>
          <p className="eyebrow">Pricing</p>
          <h1 className="page-title">AIクレジットと基準機能で選ぶ3プラン</h1>
          <p className="page-copy mt-3">
          初期リリースの主要AI機能は `gpt-4.1-mini`、軽量補助は `gpt-4.1-nano` を設定経由で利用できる設計です。SNS告知などの期間限定半額キャンペーンは Stripe promotion code で自動適用できる構造です。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="metric-tile">
            <CreditCard className="size-5 text-rakushu-600" />
            <p className="mt-3 text-sm font-medium text-slate-900">月額サブスク</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">求人管理の量とAIクレジットをプランごとに整理しています。</p>
          </div>
          <div className="metric-tile">
            <Layers3 className="size-5 text-emerald-600" />
            <p className="mt-3 text-sm font-medium text-slate-900">基準機能</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">公開基準の閲覧、保存、編集、公開の範囲が段階的に広がります。</p>
          </div>
          <div className="metric-tile">
            <Settings2 className="size-5 text-amber-600" />
            <p className="mt-3 text-sm font-medium text-slate-900">自分用ランク設定</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Plus以上で固定残業と年間休日の閾値を自分用に調整できます。</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PAID_PLAN_ORDER.map((paidPlan) => {
          const marketing = PLAN_MARKETING[paidPlan];
          const limits = PLAN_LIMITS[paidPlan];
          const currentOrHigher = isCurrentOrHigher(plan, paidPlan);

          return (
            <article key={paidPlan} className="panel flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{marketing.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{marketing.audience}</p>
                </div>
                {paidPlan === "plus" ? <span className="soft-pill text-rakushu-700">標準</span> : null}
              </div>

              <div className="mt-5">
                {campaignActive ? (
                  <>
                    <p className="text-sm text-slate-500 line-through">通常 月額 {formatYen(marketing.priceYen)}円</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">月額 {formatYen(marketing.campaignPriceYen)}円</p>
                    <p className="mt-1 text-xs text-emerald-700">{DEFAULT_CAMPAIGN_DISCOUNT.label}: {DEFAULT_CAMPAIGN_DISCOUNT.percentOff}% OFF 適用中</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900">月額 {formatYen(marketing.priceYen)}円</p>
                    <p className="mt-1 text-xs text-slate-500">キャンペーン時は半額 {formatYen(marketing.campaignPriceYen)}円まで対応</p>
                  </>
                )}
              </div>

              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li>月間AIクレジット: {limits.monthlyAiCredits}</li>
                <li>求人保存: {Number.isFinite(limits.maxJobs) ? `${limits.maxJobs}件` : "無制限"}</li>
                <li>求人票要約: 1クレジット</li>
                <li>求人特徴抽出: 1クレジット</li>
              </ul>

              <div className="mt-5">
                <p className="text-sm font-medium text-slate-900">主用途</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {marketing.uses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-xs text-slate-600">
                <p>基準閲覧: {limits.criteria.canBrowsePublic ? "可" : "不可"}</p>
                <p>保存・複製: {limits.criteria.canCloneTemplates ? "可" : "不可"}</p>
                <p>自由編集: {limits.criteria.canEditClonedTemplates ? "可" : "不可"}</p>
                <p>公開・統計: {limits.criteria.canPublish ? "可" : "不可"}</p>
              </div>

              <div className="mt-auto pt-5">
                {plan === paidPlan ? (
                  <p className="text-sm text-emerald-700">現在このプランをご利用中です。</p>
                ) : currentOrHigher ? (
                  <p className="text-sm text-slate-600">現在は上位プランをご利用中です。</p>
                ) : (
                  <CheckoutButton plan={paidPlan} />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <article className="panel">
        <h2 className="section-title">基準機能の対応</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="metric-tile text-sm text-slate-700">
            <p className="font-medium text-slate-900">閲覧</p>
            <p className="mt-1">Starter以上で、人気順・新着順・カテゴリ別に「みんなの基準」を閲覧できます。</p>
          </div>
          <div className="metric-tile text-sm text-slate-700">
            <p className="font-medium text-slate-900">保存・複製</p>
            <p className="mt-1">Starterはコピー中心、Plus以上はコピー後に自分用として自由編集できます。</p>
          </div>
          <div className="metric-tile text-sm text-slate-700">
            <p className="font-medium text-slate-900">作成・公開</p>
            <p className="mt-1">Plusは非公開の自分用基準、Proは公開と利用統計確認まで解放します。</p>
          </div>
        </div>
        <Link href="/criteria" className="button-secondary mt-4">
          みんなの基準を見る
        </Link>
      </article>

      <article className="panel">
        <h2 className="section-title">ランク基準設定</h2>
        <p className="section-copy mt-2">固定残業ランクと年間休日ランクの閾値をユーザー単位で変更できます。自由編集はPlus以上です。</p>

        {canEditRankSettings ? (
          <form action={updateRankSettingsAction} className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-slate-900">固定残業ランク</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-2">
                  <span className="field-label">A 上限時間</span>
                  <input name="overtimeAMaxHours" type="number" min={0} defaultValue={rankSettings.fixedOvertime.aMaxHours} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">B 上限時間</span>
                  <input name="overtimeBMaxHours" type="number" min={0} defaultValue={rankSettings.fixedOvertime.bMaxHours} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">C 上限時間</span>
                  <input name="overtimeCMaxHours" type="number" min={0} defaultValue={rankSettings.fixedOvertime.cMaxHours} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">D 上限時間</span>
                  <input name="overtimeDMaxHours" type="number" min={0} defaultValue={rankSettings.fixedOvertime.dMaxHours} className="field-input" />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-900">年間休日ランク</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="space-y-2">
                  <span className="field-label">S 下限日数</span>
                  <input name="holidaySMinDays" type="number" min={0} defaultValue={rankSettings.annualHolidays.sMinDays} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">A 下限日数</span>
                  <input name="holidayAMinDays" type="number" min={0} defaultValue={rankSettings.annualHolidays.aMinDays} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">B 下限日数</span>
                  <input name="holidayBMinDays" type="number" min={0} defaultValue={rankSettings.annualHolidays.bMinDays} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">C 下限日数</span>
                  <input name="holidayCMinDays" type="number" min={0} defaultValue={rankSettings.annualHolidays.cMinDays} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="field-label">D 下限日数</span>
                  <input name="holidayDMinDays" type="number" min={0} defaultValue={rankSettings.annualHolidays.dMinDays} className="field-input" />
                </label>
              </div>
            </div>

            <button type="submit" className="button-primary">
              <Sparkles className="size-4" />
              基準を保存
            </button>
          </form>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            自分用基準の自由編集はPlusプラン以上で利用できます。現在の既定値は、固定残業 A≤{DEFAULT_RANK_SETTINGS.fixedOvertime.aMaxHours} / B≤
            {DEFAULT_RANK_SETTINGS.fixedOvertime.bMaxHours} / C≤{DEFAULT_RANK_SETTINGS.fixedOvertime.cMaxHours} / D≤{DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours}、年間休日 S≥
            {DEFAULT_RANK_SETTINGS.annualHolidays.sMinDays} / A≥{DEFAULT_RANK_SETTINGS.annualHolidays.aMinDays} / B≥{DEFAULT_RANK_SETTINGS.annualHolidays.bMinDays} / C≥
            {DEFAULT_RANK_SETTINGS.annualHolidays.cMinDays} / D≥{DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays} です。
          </div>
        )}
      </article>

      <article className="panel">
        <h2 className="section-title">追加クレジットパックの土台</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.credits} className="metric-tile text-sm text-slate-700">
              <p className="font-medium text-slate-900">{pack.credits}クレジット</p>
              <p className="mt-1">{formatYen(pack.priceYen)}円</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">初期UIは表示のみです。Stripe one-time payment に接続しやすいよう、価格定義はコード側で分離しています。</p>
      </article>
    </section>
  );
}
