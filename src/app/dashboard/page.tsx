import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, CalendarClock, CreditCard, Layers3, Plus } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import type { ParsedJob } from "@/lib/analysis";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { PLAN_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  saved: "整理中",
  applied: "応募済み",
  screening: "選考中",
  interview: "面接予定",
  offer: "内定",
  rejected: "見送り"
};

function formatHours(value: number) {
  const hours = Math.trunc(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatRankDetail(label: string, parsed: ParsedJob | null) {
  if (!parsed) return "値なし";

  if (label === "総合") {
    const warningCount = parsed.warnings.value?.length ?? 0;
    return warningCount > 0 ? `警告 ${warningCount}件` : "警告なし";
  }

  if (label === "固定残業") {
    if (parsed.fixedOvertimeHours.status === "none") return "固定残業なし";
    if (parsed.fixedOvertimeHours.value == null) return "時間不明";
    return formatHours(parsed.fixedOvertimeHours.value);
  }

  if (label === "年間休日") {
    return parsed.annualHolidays.value != null ? `${parsed.annualHolidays.value}日` : "日数不明";
  }

  if (label === "休日制度") {
    return parsed.holidayType.value ?? "制度不明";
  }

  if (label === "福利厚生") {
    const count = parsed.benefits.value?.length ?? 0;
    if (count === 0) return "項目なし";
    return `${count}項目`;
  }

  return "値なし";
}

function renderRankBadge(label: string, rank: string | null | undefined, detail: string) {
  return (
    <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">{label}</p>
      <p className="mt-2 text-base font-medium text-[#202124]">{rank ?? "UNKNOWN"}</p>
      <p className="mt-2 text-xs leading-5 text-[#5f6368]">{detail}</p>
    </div>
  );
}

function renderStatusPill(status: string) {
  return <span className="status-pill">{statusLabel[status] ?? "未設定"}</span>;
}

function getNextStepCopy(totalSavedJobs: number, upcomingActionsCount: number, latestAnalysisCount: number) {
  if (totalSavedJobs === 0) {
    return {
      title: "まずは基準を決めて、1件だけランク付けしましょう",
      body: "公開基準でも自分用基準でもかまいません。判断軸がひとつあるだけで、残す求人を選びやすくなります。",
      primaryHref: "/jobs/new",
      primaryLabel: "ランク付けを始める"
    };
  }

  if (upcomingActionsCount > 0) {
    return {
      title: "ランク付けした求人の中から、次に見る予定だけ追いましょう",
      body: "保存した求人を全部一度に動かす必要はありません。今日見るぶんだけ整っていれば十分です。",
      primaryHref: "/jobs",
      primaryLabel: "応募状況を見る"
    };
  }

  if (latestAnalysisCount < totalSavedJobs) {
    return {
      title: "保存した求人の中に、まだランク付け前のものがあります",
      body: "気になる1件だけ進めれば十分です。先にランクが付くと、残すかどうかの判断が揃います。",
      primaryHref: "/jobs/new",
      primaryLabel: "ランク付けを続ける"
    };
  }

  return {
    title: "基準とランクがそろっているので、あとは残した求人だけ見返せば十分です",
    body: "判断軸が決まっているぶん、応募状況の整理に集中できます。必要なら基準の見直しもあとからできます。",
    primaryHref: "/jobs/new",
    primaryLabel: "求人をランク付けする"
  };
}

function toDateLabel(value: Date | null): string {
  if (!value) return "日付未設定";
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function DashboardPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const [{ db }, { jobs }, { getUserPlan }, { getAnalysisCount, getMonthKey, getWeekKey }] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
    import("@/lib/subscription"),
    import("@/lib/usage/counters")
  ]);
  const plan = await getUserPlan(session.user.id);
  const limits = PLAN_LIMITS[plan];

  const recentJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, session.user.id),
    orderBy: [desc(jobs.createdAt)],
    limit: 6
  });
  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(recentJobs.map((job) => job.id));
  const recentJobsWithAnalyses = recentJobs.map((job) => ({
    ...job,
    analyses: latestAnalysesByJobId.has(job.id) ? [latestAnalysesByJobId.get(job.id)!] : []
  }));

  const latestAnalysisCount = recentJobsWithAnalyses.filter((job) => job.analyses[0]).length;
  const jobCountResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, session.user.id));
  const totalSavedJobs = jobCountResult[0]?.count ?? 0;
  const periodKey = limits.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const analysisCount = await getAnalysisCount(session.user.id, periodKey);
  const now = new Date();
  const oneWeekLater = new Date(now);
  oneWeekLater.setUTCDate(now.getUTCDate() + 7);
  const upcomingActions = await db.query.jobs.findMany({
    where: and(
      eq(jobs.userId, session.user.id),
      sql`${jobs.nextActionAt} is not null`,
      sql`${jobs.selectionStatus} not in ('offer', 'rejected')`,
      sql`${jobs.nextActionAt} <= ${oneWeekLater}`
    ),
    orderBy: [asc(jobs.nextActionAt)],
    limit: 6
  });
  const nextStep = getNextStepCopy(totalSavedJobs, upcomingActions.length, latestAnalysisCount);

  return (
    <section className="page-stack">
      <div className="google-surface page-hero page-hero-split p-7 md:p-9">
        <div className="space-y-5">
          <div>
            <p className="inline-flex items-center rounded-full bg-[#e8f0fe] px-3 py-1 text-xs font-medium tracking-[0.08em] text-[#1967d2]">
              Dashboard
            </p>
            <h1 className="mt-4 text-3xl font-medium tracking-tight text-[#1f1f1f] md:text-4xl">こんにちは、{session.user.name} さん</h1>
            <p className="mt-4 max-w-2xl text-xl font-medium leading-8 text-[#202124]">{nextStep.title}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6368]">{nextStep.body}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="google-chip">1. 基準を決める</span>
            <span className="google-chip">2. ランク付けする</span>
            <span className="google-chip">3. 良い求人だけ整理する</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={nextStep.primaryHref} className="google-primary">
              <Plus className="size-4" />
              {nextStep.primaryLabel}
            </Link>
            <Link href="/jobs" className="google-secondary">
              <BriefcaseBusiness className="size-4" />
              求人整理
            </Link>
            <Link href="/criteria" className="google-secondary">
              <Layers3 className="size-4" />
              判断基準を見る
            </Link>
          </div>
        </div>

        <div className="google-subtle space-y-4 p-5 md:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">Today</p>
            <h2 className="mt-2 text-xl font-medium tracking-tight text-[#1f1f1f]">今日の焦点</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">全体管理ではなく、今見れば十分な範囲だけをまとめています。</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">求人整理</p>
                <p className="mt-1 text-sm leading-6 text-[#5f6368]">手元に置いてある求人の数</p>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-2xl font-medium tracking-tight text-[#202124]">{totalSavedJobs}</p>
                <span className="text-sm font-medium text-[#5f6368]">/ {Number.isFinite(limits.maxJobs) ? limits.maxJobs : "∞"}</span>
              </div>
            </div>
            <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">応募状況</p>
                <p className="mt-1 text-sm leading-6 text-[#5f6368]">次に見直す予定がある求人</p>
              </div>
              <p className="mt-3 text-2xl font-medium tracking-tight text-[#202124]">{upcomingActions.length}</p>
            </div>
            <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">下ごしらえ</p>
                <p className="mt-1 text-sm leading-6 text-[#5f6368]">見返しやすい形まで整った求人</p>
              </div>
              <p className="mt-3 text-2xl font-medium tracking-tight text-[#202124]">{latestAnalysisCount}</p>
            </div>
          </div>
          <p className="text-xs leading-5 text-[#5f6368]">
            {limits.analysisPeriod === "week" ? "今週" : "今月"}の解析: {analysisCount} / {limits.maxAnalyses}
          </p>
        </div>
      </div>

      <div className="google-surface panel border-[#dfe3eb] p-6">
        <div className="section-heading">
          <div>
            <h2 className="text-xl font-medium text-[#1f1f1f]">求人整理</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">ランク付けして残した求人だけを置いています。気になる1件をすぐ開ける状態を優先します。</p>
          </div>
          <Link href="/jobs" className="google-secondary">
            一覧へ
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">Step 1</p>
            <p className="mt-2 text-sm font-medium text-[#202124]">判断基準を確認する</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">迷ったら公開基準を借りて、残す求人の基準をそろえます。</p>
          </div>
          <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">Step 2</p>
            <p className="mt-2 text-sm font-medium text-[#202124]">求人をランク付けする</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">求人本文を貼ると、その場で総合ランクと注意点がそろいます。</p>
          </div>
          <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">Step 3</p>
            <p className="mt-2 text-sm font-medium text-[#202124]">残した求人だけ追う</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">応募状況や次に見る予定は、残した求人だけに絞って進めます。</p>
          </div>
        </div>

        {recentJobsWithAnalyses.length === 0 ? (
          <div className="google-subtle mt-5 p-5">
            <p className="text-sm leading-6 text-[#5f6368]">まだ求人はありません。まずは基準を確認してから1件だけランク付けすると、この画面から少しずつ整理できるようになります。</p>
            <Link href="/jobs/new" className="google-primary mt-4">
              ランク付けを始める
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {recentJobsWithAnalyses.slice(0, 3).map((job) => {
              const latest = job.analyses[0];
              const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
              const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
              const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";
              const totalRankDetail = latest ? formatRankDetail("総合", parsed) : "まだ整っていません";
              const warningCount = parsed?.warnings.value?.length ?? 0;

              return (
                <article key={job.id} className="google-subtle p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3">{renderStatusPill(job.selectionStatus)}</div>
                      <p className="text-lg font-medium text-[#202124]">{displayCompanyName}</p>
                      <p className="mt-1 text-sm leading-6 text-[#5f6368]">{displayTitle}</p>
                    </div>
                    <Link href={`/jobs/${job.id}`} className="google-secondary px-4 py-2">
                      詳細
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {renderRankBadge("総合", latest?.totalRank, totalRankDetail)}
                    <div className="rounded-3xl border border-[#e3e7ee] bg-white px-4 py-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]">ひとこと</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                        {latest
                          ? warningCount > 0
                            ? "気になる点があれば詳細で根拠文だけ確認できます。"
                            : "必要なら詳細で中身を見返せます。"
                          : "まだ解析前です。必要になったタイミングで整えれば十分です。"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="google-surface panel border-[#dfe3eb] p-6 lg:col-span-3">
          <div className="section-heading">
            <div>
              <h2 className="text-xl font-medium text-[#1f1f1f]">応募状況</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6368]">次に見返す予定がある求人だけを並べています。急がせるためではなく、迷いを減らすための一覧です。</p>
            </div>
            <CalendarClock className="size-5 text-[#1a73e8]" />
          </div>
          {upcomingActions.length === 0 ? (
            <div className="google-subtle mt-4 p-5">
              <p className="text-sm leading-6 text-[#5f6368]">今すぐ確認が必要な予定はありません。気になる求人が出てきたときに、次の確認日を入れておけば十分です。</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {upcomingActions.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="google-subtle p-4">
                  <div className="mb-3">{renderStatusPill(job.selectionStatus)}</div>
                  <p className="text-sm font-medium text-[#202124]">{job.companyName ?? "会社名不明"}</p>
                  <p className="mt-1 text-sm text-[#5f6368]">{job.title ?? "職種不明"}</p>
                  <p className="mt-3 text-xs text-[#5f6368]">次に見る予定: {toDateLabel(job.nextActionAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="google-surface panel border-[#dfe3eb] p-6">
          <h2 className="text-lg font-medium text-[#1f1f1f]">次にやること</h2>
          <div className="mt-4 space-y-3 text-sm text-[#5f6368]">
            <p>判断軸を見直すなら基準へ、求人を増やすならランク付けへ、整理を続けるなら求人一覧へ進めます。</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/criteria" className="google-secondary mt-1">
                基準を見る
              </Link>
              <Link href="/jobs/new" className="google-secondary mt-1">
                ランク付けする
              </Link>
              <Link href="/jobs" className="google-secondary mt-1">
                求人一覧を開く
              </Link>
            </div>
          </div>
        </div>

        <div className="google-surface panel border-[#dfe3eb] p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-[#5f6368]" />
            <h2 className="text-lg font-medium text-[#1f1f1f]">利用枠</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#5f6368]">
            {limits.analysisPeriod === "week" ? "今週" : "今月"}の解析は {analysisCount} / {limits.maxAnalyses} 件です。細かい制限確認は必要なときだけで十分です。
          </p>
          <Link href="/pricing" className="google-secondary mt-4">
            プラン詳細
          </Link>
        </div>

        <div className="google-surface panel border-[#dfe3eb] p-6">
          <div className="flex items-center gap-2">
            <Layers3 className="size-4 text-[#5f6368]" />
            <h2 className="text-lg font-medium text-[#1f1f1f]">判断基準</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#5f6368]">求人を追加する前に基準を一度決めておくと、残す求人の判断がぶれにくくなります。迷ったときは公開基準をそのまま借りられます。</p>
          <Link href="/criteria" className="google-secondary mt-4">
            基準を見る
          </Link>
        </div>
      </div>
    </section>
  );
}
