import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { EstimateCommuteButton } from "@/components/estimate-commute-button";
import { eq, sql } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  FileSearch,
  Home,
  Pencil,
  Plane,
  Scale,
  Search,
  Settings,
  Trash2
} from "lucide-react";

import type { ParsedJob } from "@/lib/analysis";
import { JobDeleteForm } from "@/components/job-delete-form";
import { RerunAnalysisButton } from "@/components/rerun-analysis-button";
import { getChecklistItems } from "@/components/jobs/JobCheckList";
import { MissingItemStatusExplainer } from "@/components/missing-item-status-explainer";
import { RakumoAvatar } from "@/components/rakumo/RakumoAvatar";
import { SelectionProgressForm } from "@/components/selection-progress-form";
import { RakumoEmptyState } from "@/components/rakumo/RakumoEmptyState";
import { buildMissingItemSummary, getMissingItemLabel, type MissingItemKey, type MissingItemSummary } from "@/lib/analysis/missing-items";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { requireUser } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";
import { formatCommuteRange, formatCommuteRangeDetail, getCommuteDataKindLabel, getCommuteDataKindTone, getCommuteTone } from "@/lib/commute/fields";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey, getWeekKey } from "@/lib/usage/counters";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = {
  created_desc: "保存日が新しい順",
  created_asc: "保存日が古い順",
  company_asc: "会社名A→Z",
  company_desc: "会社名Z→A",
  rank_desc: "総合ランクが高い順",
  holidays_desc: "年間休日が多い順"
} as const;

type SortKey = keyof typeof SORT_OPTIONS;

const planCopy: Record<Plan, { label: string; level: string }> = {
  free: { label: "フリープラン", level: "Lv.1" },
  starter: { label: "スタータープラン", level: "Lv.2" },
  plus: { label: "プラスプラン", level: "Lv.3" },
  pro: { label: "プロプラン", level: "Lv.4" }
};

const rankScore: Record<string, number> = {
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1
};

const statusLabel: Record<string, string> = {
  saved: "保存中",
  applied: "応募済み",
  screening: "選考中",
  interview: "面接予定",
  offer: "内定",
  rejected: "見送り"
};

const statusPillClassName: Record<string, string> = {
  saved: "border-[#4db65b]/55 text-[#1aa143] bg-[#f8fff8]",
  applied: "border-[#4d85ff]/45 text-[#2668e8] bg-[#f5f8ff]",
  screening: "border-[#2f78ff]/45 text-[#2f78ff] bg-[#f5f8ff]",
  interview: "border-[#5aa1ff]/45 text-[#2d7bff] bg-[#f4f9ff]",
  offer: "border-[#17991a]/45 text-[#17991a] bg-[#f7fff7]",
  rejected: "border-slate-300 text-slate-500 bg-white"
};

function toSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function coerceDate(value: Date | number | string | null | undefined) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date | number | string | null | undefined) {
  const normalized = coerceDate(date);
  if (!normalized) return "未設定";
  const year = normalized.getUTCFullYear();
  const month = String(normalized.getUTCMonth() + 1).padStart(2, "0");
  const day = String(normalized.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatDateInputValue(value: Date | number | string | null | undefined): string {
  const normalized = coerceDate(value);
  if (!normalized) return "";
  const year = normalized.getUTCFullYear();
  const month = String(normalized.getUTCMonth() + 1).padStart(2, "0");
  const day = String(normalized.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMetricValue(value: string | number | null | undefined, suffix = "") {
  if (value == null || value === "") return "－";
  return `${value}${suffix}`;
}

function getDisplayRank(rank: string | null | undefined) {
  return rank && rank !== "UNKNOWN" ? rank : "－";
}

function getRankCardClassName(rank: string | null | undefined) {
  if (rank === "S" || rank === "A") return "from-[#eefbea] to-[#f9fff7] text-[#34a63e]";
  if (rank === "B") return "from-[#eef8ff] to-[#fbfeff] text-[#2078d5]";
  if (rank === "C") return "from-[#fff7e8] to-[#fffdf7] text-[#d28b14]";
  if (rank === "D" || rank === "E") return "from-[#fff3ea] to-[#fffaf7] text-[#f07a23]";
  return "from-slate-100 to-slate-50 text-slate-500";
}

function createParamsObject(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = toSingle(value);
    if (single) search.set(key, single);
  }
  return search;
}

function buildSelectedHref(params: URLSearchParams, selectedId: string) {
  const next = new URLSearchParams(params);
  next.set("selected", selectedId);
  return `/jobs?${next.toString()}#saved-jobs-detail`;
}

function hasMissingItem(summary: MissingItemSummary, key: MissingItemKey) {
  return summary.missingInRawText.includes(key);
}

function hasAmbiguousItem(summary: MissingItemSummary, key: MissingItemKey) {
  return summary.ambiguousButVisible.includes(key);
}

function getMissingAwareText(summary: MissingItemSummary, key: MissingItemKey, fallback = "不明") {
  if (hasMissingItem(summary, key)) return "本文未記載";
  if (hasAmbiguousItem(summary, key)) return "要確認";
  return fallback;
}

function buildAnalysisNotes(parsed: ParsedJob | null, warnings: string[], missingSummary?: MissingItemSummary) {
  if (!parsed) {
    return ["まだ解析結果がありません。必要になったタイミングで再解析できます。"];
  }

  const summary = missingSummary ?? buildMissingItemSummary(parsed, null);

  const notes = [
    parsed.annualHolidays.value != null
      ? `年間休日は ${parsed.annualHolidays.value} 日です。`
      : hasMissingItem(summary, "annualHolidays")
        ? "年間休日の記載が本文に見当たりませんでした。"
        : "年間休日は要確認です。",
    parsed.holidayType.value
      ? `休日制度は「${parsed.holidayType.value}」です。`
      : hasMissingItem(summary, "holidayType")
        ? "休日制度の明記が本文に見当たりませんでした。"
        : "休日制度は要確認です。",
    parsed.bonusCount?.status === "none"
      ? "賞与制度は見当たりませんでした。"
      : parsed.bonusCount?.value != null
        ? `賞与制度は年 ${parsed.bonusCount.value} 回${parsed.bonusPerformanceLinked?.status === "found" ? "で、業績により変動します。" : "です。"}`
        : hasMissingItem(summary, "bonusCount")
          ? "賞与制度の回数は本文に見当たりませんでした。"
          : "賞与制度の回数は要確認です。",
    parsed.retirementAllowance?.status === "found"
      ? "退職金制度の記載があります。"
      : parsed.retirementAllowance?.status === "none"
        ? "退職金制度は見当たりませんでした。"
        : hasMissingItem(summary, "retirementAllowance")
          ? "退職金制度の明記が本文に見当たりませんでした。"
          : "退職金制度は要確認です。",
    parsed.fixedOvertimeHours.status === "none"
      ? "固定残業制度は見当たりませんでした。"
      : parsed.fixedOvertimeHours.value != null
        ? `固定残業は ${parsed.fixedOvertimeHours.value} 時間です。`
        : hasMissingItem(summary, "fixedOvertimeHours")
          ? "固定残業時間の明記が本文に見当たりませんでした。"
          : "固定残業時間は要確認です。",
    parsed.benefits.value && parsed.benefits.value.length > 0
      ? `福利厚生は ${parsed.benefits.value.length} 項目見つかっています。`
      : hasMissingItem(summary, "benefits")
        ? "福利厚生の記載が本文ではかなり少なめです。"
        : "福利厚生は少なめ、または読み取りが難しい状態です。"
  ];

  if (warnings.length > 0) {
    notes.push(`注意点は ${warnings.length} 件あります。先に気になるポイントを見返すと判断しやすいです。`);
  }

  if (summary.thinInput) {
    notes.push("この求人は採点に必要な情報が不足しているため、未記載項目は最低点候補として扱います。");
  }

  return notes;
}

function buildRankReasonLabel(summary: MissingItemSummary, warnings: string[]) {
  if (summary.missingInRawText.length > 0) {
    return "低評価の主因: 本文未記載項目が多い";
  }
  if (warnings.length >= 3) {
    return "低評価の主因: 気になる表現が多い";
  }
  return "低評価の主因: 条件が弱い";
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [{ deleteJobAction }, user, session] = await Promise.all([
    import("@/actions/job-actions"),
    requireUser(),
    getSession()
  ]);
  const plan = await getUserPlan(user.id);

  const params = (await searchParams) ?? {};
  const q = (toSingle(params.q) ?? "").trim().toLowerCase();
  const totalRank = (toSingle(params.totalRank) ?? "").trim().toUpperCase();
  const minHolidayRaw = (toSingle(params.minHoliday) ?? "").trim();
  const selectedParam = (toSingle(params.selected) ?? "").trim();
  const sortInput = (toSingle(params.sort) ?? "created_desc").trim() as SortKey;
  const sort = sortInput in SORT_OPTIONS ? sortInput : "created_desc";
  const minHoliday = minHolidayRaw ? Number(minHolidayRaw) : Number.NaN;

  const limits = PLAN_LIMITS[plan];
  const periodKey = limits.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const [analysisCount, jobCountResult, jobList] = await Promise.all([
    getAnalysisCount(user.id, periodKey),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, user.id)),
    db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        companyName: jobs.companyName,
        title: jobs.title,
        sourceName: jobs.sourceName,
        sourceUrl: jobs.sourceUrl,
        workAddress: jobs.workAddress,
        nearestStation: jobs.nearestStation,
        commuteMinutes: jobs.commuteMinutes,
        commuteMinutesMin: jobs.commuteMinutesMin,
        commuteMinutesMax: jobs.commuteMinutesMax,
        commuteMinutesTypical: jobs.commuteMinutesTypical,
        commuteDataKind: jobs.commuteDataKind,
        selectionStatus: jobs.selectionStatus,
        nextActionAt: jobs.nextActionAt,
        selectionMemo: jobs.selectionMemo,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt
      })
      .from(jobs)
      .where(eq(jobs.userId, user.id))
      .orderBy(sql`${jobs.createdAt} desc`)
  ]);

  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(jobList.map((job) => job.id));
  const totalSavedJobs = jobCountResult[0]?.count ?? 0;
  const displayName = session?.user?.name ?? "プロフィール";
  const profileInitial = displayName.slice(0, 1) || "ら";
  const planSummary = planCopy[plan];

  const jobListWithAnalyses = jobList.map((job) => ({
    ...job,
    latest: latestAnalysesByJobId.get(job.id) ?? null,
    parsed: parseStoredParsedJob(latestAnalysesByJobId.get(job.id)?.evidenceJson, `jobs-page:${job.id}`)
  }));

  const filteredList = jobListWithAnalyses.filter((job) => {
    const displayCompanyName = job.parsed?.companyName.value ?? job.companyName ?? "";
    const displayTitle = job.parsed?.title.value ?? job.title ?? "";
    const matchedQuery =
      !q ||
      [displayCompanyName, displayTitle, job.sourceName ?? ""]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    const matchedRank = !totalRank || job.latest?.totalRank === totalRank;
    const matchedHoliday = !Number.isFinite(minHoliday) || (job.parsed?.annualHolidays.value != null && job.parsed.annualHolidays.value >= minHoliday);
    return matchedQuery && matchedRank && matchedHoliday;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    const aName = a.parsed?.companyName.value ?? a.companyName ?? "";
    const bName = b.parsed?.companyName.value ?? b.companyName ?? "";

    switch (sort) {
      case "created_asc":
        return (coerceDate(a.createdAt)?.getTime() ?? 0) - (coerceDate(b.createdAt)?.getTime() ?? 0);
      case "company_asc":
        return aName.localeCompare(bName, "ja");
      case "company_desc":
        return bName.localeCompare(aName, "ja");
      case "rank_desc":
        return (rankScore[b.latest?.totalRank ?? ""] ?? 0) - (rankScore[a.latest?.totalRank ?? ""] ?? 0);
      case "holidays_desc":
        return (b.parsed?.annualHolidays.value ?? -1) - (a.parsed?.annualHolidays.value ?? -1);
      case "created_desc":
      default:
        return (coerceDate(b.createdAt)?.getTime() ?? 0) - (coerceDate(a.createdAt)?.getTime() ?? 0);
    }
  });

  const selectedJobBase = sortedList.find((job) => job.id === selectedParam) ?? sortedList[0] ?? null;
  const selectedJobDetailRows = selectedJobBase
    ? await db
        .select({
          id: jobs.id,
          rawText: jobs.rawText
        })
        .from(jobs)
        .where(eq(jobs.id, selectedJobBase.id))
        .limit(1)
    : [];
  const selectedJobRawText = selectedJobDetailRows[0]?.rawText ?? null;
  const selectedJob = selectedJobBase ? { ...selectedJobBase, rawText: selectedJobRawText } : null;
  const selectedParams = createParamsObject(params);

  const aRankCount = jobListWithAnalyses.filter((job) => job.latest?.totalRank === "A").length;
  const warningJobCount = jobListWithAnalyses.filter((job) => (job.parsed?.warnings.value?.length ?? 0) > 0).length;
  const nextActionCount = jobListWithAnalyses.filter((job) => job.nextActionAt != null).length;

  const selectedWarnings = selectedJob?.parsed?.warnings.value ?? [];
  const selectedMissingSummary = selectedJob?.parsed ? buildMissingItemSummary(selectedJob.parsed, selectedJob.rawText) : null;
  const selectedChecklist = getChecklistItems(selectedJob?.parsed ?? null, selectedJob?.rawText ?? null);
  const selectedAnalysisNotes = buildAnalysisNotes(selectedJob?.parsed ?? null, selectedWarnings, selectedMissingSummary ?? undefined);
  const selectedRankReasonLabel = selectedMissingSummary ? buildRankReasonLabel(selectedMissingSummary, selectedWarnings) : null;
  const selectedDetailRankItems = selectedJob
    ? [
        { label: "総合ランク", value: getDisplayRank(selectedJob.latest?.totalRank) },
        { label: "固定残業", value: getDisplayRank(selectedJob.latest?.salaryRank) },
        { label: "年間休日", value: getDisplayRank(selectedJob.latest?.holidayRank) },
        { label: "休日制度", value: getDisplayRank(selectedJob.latest?.holidayTypeRank) },
        { label: "賞与制度", value: getDisplayRank(selectedJob.latest?.bonusRank) },
        { label: "退職金制度", value: getDisplayRank(selectedJob.latest?.retirementAllowanceRank) },
        { label: "福利厚生", value: getDisplayRank(selectedJob.latest?.benefitRank) }
      ]
    : [];

  return (
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="jobs" note="ランク付けから求人整理まで、同じ流れで進められます。" />

        <div className="dashboard-main">
          <div className="dashboard-mobile-top">
            <div className="dashboard-mobile-brand">
              <RakumoAvatar tone="neutral" className="h-12 w-12 border-[#d7eedf]" />
              <p className="text-[1.8rem] font-black tracking-[0.06em] text-[#18a35b]">らくしゅう</p>
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

          <div className="space-y-4 lg:space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_470px]">
              <div className="rounded-[30px] border border-rakumo-border bg-white px-5 py-6 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.24)] md:px-7">
                <p className="eyebrow">Saved jobs</p>
                <h1 className="mt-1 text-[2.2rem] font-black tracking-tight text-[#111111] md:text-[2.8rem]">保存した求人</h1>
                <p className="mt-3 text-base leading-8 text-rakumo-ink/75">あとで見返したい求人を整理・管理できます。</p>
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

            <div className="rounded-[28px] border border-rakumo-border bg-white p-4 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.2)] md:p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#b7e7ca] bg-[#f2fff7] text-[#18a35b]">
                    <Bookmark className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">保存件数</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{totalSavedJobs}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#d5ebcf] bg-[#f8fff5] text-[#28a541]">
                    <Award className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">Aランク件数</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{aRankCount}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#ffd6bf] bg-[#fff8f2] text-[#f0872d]">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">警告あり件数</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{warningJobCount}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#c7ddff] bg-[#f6faff] text-[#2668e8]">
                    <CalendarDays className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">次アクション予定</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{nextActionCount}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>
              </div>
            </div>

            <form className="rounded-[28px] border border-rakumo-border bg-white p-4 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.2)] md:p-5">
              <input type="hidden" name="selected" value={selectedJob?.id ?? ""} />
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_180px_170px_220px_auto] xl:items-end">
                <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                  <span className="sr-only">キーワード検索</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input name="q" defaultValue={q} placeholder="会社名・職種・情報元で検索" className="h-12 w-full rounded-[18px] border border-rakumo-border bg-white pl-12 pr-4 text-base text-rakumo-ink outline-none focus:border-rakumo-mint focus:ring-4 focus:ring-rakumo-mint/25" />
                  </div>
                </label>

                <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                  <span>総合ランク</span>
                  <select name="totalRank" defaultValue={totalRank} className="field-input h-12">
                    <option value="">すべて</option>
                    <option value="S">S</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                  <span>最低年間休日</span>
                  <input name="minHoliday" type="number" min={0} step={1} defaultValue={Number.isFinite(minHoliday) ? minHoliday : ""} placeholder="例: 120" className="field-input h-12" />
                </label>

                <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                  <span>並び順</span>
                  <select name="sort" defaultValue={sort} className="field-input h-12">
                    {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end gap-3">
                  <button type="submit" className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#20b15f_0%,#129f51_100%)] px-8 text-base font-black text-white shadow-[0_18px_30px_-22px_rgba(18,159,81,0.75)]">
                    絞り込み
                  </button>
                  <Link href="/jobs" className="text-base font-bold text-[#20a257]">
                    クリア
                  </Link>
                </div>
              </div>
            </form>

            {jobListWithAnalyses.length === 0 ? (
              <div className="rounded-[28px] border border-rakumo-border bg-white p-5 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.22)]">
                <RakumoEmptyState
                  title="まだ求人がないね"
                  body="まずは気になる求人を1つ入れてみよう。完璧に整理しなくて大丈夫。雑に入れてから整えよう。"
                  ctaHref="/jobs/new"
                  ctaLabel="求人を入力してみる"
                />
              </div>
            ) : sortedList.length === 0 ? (
              <div className="rounded-[28px] border border-rakumo-border bg-white p-5 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.22)]">
                <RakumoEmptyState
                  title="今は当てはまる求人が見つからないね"
                  body="検索条件を少しゆるめると、見返したい求人がまた出てきます。"
                  ctaHref="/jobs"
                  ctaLabel="条件をゆるめる"
                  tone="deadpan"
                />
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.94fr)]">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-3 rounded-[18px] border border-[#caefd8] bg-[#fbfff9] px-4 py-3 text-sm font-semibold text-rakumo-ink">
                    <RakumoAvatar tone="good" className="h-11 w-11 border-[#d9f0dd]" />
                    条件の近い求人から見比べると整理しやすいよ ✨
                  </div>

                  <div className="mb-4 rounded-[20px] border border-[#dce7ee] bg-[#f7fbfd] p-4 text-sm text-rakumo-ink/75">
                    <p className="font-bold text-rakumo-ink">表示の見方</p>
                    <p className="mt-2 leading-7">`本文未記載` は元の求人文に比較材料が見当たらない状態、`要確認` は書かれていそうでも自動整理がまだ不安定な状態です。</p>
                  </div>

                  {sortedList.map((job) => {
                    const displayCompanyName = job.parsed?.companyName.value ?? job.companyName ?? "会社名不明";
                    const displayTitle = job.parsed?.title.value ?? job.title ?? "職種不明";
                    const warnings = job.parsed?.warnings.value ?? [];
                    const selected = selectedJob?.id === job.id;
                    const cardHref = buildSelectedHref(selectedParams, job.id);
                    const annualHolidays = job.parsed?.annualHolidays.value != null ? `${job.parsed.annualHolidays.value}日` : "－";
                    const fixedOvertime =
                      job.parsed?.fixedOvertimeHours.status === "none"
                        ? "なし"
                        : job.parsed?.fixedOvertimeHours.value != null
                          ? `${job.parsed.fixedOvertimeHours.value}時間`
                          : "－";
                    const benefitsCount = job.parsed?.benefits.value?.length ?? 0;
                    const bonus =
                      job.parsed?.bonusCount?.status === "none"
                        ? "なし"
                        : job.parsed?.bonusCount?.value != null
                          ? `年${job.parsed.bonusCount.value}回${job.parsed?.bonusPerformanceLinked?.status === "found" ? "（業績連動）" : ""}`
                          : "－";
                    const quickItems = [
                      {
                        label: "通勤",
                        value: getCommuteDataKindLabel(job.commuteDataKind)
                          ? `${formatCommuteRange(job)} (${getCommuteDataKindLabel(job.commuteDataKind)})`
                          : formatCommuteRange(job),
                        tone: getCommuteTone(job)
                      },
                      { label: "年間休日", value: annualHolidays, tone: job.parsed?.annualHolidays.value != null && job.parsed.annualHolidays.value >= 120 ? "good" : "neutral" },
                      { label: "福利厚生", value: benefitsCount > 0 ? `${benefitsCount}件` : "－", tone: benefitsCount >= 4 ? "good" : benefitsCount >= 1 ? "neutral" : "neutral" },
                      { label: "固定残業", value: fixedOvertime, tone: warnings.some((warning) => warning.includes("残業")) ? "warn" : "good" },
                      { label: "休日制度", value: job.parsed?.holidayType.value ?? "－", tone: job.parsed?.holidayType.value === "完全週休2日制" ? "good" : "neutral" },
                      {
                        label: "賞与制度",
                        value: bonus,
                        tone:
                          job.parsed?.bonusCount?.value != null && job.parsed.bonusCount.value >= 2 && job.parsed?.bonusPerformanceLinked?.status !== "found"
                            ? "good"
                            : "neutral"
                      }
                    ];

                    return (
                      <article key={job.id} className={`rounded-[24px] border bg-white p-4 shadow-[0_16px_32px_-28px_rgba(45,58,74,0.22)] transition ${selected ? "border-[#1fb15a] shadow-[0_22px_44px_-34px_rgba(31,177,90,0.55)]" : "border-rakumo-border"}`}>
                        <div className="grid gap-4 xl:grid-cols-[auto_92px_minmax(0,1fr)_184px] xl:items-start">
                          <div className="pt-2">
                            <Link
                              href={cardHref}
                              aria-label={`${displayCompanyName} の詳細を表示`}
                              className={`flex size-10 items-center justify-center rounded-xl border transition hover:border-[#19ab57] hover:bg-[#f3fff7] ${selected ? "border-[#19ab57] bg-[#19ab57] text-white hover:bg-[#19ab57]" : "border-slate-300 bg-white text-transparent hover:text-[#19ab57]"}`}
                            >
                              <Check className="size-5" />
                            </Link>
                          </div>

                          <div className={`flex h-[82px] w-[82px] flex-col items-center justify-center rounded-[16px] bg-gradient-to-b ${getRankCardClassName(job.latest?.totalRank)}`}>
                            <p className="text-[2.35rem] font-black leading-none">{getDisplayRank(job.latest?.totalRank)}</p>
                            <p className="mt-1 text-[11px] font-bold">総合ランク</p>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link href={cardHref} className="text-[1.35rem] font-black leading-tight tracking-tight text-rakumo-ink hover:text-[#1ca354] md:text-[1.6rem]">
                                  {displayCompanyName}
                                </Link>
                                <p className="mt-1 text-base font-semibold text-rakumo-ink/85 md:text-lg">{displayTitle}</p>
                                <p className="mt-2 text-sm text-rakumo-ink/60">情報元: {job.sourceName ?? "未設定"} | 保存日: {formatDate(job.createdAt)}</p>
                              </div>
                              <span className={`inline-flex rounded-full border px-4 py-1 text-sm font-bold ${statusPillClassName[job.selectionStatus] ?? statusPillClassName.saved}`}>
                                {statusLabel[job.selectionStatus] ?? "保存中"}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 text-sm text-rakumo-ink/70">
                              {warnings.slice(0, 3).map((warning) => (
                                <span key={warning} className="rounded-full border border-[#ffcfad] bg-[#fff4ea] px-3 py-1 font-semibold text-[#f08126]">
                                  {warning}
                                </span>
                              ))}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3 text-base font-bold">
                              <Link href={cardHref} className="text-[#2b77ec]">
                                詳細
                              </Link>
                              <span className="text-slate-200">|</span>
                              <Link href={`/jobs/${job.id}/edit`} className="text-[#2b77ec]">
                                編集
                              </Link>
                              <span className="text-slate-200">|</span>
                              <JobDeleteForm
                                action={deleteJobAction}
                                jobId={job.id}
                                buttonClassName="text-[#ff4a4a]"
                                confirmMessage={`「${displayCompanyName}」を削除しますか？この操作は元に戻せません。`}
                              >
                                削除
                              </JobDeleteForm>
                            </div>
                          </div>

                          <div className="grid gap-2 rounded-[18px] border border-rakumo-border bg-white p-3 text-sm">
                            {quickItems.map((item) => (
                              <div key={item.label} className="flex items-center justify-between gap-3">
                                <span className="text-rakumo-ink/70">{item.label}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-right font-semibold leading-5 text-rakumo-ink">{item.value}</span>
                                  <span className={`inline-flex size-5 items-center justify-center rounded-full text-white ${item.tone === "warn" ? "bg-[#ff9a3f]" : item.tone === "good" ? "bg-[#20a257]" : "bg-slate-300"}`}>
                                    <Check className="size-3.5" />
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  <div className="flex items-center justify-between px-2 pt-1 text-base text-rakumo-ink/75">
                    <p>
                      1〜{sortedList.length}件を表示（全{jobListWithAnalyses.length}件）
                    </p>
                    <span className="inline-flex items-center gap-1 font-bold text-[#20a257]">
                      もっと見る
                      <ChevronDown className="size-4" />
                    </span>
                  </div>
                </div>

                <div id="saved-jobs-detail" className="space-y-4 rounded-[28px] border border-rakumo-border bg-white p-4 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.22)] md:p-5">
                  {selectedJob ? (
                    <>
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex gap-4">
                          <div className={`flex h-[84px] w-[84px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-gradient-to-b ${getRankCardClassName(selectedJob.latest?.totalRank)}`}>
                            <p className="text-[2.35rem] font-black leading-none">{getDisplayRank(selectedJob.latest?.totalRank)}</p>
                            <p className="mt-1 text-[11px] font-bold">総合ランク</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[1.55rem] font-black leading-tight text-rakumo-ink md:text-[1.85rem]">{selectedJob.parsed?.companyName.value ?? selectedJob.companyName ?? "会社名不明"}</p>
                            <p className="mt-1 text-base font-semibold text-rakumo-ink/80 md:text-lg">{selectedJob.parsed?.title.value ?? selectedJob.title ?? "職種不明"}</p>
                            <p className="mt-2 text-sm text-rakumo-ink/60">情報元: {selectedJob.sourceName ?? "未設定"} | 保存日: {formatDate(selectedJob.createdAt)}</p>
                            {selectedRankReasonLabel ? <p className="mt-2 text-sm font-semibold text-[#c7732a]">{selectedRankReasonLabel}</p> : null}
                          </div>
                        </div>
                        <span className={`inline-flex w-fit rounded-full border px-4 py-1 text-sm font-bold ${statusPillClassName[selectedJob.selectionStatus] ?? statusPillClassName.saved}`}>
                          {statusLabel[selectedJob.selectionStatus] ?? "保存中"}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {selectedDetailRankItems.map((item) => (
                          <div key={item.label} className="rounded-[16px] border border-rakumo-border bg-white px-3 py-4 text-center">
                            <p className="text-[11px] font-bold tracking-[0.12em] text-rakumo-ink/55">{item.label}</p>
                            <p className="mt-2 text-[1.55rem] font-black leading-none text-[#35a95a] md:text-[1.75rem]">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)]">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            ["勤務地住所", selectedJob.workAddress ?? "未設定"],
                            ["最寄り駅", selectedJob.nearestStation ?? "未設定"],
                            [
                              "通勤時間",
                              getCommuteDataKindLabel(selectedJob.commuteDataKind)
                                ? `${formatCommuteRangeDetail(selectedJob)} / ${getCommuteDataKindLabel(selectedJob.commuteDataKind)}`
                                : formatCommuteRangeDetail(selectedJob)
                            ],
                            [
                              "年間休日",
                              selectedJob.parsed?.annualHolidays.value != null
                                ? formatMetricValue(selectedJob.parsed.annualHolidays.value, "日")
                                : getMissingAwareText(selectedMissingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "annualHolidays")
                            ],
                            [
                              "賞与制度",
                              selectedJob.parsed?.bonusCount?.status === "none"
                                ? "なし"
                                : selectedJob.parsed?.bonusCount?.value != null
                                  ? `年${selectedJob.parsed.bonusCount.value}回${selectedJob.parsed?.bonusPerformanceLinked?.status === "found" ? "（業績連動）" : ""}`
                                  : getMissingAwareText(selectedMissingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "bonusCount")
                            ],
                            [
                              "退職金制度",
                              selectedJob.parsed?.retirementAllowance?.status === "found"
                                ? "あり"
                                : selectedJob.parsed?.retirementAllowance?.status === "none"
                                  ? "なし"
                                  : getMissingAwareText(selectedMissingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "retirementAllowance")
                            ],
                            [
                              "福利厚生",
                              (selectedJob.parsed?.benefits.value?.length ?? 0) > 0
                                ? formatMetricValue(selectedJob.parsed?.benefits.value?.length ?? 0, "件")
                                : hasMissingItem(selectedMissingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "benefits")
                                  ? "本文の情報が少ない"
                                  : "不明"
                            ],
                            [
                              "固定残業の有無",
                              selectedJob.parsed?.fixedOvertimeHours.status === "none"
                                ? "なし"
                                : selectedJob.parsed?.fixedOvertimeHours.value != null
                                  ? `あり (${selectedJob.parsed.fixedOvertimeHours.value}h)`
                                  : getMissingAwareText(selectedMissingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "fixedOvertimeHours")
                            ],
                            [
                              "休日制度",
                              selectedJob.parsed?.holidayType.value
                                ?? getMissingAwareText(selectedMissingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "holidayType")
                            ]
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-[18px] border border-rakumo-border bg-white p-4">
                              <p className="text-[11px] font-bold tracking-[0.12em] text-rakumo-ink/55">{label}</p>
                              <p className="mt-3 text-[1.4rem] font-black leading-tight text-rakumo-ink md:text-[1.65rem]">{value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-[18px] border border-rakumo-border bg-[#fbfdf8] p-4">
                          <MissingItemStatusExplainer title="求人結果の見方" className="mb-4 bg-white" />
                          {selectedMissingSummary?.thinInput ? (
                            <div className="mb-4 rounded-[16px] border border-[#ffd6bf] bg-[#fff7f1] p-4 text-sm text-rakumo-ink">
                              <p className="font-bold text-[#c7732a]">この求人は情報が薄めです</p>
                              <p className="mt-2 leading-6">採点に必要な情報の一部が本文に記載されていません。未記載項目は最低点候補として扱います。</p>
                              {selectedMissingSummary.missingInRawText.length > 0 ? (
                                <ul className="mt-3 space-y-1 leading-6 text-rakumo-ink/80">
                                  {selectedMissingSummary.missingInRawText.map((key) => (
                                    <li key={key}>・{getMissingItemLabel(key)}：本文未記載</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="text-sm font-bold text-rakumo-ink">解析要点</p>
                          <ul className="mt-3 space-y-2 text-sm leading-7 text-rakumo-ink/78">
                            {selectedAnalysisNotes.map((note) => (
                              <li key={note} className="flex gap-2">
                                <span>・</span>
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                        <p className="text-[1.25rem] font-black text-rakumo-ink">JobCheckList（求人チェックリスト）</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {selectedChecklist.map((item) => {
                            const iconClassName =
                              item.tone === "concern" || item.tone === "caution"
                                ? "bg-[#ff9a3f]"
                                : item.tone === "good"
                                  ? "bg-[#20a257]"
                                  : "bg-slate-300";
                            return (
                              <div key={item.label} className="flex items-center justify-between gap-3 rounded-[14px] border border-rakumo-border px-3 py-3 text-sm">
                                <div className="min-w-0">
                                  <p className="font-semibold text-rakumo-ink">{item.label}</p>
                                  <p className="mt-1 text-rakumo-ink/70">{item.value}</p>
                                </div>
                                <span className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white ${iconClassName}`}>
                                  <Check className="size-3.5" />
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                          <p className="text-[1.15rem] font-black text-rakumo-ink">気になるポイント</p>
                          {selectedWarnings.length > 0 ? (
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#f08126]">
                              {selectedWarnings.map((warning) => (
                                <li key={warning} className="flex gap-2">
                                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm leading-6 text-rakumo-ink/65">大きな警告は出ていません。必要なら詳細を再解析して見直せます。</p>
                          )}
                        </div>

                        <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                          <p className="text-[1.15rem] font-black text-rakumo-ink">選考進捗・メモ</p>
                          <div className="mt-4">
                            <SelectionProgressForm
                              jobId={selectedJob.id}
                              selectionStatus={selectedJob.selectionStatus}
                              nextActionDate={formatDateInputValue(selectedJob.nextActionAt)}
                              selectionMemo={selectedJob.selectionMemo ?? ""}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-1">
                          <RerunAnalysisButton
                            jobId={selectedJob.id}
                            buttonClassName="inline-flex h-[56px] w-full items-center justify-center rounded-[18px] border border-[#1ca354] bg-white px-5 text-lg font-bold text-[#1ca354]"
                          />
                        </div>
                        <EstimateCommuteButton jobId={selectedJob.id} />
                        <Link href={`/jobs/${selectedJob.id}/edit`} className="inline-flex h-[56px] items-center justify-center rounded-[18px] border border-[#1ca354] bg-white px-5 text-lg font-bold text-[#1ca354]">
                          <Pencil className="mr-2 size-5" />
                          編集画面へ
                        </Link>
                        <JobDeleteForm
                          action={deleteJobAction}
                          jobId={selectedJob.id}
                          buttonClassName="inline-flex h-[56px] w-full items-center justify-center rounded-[18px] border border-[#ff5a5a] bg-white px-5 text-lg font-bold text-[#ff4a4a]"
                          confirmMessage={`「${selectedJob.parsed?.companyName.value ?? selectedJob.companyName ?? "この求人"}」を削除しますか？この操作は元に戻せません。`}
                        >
                          <Trash2 className="mr-2 size-5" />
                          削除
                        </JobDeleteForm>
                      </div>
                    </>
                  ) : (
                    <RakumoEmptyState
                      title="見返す求人を選ぼう"
                      body="左側の求人を選ぶと、ランク結果と進捗管理がここにまとまって出ます。"
                      ctaHref="/jobs/new"
                      ctaLabel="求人を入力してみる"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-[24px] border border-rakumo-border bg-white px-4 py-4 text-sm leading-7 text-rakumo-ink/75 shadow-[0_14px_30px_-26px_rgba(45,58,74,0.2)] md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p>保存した求人が0件のときは「求人を入力してみる」空の状態が表示されます。</p>
                <p>フィルターの結果が0件のときは、該当なしの状態が表示されます。</p>
              </div>
              <Link href="/jobs/new" className="inline-flex items-center justify-center rounded-[18px] border border-[#1ca354] bg-white px-5 py-3 text-base font-bold text-[#1ca354]">
                求人を入力してみる
              </Link>
            </div>
          </div>
        </div>
      </div>

      <nav className="dashboard-mobile-nav">
        <Link href="/dashboard" className="dashboard-mobile-nav-item">
          <Home className="size-5" />
          <span>ホーム</span>
        </Link>
        <Link href="/jobs/new" className="dashboard-mobile-nav-item">
          <FileSearch className="size-5" />
          <span>ランク付け</span>
        </Link>
        <Link href="/jobs" className="dashboard-mobile-nav-item dashboard-mobile-nav-item-active">
          <Bookmark className="size-5" />
          <span>保存した求人</span>
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
