import Image from "next/image";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CalendarClock,
  FileSearch,
  Gauge,
  Home,
  Plane,
  Scale,
  Settings,
  Sparkles,
  Zap
} from "lucide-react";

import { getSession } from "@/lib/auth/session";
import type { ParsedJob, Rank } from "@/lib/analysis";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { RakumoEmptyState } from "@/components/rakumo/RakumoEmptyState";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import rakumoImage from "../../../yuru-chara/rakumo_happy.jpg";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  saved: "保存中",
  applied: "応募済み",
  screening: "選考中",
  interview: "面接予定",
  offer: "内定",
  rejected: "見送り"
};

const statusToneClassName: Record<string, string> = {
  saved: "dashboard-status-saved",
  applied: "dashboard-status-applied",
  screening: "dashboard-status-screening",
  interview: "dashboard-status-interview",
  offer: "dashboard-status-offer",
  rejected: "dashboard-status-rejected"
};

const planCopy: Record<Plan, { label: string; level: string }> = {
  free: { label: "フリープラン", level: "Lv.1" },
  starter: { label: "スタータープラン", level: "Lv.2" },
  plus: { label: "プラスプラン", level: "Lv.3" },
  pro: { label: "プロプラン", level: "Lv.4" }
};

const mobileNavItems = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/jobs", label: "求人", icon: BriefcaseBusiness },
  { href: "/criteria", label: "保存", icon: Bookmark },
  { href: "/jobs/new", label: "応募", icon: Plane },
  { href: "/settings", label: "設定", icon: Settings }
] as const;

function renderStatusPill(status: string) {
  return <span className={`dashboard-status-pill ${statusToneClassName[status] ?? "dashboard-status-saved"}`}>{statusLabel[status] ?? "未設定"}</span>;
}

function getNextStepCopy(totalSavedJobs: number, upcomingActionsCount: number, latestAnalysisCount: number) {
  if (totalSavedJobs === 0) {
    return {
      title: "まずは保存中の求人を1件ランク付けして、判断を進めましょう。",
      body: "公開基準でも自分用基準でもかまいません。判断軸がひとつあるだけで、残す求人を選びやすくなります。",
      primaryHref: "/jobs/new",
      primaryLabel: "ランク付けを始める"
    };
  }

  if (upcomingActionsCount > 0) {
    return {
      title: "次に見る予定が入っている求人から順に見れば十分です。",
      body: "保存した求人を全部一度に動かす必要はありません。今日見るぶんだけ整っていれば進められます。",
      primaryHref: "/jobs",
      primaryLabel: "応募状況を見る"
    };
  }

  if (latestAnalysisCount < totalSavedJobs) {
    return {
      title: "まだランク付け前の求人があります。気になる1件だけ進めましょう。",
      body: "先にランクが付くと、残すかどうかの判断が揃います。まとめてやる必要はありません。",
      primaryHref: "/jobs/new",
      primaryLabel: "ランク付けを始める"
    };
  }

  return {
    title: "基準とランクがそろっているので、残した求人だけ見返せば十分です。",
    body: "応募状況の整理に集中できます。必要なら基準の見直しもあとからできます。",
    primaryHref: "/jobs/new",
    primaryLabel: "ランク付けを始める"
  };
}

function toDateLabel(value: Date | null): string {
  if (!value) return "日付未設定";
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${m}/${d}`;
}

function toDateWeekdayLabel(value: Date | null): string {
  if (!value) return "";
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `(${weekdays[value.getUTCDay()]})`;
}

function getDisplayRank(rank: string | null | undefined) {
  return rank && rank !== "UNKNOWN" ? rank : "保留";
}

function getRankClassName(rank: string | null | undefined) {
  if (rank?.startsWith("A")) return "dashboard-rank-a";
  if (rank?.startsWith("B")) return "dashboard-rank-b";
  if (rank?.startsWith("C")) return "dashboard-rank-c";
  return "dashboard-rank-hold";
}

function getCompletionText(done: number, total: number) {
  if (total === 0) return "0 / 0 件";
  return `${done} / ${total} 件`;
}

function getDashboardDisplayName(name: string | null | undefined) {
  if (!name) return "ユーザー";
  const japaneseNameMatch = name.match(/\(([^)]+)\)/);
  const displayName = japaneseNameMatch?.[1] ?? name;
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

export default async function DashboardPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const [{ db }, { jobs }, { getUserPlan }, { getAnalysisCount, getMonthKey, getWeekKey }] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
    import("@/lib/subscription"),
    import("@/lib/usage/counters")
  ]);

  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan];

  const recentJobs = await db
    .select({
      id: jobs.id,
      userId: jobs.userId,
      companyName: jobs.companyName,
      title: jobs.title,
      selectionStatus: jobs.selectionStatus
    })
    .from(jobs)
    .where(eq(jobs.userId, user.id))
    .orderBy(desc(jobs.createdAt))
    .limit(6);

  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(recentJobs.map((job) => job.id));
  const recentJobsWithAnalyses = recentJobs.map((job) => ({
    ...job,
    analyses: latestAnalysesByJobId.has(job.id) ? [latestAnalysesByJobId.get(job.id)!] : []
  }));

  const latestAnalysisCount = recentJobsWithAnalyses.filter((job) => job.analyses[0]).length;
  const jobCountResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, user.id));
  const totalSavedJobs = jobCountResult[0]?.count ?? 0;
  const periodKey = limits.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const analysisCount = await getAnalysisCount(user.id, periodKey);
  const now = new Date();
  const oneWeekLater = new Date(now);
  oneWeekLater.setUTCDate(now.getUTCDate() + 7);
  const upcomingActions = await db
    .select({
      id: jobs.id,
      companyName: jobs.companyName,
      title: jobs.title,
      selectionStatus: jobs.selectionStatus,
      nextActionAt: jobs.nextActionAt
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.userId, user.id),
        sql`${jobs.nextActionAt} is not null`,
        sql`${jobs.selectionStatus} not in ('offer', 'rejected')`,
        sql`${jobs.nextActionAt} <= ${oneWeekLater}`
      )
    )
    .orderBy(asc(jobs.nextActionAt))
    .limit(6);
  const nextStep = getNextStepCopy(totalSavedJobs, upcomingActions.length, latestAnalysisCount);
  const displayName = getDashboardDisplayName(user.name);
  const recentJobsForList = recentJobsWithAnalyses.slice(0, 3).map((job) => {
    const latest = job.analyses[0];
    const parsed = parseStoredParsedJob(latest?.evidenceJson, `dashboard-page:${job.id}`);
    return {
      ...job,
      parsed,
      displayCompanyName: parsed?.companyName.value ?? job.companyName ?? "会社名不明",
      displayTitle: parsed?.title.value ?? job.title ?? "職種不明",
      displayRank: getDisplayRank(latest?.totalRank)
    };
  });
  const planSummary = planCopy[plan];

  return (
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="dashboard" note="ランク付けから求人整理まで、同じ流れで進められます。" />

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

          <div className="dashboard-hero-grid">
            <div className="dashboard-hero-card">
              <div className="dashboard-hero-rakumo">
                <div className="dashboard-rakumo-wrap">
                  <Image src={rakumoImage} alt="らくも" fill className="object-cover" sizes="(max-width: 767px) 120px, 180px" priority />
                </div>
              </div>
              <div className="dashboard-hero-copy">
                <div className="dashboard-sparkle dashboard-sparkle-left" aria-hidden="true">
                  <Sparkles className="size-4" />
                </div>
                <div className="dashboard-sparkle dashboard-sparkle-right" aria-hidden="true">
                  <Sparkles className="size-4" />
                </div>
                <h1 className="dashboard-hero-title">{displayName}さん、おかえりなさい</h1>
                <p className="dashboard-hero-text">{nextStep.title}</p>
                <p className="dashboard-hero-subtext">{nextStep.body}</p>
                <div className="dashboard-hero-actions">
                  <Link href={nextStep.primaryHref} className="dashboard-cta dashboard-cta-primary">
                    <FileSearch className="size-5" />
                    {nextStep.primaryLabel}
                  </Link>
                  <Link href="/jobs" className="dashboard-cta">
                    <Plane className="size-5" />
                    応募状況を見る
                  </Link>
                  <Link href="/criteria" className="dashboard-cta">
                    <Scale className="size-5" />
                    判断基準を見る
                  </Link>
                </div>
              </div>
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

          <section className="dashboard-panel">
            <div className="dashboard-section-title">
              <Gauge className="size-6 text-[#20a754]" />
              <h2>今日の焦点</h2>
            </div>
            <div className="dashboard-metric-grid">
              <article className="dashboard-metric-card">
                <div className="dashboard-metric-icon dashboard-metric-icon-green">
                  <Bookmark className="size-6" />
                </div>
                <div>
                  <p className="dashboard-metric-label">保存中の求人</p>
                  <p className="dashboard-metric-value">{totalSavedJobs} <span>件</span></p>
                </div>
              </article>
              <article className="dashboard-metric-card">
                <div className="dashboard-metric-icon dashboard-metric-icon-amber">
                  <CalendarClock className="size-6" />
                </div>
                <div>
                  <p className="dashboard-metric-label">次に見直す予定</p>
                  <p className="dashboard-metric-value">{upcomingActions.length} <span>件</span></p>
                </div>
              </article>
              <article className="dashboard-metric-card">
                <div className="dashboard-metric-icon dashboard-metric-icon-blue">
                  <Gauge className="size-6" />
                </div>
                <div>
                  <p className="dashboard-metric-label">直近求人の解析済み</p>
                  <p className="dashboard-metric-value">{getCompletionText(latestAnalysisCount, recentJobs.length)}</p>
                </div>
              </article>
              <article className="dashboard-metric-card">
                <div className="dashboard-metric-icon dashboard-metric-icon-purple">
                  <Zap className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="dashboard-metric-label">{limits.analysisPeriod === "week" ? "今週" : "今月"}の解析使用数</p>
                  <p className="dashboard-metric-value">
                    {analysisCount} <span>/ {limits.maxAnalyses} 件</span>
                  </p>
                  <div className="dashboard-progress mt-3">
                    <div className="dashboard-progress-bar dashboard-progress-bar-purple" style={{ width: `${Math.min(100, (analysisCount / limits.maxAnalyses) * 100)}%` }} />
                  </div>
                </div>
              </article>
            </div>
          </section>

          <div className="dashboard-content-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div className="dashboard-section-title">
                  <BriefcaseBusiness className="size-6 text-[#20a754]" />
                  <h2>求人整理</h2>
                </div>
                <div className="dashboard-stepper">
                  <span className="dashboard-step dashboard-step-active">1 保存</span>
                  <span className="dashboard-step dashboard-step-active">2 ランク付け</span>
                  <span className="dashboard-step">3 判断・応募</span>
                </div>
              </div>

              <div className="dashboard-comment">
                <div className="dashboard-comment-avatar">
                  <Image src={rakumoImage} alt="らくものコメント" fill className="object-cover" sizes="72px" />
                </div>
                <div className="dashboard-comment-bubble">
                  <p className="dashboard-comment-title">らくものコメント</p>
                  <p className="dashboard-comment-text">
                    {totalSavedJobs === 0 ? "まずは気になる求人を1つ入れてみましょう。" : "直近の求人から順に見ていくと、迷いが減ります。"}
                  </p>
                </div>
              </div>

              {recentJobsForList.length === 0 ? (
                <div className="dashboard-empty">
                  <RakumoEmptyState
                    title="まだ求人がないね"
                    body="まずは気になる求人を1つ入れてみよう。完璧に整理しなくて大丈夫。雑に入れてから整えよう。"
                    ctaHref="/jobs/new"
                    ctaLabel="求人を1つ入れてみる"
                  />
                </div>
              ) : (
                <div className="dashboard-job-list">
                  <div className="dashboard-subheading">最近の求人（最大3件）</div>
                  {recentJobsForList.map((job) => (
                    <article key={job.id} className="dashboard-job-row">
                      <div className="dashboard-job-main">
                        <div className="dashboard-job-status">{renderStatusPill(job.selectionStatus)}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-rakumo-ink/70">{job.displayCompanyName}</p>
                          <p className="truncate text-[1.05rem] font-semibold text-rakumo-ink">{job.displayTitle}</p>
                        </div>
                      </div>
                      <div className={`dashboard-rank-box ${getRankClassName(job.displayRank)}`}>
                        <p className="dashboard-rank-label">総合ランク</p>
                        <p className="dashboard-rank-value">{job.displayRank}</p>
                      </div>
                      <Link href={`/jobs/${job.id}`} className="dashboard-row-link">
                        詳細を見る
                        <ArrowRight className="size-4" />
                      </Link>
                    </article>
                  ))}
                  <Link href="/jobs" className="dashboard-inline-link">
                    求人一覧へ
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div className="dashboard-section-title">
                  <CalendarClock className="size-6 text-[#20a754]" />
                  <h2>次に見る予定</h2>
                </div>
                <Link href="/jobs" className="dashboard-inline-chip">
                  すべて見る
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              {upcomingActions.length === 0 ? (
                <div className="dashboard-empty-copy">
                  今すぐ確認が必要な予定はありません。気になる求人が出てきたときに、次の確認日を入れておけば十分です。
                </div>
              ) : (
                <div className="dashboard-schedule-list">
                  {upcomingActions.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="dashboard-schedule-row">
                      <div className="dashboard-schedule-date">
                        <p>{toDateLabel(job.nextActionAt)}</p>
                        <span>{toDateWeekdayLabel(job.nextActionAt)}</span>
                      </div>
                      <div>{renderStatusPill(job.selectionStatus)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-rakumo-ink/70">{job.companyName ?? "会社名不明"}</p>
                        <p className="truncate text-[1.02rem] font-semibold text-rakumo-ink">{job.title ?? "職種不明"}</p>
                      </div>
                      <span className="dashboard-row-link dashboard-row-link-inline">
                        詳細を見る
                        <ArrowRight className="size-4" />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-bottom-note">
            <div className="dashboard-bottom-note-copy">
              <p className="dashboard-bottom-note-icon">i</p>
              <p>求人が0件のときは「求人を1つ入れてみる」が表示されます</p>
            </div>
            <div className="dashboard-bottom-note-rakumo">
              <Sparkles className="size-4 text-[#f5bf28]" />
              <BriefcaseBusiness className="size-8 text-[#8fc8ff]" />
            </div>
          </div>

          <nav className="dashboard-mobile-nav">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/dashboard";

              return (
                <Link key={item.href} href={item.href} className={`dashboard-mobile-nav-item ${isActive ? "dashboard-mobile-nav-item-active" : ""}`}>
                  <Icon className="size-6" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
