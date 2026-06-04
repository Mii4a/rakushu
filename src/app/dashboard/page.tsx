import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import type { ParsedJob } from "@/lib/analysis";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { getSession } from "@/lib/auth/session";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { DashboardMockExperience } from "@/components/dashboard/dashboard-mock-experience";

export const dynamic = "force-dynamic";

const planCopy: Record<Plan, { label: string; level: string }> = {
  free: { label: "フリープラン", level: "Lv.1" },
  starter: { label: "スタータープラン", level: "Lv.2" },
  plus: { label: "プラスプラン", level: "Lv.3" },
  pro: { label: "プロプラン", level: "Lv.4" }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDashboardDisplayName(name: string | null | undefined) {
  if (!name) return "山田 花子";
  const japaneseNameMatch = name.match(/\(([^)]+)\)/);
  const displayName = japaneseNameMatch?.[1] ?? name;
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

function getDisplayRank(rank: string | null | undefined) {
  return rank && rank !== "UNKNOWN" ? rank : "保留";
}

function formatDateLabel(value: Date | null): string {
  if (!value) return "日付未設定";
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const date = String(value.getUTCDate()).padStart(2, "0");
  return `${month}/${date}`;
}

function formatWeekdayLabel(value: Date | null): string {
  if (!value) return "";
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return weekdays[value.getUTCDay()] ?? "";
}

function formatDateTimeLabel(value: Date | null): string {
  if (!value) return "日時未設定";
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(value).replace(/\//g, "/");
}

function getProgressMessage(progressPercent: number) {
  if (progressPercent >= 75) return "良いペースです！";
  if (progressPercent >= 50) return "順調に進んでいます";
  if (progressPercent >= 30) return "あと少しで流れが整います";
  return "少しずつ進めましょう";
}

function getProgressSubtext(progressPercent: number) {
  if (progressPercent >= 75) return "この調子で続けましょう。";
  if (progressPercent >= 50) return "次の予定を入れておくと迷いが減ります。";
  if (progressPercent >= 30) return "応募と書類の流れをそろえると見通しが良くなります。";
  return "保存・応募・予定の3つがそろうと一気に見やすくなります。";
}

function getActivityTitle(status: string, companyName: string, title: string) {
  if (status === "interview") return `${title} の面接予定を更新しました`;
  if (status === "screening") return `${companyName} から書類選考の進捗が入りました`;
  if (status === "applied") return `${companyName} に応募しました`;
  if (status === "offer") return `${companyName} から内定の連絡が届きました`;
  return `${companyName} の求人を保存しました`;
}

function getActivityTone(status: string): "green" | "blue" | "orange" {
  if (status === "applied" || status === "offer") return "green";
  if (status === "screening") return "blue";
  return "orange";
}

function getRecommendTone(rank: string): "green" | "blue" | "orange" {
  if (rank === "S" || rank.startsWith("A")) return "green";
  if (rank.startsWith("B")) return "blue";
  return "orange";
}

function getRecommendBadge(rank: string) {
  if (rank === "S" || rank.startsWith("A")) return "高マッチ";
  if (rank.startsWith("B")) return "中マッチ";
  return "要確認";
}

function formatSalary(parsed: ParsedJob | null | undefined) {
  if (parsed?.salaryText.value) return parsed.salaryText.value;
  if (parsed?.baseSalaryMin.value && parsed?.baseSalaryMax.value) {
    return `${parsed.baseSalaryMin.value.toLocaleString("ja-JP")}〜${parsed.baseSalaryMax.value.toLocaleString("ja-JP")}円`;
  }
  return "給与は求人詳細で確認";
}

function buildRecommendTags(parsed: ParsedJob | null | undefined) {
  const tags: string[] = [];

  if (parsed?.annualHolidays.value) {
    tags.push(`年休${parsed.annualHolidays.value}日`);
  }

  for (const benefit of parsed?.benefits.value ?? []) {
    if (tags.length >= 3) break;
    const compact = benefit.replace(/\s+/g, "").slice(0, 10);
    if (compact) tags.push(compact);
  }

  if (tags.length === 0) {
    tags.push("詳細確認", "比較候補");
  }

  return tags.slice(0, 3);
}

function buildTrendSeries(jobDates: Date[]) {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 35);

  const labels: string[] = [];
  const points: number[] = [];

  for (let index = 0; index < 6; index += 1) {
    const weekEnd = new Date(start);
    weekEnd.setUTCDate(start.getUTCDate() + index * 7);
    labels.push(`${weekEnd.getUTCMonth() + 1}/${weekEnd.getUTCDate()}`);
    points.push(jobDates.filter((date) => date.getTime() <= weekEnd.getTime()).length);
  }

  return { labels, points };
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
  const analysisLabel = limits.analysisPeriod === "week" ? "今週の解析使用数" : "今月の解析使用数";

  const dashboardJobs = await db
    .select({
      id: jobs.id,
      userId: jobs.userId,
      companyName: jobs.companyName,
      title: jobs.title,
      workAddress: jobs.workAddress,
      selectionStatus: jobs.selectionStatus,
      nextActionAt: jobs.nextActionAt,
      createdAt: jobs.createdAt
    })
    .from(jobs)
    .where(eq(jobs.userId, user.id))
    .orderBy(desc(jobs.createdAt))
    .limit(12);

  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(dashboardJobs.map((job) => job.id));
  const dashboardJobsWithAnalyses = dashboardJobs.map((job) => ({
    ...job,
    analyses: latestAnalysesByJobId.has(job.id) ? [latestAnalysesByJobId.get(job.id)!] : []
  }));

  const latestAnalysisCount = dashboardJobsWithAnalyses.filter((job) => job.analyses[0]).length;
  const jobCountResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, user.id));
  const totalSavedJobs = jobCountResult[0]?.count ?? 0;

  const statusCountRows = await db
    .select({
      status: jobs.selectionStatus,
      count: sql<number>`count(*)`
    })
    .from(jobs)
    .where(eq(jobs.userId, user.id))
    .groupBy(jobs.selectionStatus);

  const statusCounts = Object.fromEntries(statusCountRows.map((row) => [row.status, row.count])) as Record<string, number>;
  const appliedCount = (statusCounts.applied ?? 0) + (statusCounts.screening ?? 0) + (statusCounts.interview ?? 0) + (statusCounts.offer ?? 0);
  const screeningCount = (statusCounts.screening ?? 0) + (statusCounts.interview ?? 0) + (statusCounts.offer ?? 0);
  const interviewCount = statusCounts.interview ?? 0;
  const offerCount = statusCounts.offer ?? 0;

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
    .limit(4);

  const searchPercent = clamp(totalSavedJobs * 8 + 20, 18, 96);
  const applyPercent = clamp(totalSavedJobs === 0 ? 0 : Math.round((appliedCount / totalSavedJobs) * 100), 0, 100);
  const documentsPercent = clamp(appliedCount === 0 ? 0 : Math.round((screeningCount / appliedCount) * 100), 0, 100);
  const interviewPercent = clamp(appliedCount === 0 ? 0 : Math.round((interviewCount / appliedCount) * 100), 0, 100);
  const offerPercent = clamp(appliedCount === 0 ? 0 : Math.round((offerCount / appliedCount) * 100), 0, 100);
  const progressPercent = clamp(
    Math.round((searchPercent + applyPercent + documentsPercent + interviewPercent + offerPercent) / 5),
    0,
    100
  );

  const displayName = getDashboardDisplayName(user.name);
  const planSummary = planCopy[plan];

  const recommendedJobs = dashboardJobsWithAnalyses.slice(0, 3).map((job) => {
    const latest = job.analyses[0];
    const parsed = parseStoredParsedJob(latest?.evidenceJson, `dashboard-recommend:${job.id}`);
    const rank = getDisplayRank(latest?.totalRank);
    return {
      id: job.id,
      company: parsed?.companyName.value ?? job.companyName ?? "おすすめ求人",
      title: parsed?.title.value ?? job.title ?? "職種未設定",
      salary: formatSalary(parsed),
      location: job.workAddress ?? "勤務地は求人詳細で確認",
      tags: buildRecommendTags(parsed),
      badge: getRecommendBadge(rank),
      badgeTone: getRecommendTone(rank),
      href: `/jobs/${job.id}`
    };
  });

  if (recommendedJobs.length === 0) {
    recommendedJobs.push(
      {
        id: "placeholder-1",
        company: "クラウドワークス株式会社",
        title: "バックエンドエンジニア",
        salary: "600〜900万円",
        location: "東京都渋谷区",
        tags: ["リモート可", "フレックス", "AWS"],
        badge: "高マッチ",
        badgeTone: "green",
        href: "/jobs/new"
      },
      {
        id: "placeholder-2",
        company: "テックスタートアップ株式会社",
        title: "フルスタックエンジニア",
        salary: "700〜1,000万円",
        location: "東京都港区",
        tags: ["リモート可", "成長環境", "自社サービス"],
        badge: "高マッチ",
        badgeTone: "green",
        href: "/jobs/new"
      },
      {
        id: "placeholder-3",
        company: "データリンク株式会社",
        title: "データサイエンティスト",
        salary: "550〜850万円",
        location: "東京都中央区",
        tags: ["リモート可", "データ分析", "Python"],
        badge: "中マッチ",
        badgeTone: "orange",
        href: "/jobs/new"
      }
    );
  }

  const recentActivities = dashboardJobsWithAnalyses.slice(0, 3).map((job) => ({
    id: `activity-${job.id}`,
    title: getActivityTitle(job.selectionStatus, job.companyName ?? "会社", job.title ?? "求人"),
    timestamp: formatDateTimeLabel(job.createdAt),
    badge: job.selectionStatus === "interview" ? "今後の予定" : undefined,
    tone: getActivityTone(job.selectionStatus)
  }));

  if (recentActivities.length === 0) {
    recentActivities.push(
      {
        id: "activity-placeholder-1",
        title: "ソフトウェア株式会社に応募しました",
        timestamp: "2024/05/12 10:30",
        badge: undefined,
        tone: "green"
      },
      {
        id: "activity-placeholder-2",
        title: "テックスタートアップ株式会社から書類選考の結果が届きました",
        timestamp: "2024/05/11 15:45",
        badge: undefined,
        tone: "blue"
      },
      {
        id: "activity-placeholder-3",
        title: "フルスタックエンジニアの面接が予定されています",
        timestamp: "2024/05/15 14:00",
        badge: "今後の予定",
        tone: "orange"
      }
    );
  }

  const nextStepTitle =
    totalSavedJobs === 0
      ? "まずは気になる求人を1件入れて、判断の土台を作りましょう。"
      : upcomingActions.length > 0
        ? "今日のToDoに入っているものから順に見れば十分です。"
        : latestAnalysisCount < dashboardJobs.length
          ? "まだ解析前の求人があります。気になる1件だけ進めましょう。"
          : "保存した求人の中から、動く価値が高いものだけ順に見返しましょう。";

  const nextStepBody =
    totalSavedJobs === 0
      ? "公開基準でも自分用基準でも大丈夫。最初の1件が入ると、比較の流れが一気に見えやすくなります。"
      : upcomingActions.length > 0
        ? "全部を同時に動かす必要はありません。次の予定があるものから順に触れば進められます。"
        : latestAnalysisCount < dashboardJobs.length
          ? "ランクが付くと残すべき求人が見えやすくなります。まとめてやらなくて大丈夫です。"
          : "比較・応募・基準見直しの順に動ける状態です。必要なものだけ整えれば十分です。";

  const nextStepHref = totalSavedJobs === 0 || latestAnalysisCount < dashboardJobs.length ? "/jobs/new" : "/jobs";
  const nextStepLabel = totalSavedJobs === 0 || latestAnalysisCount < dashboardJobs.length ? "ランク付けを始める" : "応募状況を見る";

  const todoItems = upcomingActions.map((job) => ({
    id: `todo-${job.id}`,
    title: `${job.title ?? "求人"} を確認する`,
    note: `${formatDateLabel(job.nextActionAt)} (${formatWeekdayLabel(job.nextActionAt)}) まで`
  }));

  if (todoItems.length < 4) {
    todoItems.push(
      {
        id: "todo-next-step",
        title: nextStepLabel,
        note: totalSavedJobs === 0 ? "まずは1件から" : "おすすめ順に進める"
      },
      {
        id: "todo-criteria",
        title: "判断基準を見直す",
        note: "迷いが増えたら更新"
      },
      {
        id: "todo-follow-up",
        title: "応募状況を見直す",
        note: "余裕がある日に整理"
      }
    );
  }

  const trendSeries = buildTrendSeries(dashboardJobsWithAnalyses.map((job) => job.createdAt).filter((value): value is Date => value instanceof Date));

  return (
    <DashboardMockExperience
      displayName={displayName}
      avatarUrl={user.image ?? null}
      analysisLabel={analysisLabel}
      analysisCount={analysisCount}
      analysisLimit={limits.maxAnalyses}
      planLabel={`${planSummary.label} ${planSummary.level}`}
      summaryCards={[
        {
          key: "applications",
          label: "応募数",
          value: `${appliedCount || totalSavedJobs}件`,
          note: `保存求人 ${totalSavedJobs}件`,
          tone: "green",
          icon: "briefcase"
        },
        {
          key: "documents",
          label: "書類選考 通過",
          value: `${screeningCount}件`,
          note: `解析済み ${latestAnalysisCount}件`,
          tone: "blue",
          icon: "document"
        },
        {
          key: "interviews",
          label: "面接予定",
          value: `${interviewCount}件`,
          note: upcomingActions.length > 0 ? `今週の予定あり` : "次の予定を整理",
          tone: "orange",
          icon: "interview"
        },
        {
          key: "offers",
          label: "内定",
          value: `${offerCount}件`,
          note: offerCount > 0 ? "最終確認へ" : "先週比 ±0",
          tone: "red",
          icon: "verified"
        }
      ]}
      progressPercent={progressPercent}
      progressMessage={getProgressMessage(progressPercent)}
      progressSubtext={getProgressSubtext(progressPercent)}
      progressItems={[
        { key: "search", label: "求人検索", value: searchPercent, tone: "green" },
        { key: "apply", label: "応募", value: applyPercent, tone: "mint" },
        { key: "documents", label: "書類選考", value: documentsPercent, tone: "yellow" },
        { key: "interview", label: "面接", value: interviewPercent, tone: "orange" },
        { key: "offer", label: "内定", value: offerPercent, tone: "red" }
      ]}
      trendPoints={trendSeries.points}
      trendLabels={trendSeries.labels}
      todoItems={todoItems.slice(0, 4)}
      skillMatches={[
        { id: "skill-python", label: "Python", score: 85 },
        { id: "skill-aws", label: "AWS", score: 80 },
        { id: "skill-go", label: "Go", score: 70 }
      ]}
      recommendedJobs={recommendedJobs}
      recentActivities={recentActivities}
      nextStepTitle={nextStepTitle}
      nextStepBody={nextStepBody}
      nextStepHref={nextStepHref}
      nextStepLabel={nextStepLabel}
    />
  );
}

