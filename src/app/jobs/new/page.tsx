import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { eq, sql } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Bookmark, BriefcaseBusiness, FileSearch, Home, Layers3, Plane, Scale, Settings } from "lucide-react";

import { JobCreateForm } from "@/components/job-create-form";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
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

export default async function NewJobPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [user, session] = await Promise.all([requireUser(), getSession()]);
  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan];
  const periodKey = limits.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const [analysisCountResult, jobCountResult] = await Promise.all([
    getAnalysisCount(user.id, periodKey),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, user.id))
  ]);

  const analysisCount = analysisCountResult;
  const totalSavedJobs = jobCountResult[0]?.count ?? 0;
  const planSummary = planCopy[plan];
  const displayName = session?.user?.name ?? "プロフィール";
  const profileInitial = displayName.slice(0, 1) || "ら";

  return (
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="jobs-new" note="ランク付けから求人整理まで、同じ流れで進められます。" />

        <div className="dashboard-main">
          <div className="dashboard-mobile-top">
            <div className="dashboard-mobile-brand">
              <div className="dashboard-logo-mark">
                <BriefcaseBusiness className="size-6" />
              </div>
              <div>
                <p className="dashboard-logo-title">らくしゅう</p>
              </div>
            </div>
            <Link href="/pricing" className="dashboard-plan-card">
              <div className="dashboard-level-badge">
                <span className="text-xs font-semibold">Lv.</span>
                <span className="text-3xl font-bold leading-none">{planSummary.level.replace("Lv.", "")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rakumo-ink">{planSummary.label}</p>
                <p className="mt-1 text-xs text-rakumo-ink/70">{limits.analysisPeriod === "week" ? "今週" : "今月"}の解析使用数</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-rakumo-ink">
                  {analysisCount} <span className="text-base font-medium">/ {limits.maxAnalyses} 件</span>
                </p>
                <div className="dashboard-progress mt-2">
                  <div className="dashboard-progress-bar" style={{ width: `${Math.min(100, (analysisCount / limits.maxAnalyses) * 100)}%` }} />
                </div>
              </div>
              <ArrowRight className="size-5 shrink-0 text-rakumo-ink/45" />
            </Link>
          </div>

          <div className="ranking-layout">
            <div className="ranking-header-grid">
              <div className="ranking-hero">
                <p className="eyebrow">Ranking</p>
                <h1 className="ranking-title">求人をランク付け</h1>
                <p className="ranking-copy">
                  求人本文を貼り付けて、必要に応じて補足情報を入力してください。解析を行い、ランク付けして保存します。
                </p>
              </div>

              <Link href="/pricing" className="dashboard-plan-card desktop-only">
                <div className="dashboard-level-badge">
                  <span className="text-xs font-semibold">Lv.</span>
                  <span className="text-3xl font-bold leading-none">{planSummary.level.replace("Lv.", "")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-rakumo-ink">{planSummary.label}</p>
                  <p className="mt-1 text-sm text-rakumo-ink/70">{limits.analysisPeriod === "week" ? "今週" : "今月"}の解析使用数</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-rakumo-ink">
                    {analysisCount} <span className="text-base font-medium">/ {limits.maxAnalyses} 件</span>
                  </p>
                  <div className="dashboard-progress mt-3">
                    <div className="dashboard-progress-bar" style={{ width: `${Math.min(100, (analysisCount / limits.maxAnalyses) * 100)}%` }} />
                  </div>
                </div>
                <span className="dashboard-plan-button">プラン詳細</span>
              </Link>
            </div>

            <div className="ranking-action-row">
              <Link href="/criteria" className="ranking-outline-button">
                <Layers3 className="size-5" />
                判断基準を見る
              </Link>
              <Link href="/jobs" className="ranking-outline-button">
                <ArrowLeft className="size-5" />
                求人整理に戻る
              </Link>
            </div>

            <div className="ranking-step-grid" aria-label="ランク付けの流れ">
              <div className="ranking-step-card ranking-step-card-active">
                <span className="ranking-step-number">1</span>
                <div>
                  <p className="ranking-step-title">求人本文を貼り付ける</p>
                  <p className="ranking-step-copy">求人サイトの本文をコピーして貼り付けます</p>
                </div>
              </div>
              <div className="ranking-step-arrow" aria-hidden="true">›</div>
              <div className="ranking-step-card">
                <span className="ranking-step-number ranking-step-number-muted">2</span>
                <div>
                  <p className="ranking-step-title">補足情報を入れる</p>
                  <p className="ranking-step-copy">会社名や職種などを必要に応じて入力します</p>
                </div>
              </div>
              <div className="ranking-step-arrow" aria-hidden="true">›</div>
              <div className="ranking-step-card">
                <span className="ranking-step-number ranking-step-number-muted">3</span>
                <div>
                  <p className="ranking-step-title">ランク付けして保存</p>
                  <p className="ranking-step-copy">解析・ランク付けを行い、保存します</p>
                </div>
              </div>
            </div>

            <JobCreateForm />
          </div>
        </div>
      </div>

      <nav className="dashboard-mobile-nav">
        <Link href="/dashboard" className="dashboard-mobile-nav-item">
          <Home className="size-5" />
          <span>ホーム</span>
        </Link>
        <Link href="/jobs/new" className="dashboard-mobile-nav-item dashboard-mobile-nav-item-active">
          <FileSearch className="size-5" />
          <span>ランク付け</span>
        </Link>
        <Link href="/jobs" className="dashboard-mobile-nav-item">
          <Bookmark className="size-5" />
          <span>保存</span>
        </Link>
        <Link href="/jobs" className="dashboard-mobile-nav-item">
          <Plane className="size-5" />
          <span>応募</span>
        </Link>
        <Link href="/settings" className="dashboard-mobile-nav-item">
          <Settings className="size-5" />
          <span>設定</span>
        </Link>
      </nav>
    </section>
  );
}
