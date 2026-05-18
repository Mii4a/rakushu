import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { and, eq, sql } from "drizzle-orm";
import {
  ArrowRight,
  Bookmark,
  Copy,
  Eye,
  FileSearch,
  Filter,
  Flame,
  Home,
  Lock,
  Medal,
  MoreHorizontal,
  Plane,
  Scale,
  Search,
  Settings,
  Sparkles,
  SquareUserRound,
  PencilLine,
  Plus
} from "lucide-react";

import { clonePublicCriteriaAction, createPrivateCriteriaAction, recordCriteriaUseAction, savePublicCriteriaAction, updateOwnedCriteriaAction } from "@/actions/criteria-actions";
import { RakumoAvatar } from "@/components/rakumo/RakumoAvatar";
import { getSession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/require-user";
import { CRITERIA_CATEGORIES, criteriaToRankSettings, ensureDefaultPublicCriteria, listPublicCriteria, parseTags, type CriteriaSort, incrementCriteriaMetric } from "@/lib/criteria/templates";
import { db } from "@/lib/db/client";
import { criteriaTemplates, criteriaUsageEvents, savedCriteriaTemplates } from "@/lib/db/schema";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { CONFIGURABLE_RANKS } from "@/lib/analysis";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey, getWeekKey } from "@/lib/usage/counters";

export const dynamic = "force-dynamic";

const SORT_LABELS: Record<CriteriaSort, string> = {
  popular: "人気順",
  new: "新着順",
  saves: "保存数順",
  uses: "利用数順"
};

const planCopy: Record<Plan, { label: string; level: string }> = {
  free: { label: "フリープラン", level: "Lv.1" },
  starter: { label: "スタータープラン", level: "Lv.2" },
  plus: { label: "プラスプラン", level: "Lv.3" },
  pro: { label: "プロプラン", level: "Lv.4" }
};

const categoryLabel: Record<string, string> = {
  balanced: "バランス型",
  "work-life": "ワークライフバランス",
  salary: "高年収",
  growth: "成長企業",
  stability: "安定志向"
};

const categoryAccent: Record<string, string> = {
  balanced: "bg-[#eef8ff] text-[#2c74d6]",
  "work-life": "bg-[#effbe8] text-[#219d44]",
  salary: "bg-[#fff5eb] text-[#d78124]",
  growth: "bg-[#eef4ff] text-[#4c7ae7]",
  stability: "bg-[#f3eefc] text-[#8b63d9]"
};

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createParamsObject(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = getSingle(value);
    if (single) search.set(key, single);
  }
  return search;
}

function buildSelectedHref(params: URLSearchParams, selectedId: string) {
  const next = new URLSearchParams(params);
  next.set("selected", selectedId);
  next.delete("owned");
  return `/criteria?${next.toString()}#criteria-detail`;
}

function buildOwnedHref(params: URLSearchParams, selectedId: string) {
  const next = new URLSearchParams(params);
  next.set("owned", selectedId);
  next.delete("selected");
  return `/criteria?${next.toString()}#criteria-detail`;
}

function compactNumber(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }
  return `${value}`;
}

function getPlanBadge(plan: Plan) {
  if (plan === "free") return "Free";
  if (plan === "starter") return "Starter";
  if (plan === "plus") return "Plus";
  return "Pro";
}

export default async function CriteriaPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [user, session] = await Promise.all([requireUser(), getSession()]);
  const plan = await getUserPlan(user.id);
  const criteriaLimits = PLAN_LIMITS[plan].criteria;
  const params = (await searchParams) ?? {};
  const sort = (getSingle(params.sort) ?? "popular") as CriteriaSort;
  const category = (getSingle(params.category) ?? "").trim();
  const tag = (getSingle(params.tag) ?? "").trim();
  const keyword = (getSingle(params.q) ?? "").trim();
  const selectedParam = (getSingle(params.selected) ?? "").trim();
  const ownedParam = (getSingle(params.owned) ?? "").trim();

  if (criteriaLimits.canBrowsePublic) {
    await ensureDefaultPublicCriteria(user.id);
  }

  const templates = criteriaLimits.canBrowsePublic
    ? await listPublicCriteria({
        sort,
        category: category || undefined,
        tag: tag || undefined,
        keyword: keyword || undefined
      })
    : [];

  const [savedRows, usageRows, publicCountRows, ownedTemplates] = await Promise.all([
    db.query.savedCriteriaTemplates.findMany({
      where: eq(savedCriteriaTemplates.userId, user.id)
    }),
    db.query.criteriaUsageEvents.findMany({
      where: and(eq(criteriaUsageEvents.userId, user.id), eq(criteriaUsageEvents.eventType, "use"))
    }),
    db.select({ count: sql<number>`count(*)` }).from(criteriaTemplates).where(eq(criteriaTemplates.visibility, "public")),
    db.query.criteriaTemplates.findMany({
      where: and(eq(criteriaTemplates.userId, user.id), eq(criteriaTemplates.visibility, "private")),
      orderBy: (table, { desc }) => [desc(table.updatedAt)]
    })
  ]);

  const savedIds = new Set(savedRows.map((row) => row.templateId));
  const usedIds = new Set(usageRows.map((row) => row.templateId));
  const selectedTemplate = templates.find((template) => template.id === selectedParam) ?? templates[0] ?? null;
  const selectedOwnedTemplate = ownedTemplates.find((template) => template.id === ownedParam) ?? ownedTemplates[0] ?? null;
  const showingOwnedTemplate = Boolean(ownedParam || (!selectedParam && ownedTemplates.length > 0 && templates.length === 0));

  if (selectedParam && selectedTemplate) {
    await incrementCriteriaMetric(selectedTemplate, "viewCount");
    selectedTemplate.viewCount += 1;
  }

  const selectedParams = createParamsObject(params);
  const activePublicTemplate = showingOwnedTemplate ? null : selectedTemplate;
  const activeOwnedTemplate = showingOwnedTemplate ? selectedOwnedTemplate : ownedParam ? selectedOwnedTemplate : null;
  const activeTemplate = activeOwnedTemplate ?? activePublicTemplate;
  const selectedSettings = activeTemplate ? criteriaToRankSettings(activeTemplate) : null;
  const selectedTags = activeTemplate ? parseTags(activeTemplate.tagsJson) : [];
  const displayName = session?.user?.name ?? "プロフィール";
  const profileInitial = displayName.slice(0, 1) || "ら";
  const planSummary = planCopy[plan];
  const limits = PLAN_LIMITS[plan];
  const periodKey = limits.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const analysisCount = await getAnalysisCount(user.id, periodKey);
  const canBrowse = criteriaLimits.canBrowsePublic;

  return (
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="criteria" note="ランク付けから求人整理まで、同じ流れで進められます。" />

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
            </Link>
          </div>

          <div className="space-y-4 lg:space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[30px] border border-rakumo-border bg-white px-5 py-6 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.24)] md:px-7">
                <h1 className="text-[2.2rem] font-black tracking-tight text-[#111111] md:text-[2.8rem]">判断基準</h1>
                <p className="mt-3 text-base leading-8 text-rakumo-ink/75">公開されている判断基準を閲覧し、求人のランク付けに活用できます。</p>
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
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#d5ebcf] bg-[#f8fff5] text-[#28a541]">
                    <Scale className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">公開基準数</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{publicCountRows[0]?.count ?? 0}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#b7e7ca] bg-[#f2fff7] text-[#18a35b]">
                    <Bookmark className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">保存済み</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{savedIds.size}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#d7e1ff] bg-[#f6f8ff] text-[#4d6fe6]">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">利用中</p>
                    <p className="text-[2rem] font-black text-rakumo-ink">{usedIds.size}<span className="ml-1 text-lg font-semibold">件</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-[22px] border border-rakumo-border bg-white px-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[#d5ebcf] bg-[#f8fff5] text-[#28a541]">
                    <SquareUserRound className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rakumo-ink/65">閲覧可能プラン</p>
                    <p className="text-[2rem] font-black text-[#28a541]">{getPlanBadge(plan)}<span className="ml-1 text-lg font-semibold text-rakumo-ink">プラン</span></p>
                  </div>
                </div>
              </div>
            </div>

            {(criteriaLimits.canCreatePrivate || ownedTemplates.length > 0) ? (
              <div className="rounded-[28px] border border-rakumo-border bg-white p-4 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.2)] md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[1.25rem] font-black text-rakumo-ink">自分用基準</p>
                    <p className="mt-2 text-sm leading-7 text-rakumo-ink/72">コピーした基準や自作基準をここで育てられます。賞与・退職金の見方も個別に調整できます。</p>
                  </div>
                  {criteriaLimits.canCreatePrivate ? (
                    <form action={createPrivateCriteriaAction}>
                      <button type="submit" className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[#1ea54c] bg-white px-4 text-sm font-bold text-[#1ea54c]">
                        <Plus className="mr-2 size-4" />
                        自分用基準を作る
                      </button>
                    </form>
                  ) : (
                    <Link href="/pricing" className="inline-flex h-11 items-center justify-center rounded-[16px] border border-rakumo-border bg-white px-4 text-sm font-bold text-rakumo-ink">
                      Plus以上で作成可能
                    </Link>
                  )}
                </div>

                {ownedTemplates.length > 0 ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {ownedTemplates.map((template) => {
                      const href = buildOwnedHref(selectedParams, template.id);
                      const tags = parseTags(template.tagsJson);
                      const selected = activeOwnedTemplate?.id === template.id;

                      return (
                        <article key={template.id} className={`rounded-[22px] border p-4 transition ${selected ? "border-[#1fb15a] bg-[#fbfff9]" : "border-rakumo-border bg-white"}`}>
                          <Link href={href} className="block">
                            <div className="flex items-start gap-3">
                              <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#eaf9ef] text-[#1ea54c]" : "bg-[#f4f7ff] text-[#4f77e8]"}`}>
                                <PencilLine className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-lg font-black text-rakumo-ink">{template.title}</p>
                                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${categoryAccent[template.category] ?? "bg-slate-100 text-slate-600"}`}>
                                    {categoryLabel[template.category] ?? template.category}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-rakumo-ink/70">{template.description}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {tags.slice(0, 4).map((tagItem) => (
                                    <span key={tagItem} className="rounded-full border border-rakumo-border px-2 py-1 text-xs font-semibold text-rakumo-ink/70">
                                      {tagItem}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-rakumo-border px-4 py-5 text-sm leading-7 text-rakumo-ink/70">
                    まだ自分用基準はありません。公開基準をコピーするか、新規作成して調整を始めてください。
                  </div>
                )}
              </div>
            ) : null}

            {!canBrowse ? (
              <div className="rounded-[28px] border border-rakumo-border bg-white p-5 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.22)]">
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
                  公開基準の閲覧は Starter プラン以上で利用できます。
                  <Link href="/pricing" className="ml-2 font-bold underline">
                    料金プランを見る
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <form className="rounded-[28px] border border-rakumo-border bg-white p-4 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.2)] md:p-5">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_210px_170px_auto] xl:items-end">
                    <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                      <span className="sr-only">キーワード検索</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                        <input name="q" defaultValue={keyword} placeholder="キーワード検索（例：固定残業、年間休日）" className="h-12 w-full rounded-[18px] border border-rakumo-border bg-white pl-12 pr-4 text-base text-rakumo-ink outline-none focus:border-rakumo-mint focus:ring-4 focus:ring-rakumo-mint/25" />
                      </div>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                      <span>カテゴリ</span>
                      <select name="category" defaultValue={category} className="field-input h-12">
                        <option value="">すべてのカテゴリ</option>
                        {CRITERIA_CATEGORIES.map((item) => (
                          <option key={item} value={item}>
                            {categoryLabel[item] ?? item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-rakumo-ink/75">
                      <span>並び順</span>
                      <select name="sort" defaultValue={sort} className="field-input h-12">
                        {Object.entries(SORT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-end gap-3">
                      <button type="submit" className="inline-flex h-12 items-center justify-center rounded-[16px] border border-rakumo-border bg-white px-6 text-base font-bold text-rakumo-ink">
                        <Filter className="mr-2 size-4" />
                        絞り込み
                      </button>
                      <Link href="/criteria" className="text-base font-bold text-[#20a257]">
                        クリア
                      </Link>
                    </div>
                  </div>
                </form>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.92fr)]">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-3 rounded-[18px] border border-[#caefd8] bg-[#fbfff9] px-4 py-3 text-sm font-semibold text-rakumo-ink">
                      <RakumoAvatar tone="good" className="h-11 w-11 border-[#d9f0dd]" />
                      人気順やタグで絞ると、自分に合う基準を見つけやすいよ！
                    </div>

                    {templates.length === 0 ? (
                      <div className="rounded-[24px] border border-rakumo-border bg-white p-5 shadow-[0_16px_32px_-28px_rgba(45,58,74,0.22)]">
                        <div className="flex items-center gap-4">
                          <div className="flex size-16 items-center justify-center rounded-full border border-rakumo-border bg-[#fafcfb] text-rakumo-ink/55">
                            <Search className="size-8" />
                          </div>
                          <div>
                            <p className="text-[1.35rem] font-black text-rakumo-ink">条件に合う判断基準が見つかりません</p>
                            <p className="mt-2 text-sm leading-7 text-rakumo-ink/70">検索条件や絞り込み条件を見直してお試しください。</p>
                          </div>
                        </div>
                        <div className="mt-5 flex justify-end">
                          <Link href="/criteria" className="inline-flex items-center justify-center rounded-[16px] border border-[#1ca354] bg-white px-5 py-3 text-base font-bold text-[#1ca354]">
                            条件をリセット
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <>
                        {templates.map((template) => {
                          const tags = parseTags(template.tagsJson);
                          const selected = selectedTemplate?.id === template.id;
                          const cardHref = buildSelectedHref(selectedParams, template.id);
                          const locked = plan === "free" && !criteriaLimits.canBrowsePublic;
                          const isSaved = savedIds.has(template.id);
                          const isUsed = usedIds.has(template.id);

                          return (
                            <article key={template.id} className={`rounded-[24px] border bg-white p-4 shadow-[0_16px_32px_-28px_rgba(45,58,74,0.22)] transition ${selected ? "border-[#1fb15a] shadow-[0_22px_44px_-34px_rgba(31,177,90,0.55)]" : "border-rakumo-border"}`}>
                              <Link href={cardHref} className="block rounded-[18px]">
                                <div className="flex items-start gap-4">
                                  <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#effbe8] text-[#21a148]" : "bg-[#f4f7ff] text-[#4f77e8]"}`}>
                                    {locked ? <Lock className="size-7" /> : <Medal className="size-7" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-[1.35rem] font-black leading-tight tracking-tight text-rakumo-ink md:text-[1.6rem]">{template.title}</p>
                                        <p className="mt-2 text-sm leading-7 text-rakumo-ink/72">{template.description}</p>
                                      </div>
                                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${categoryAccent[template.category] ?? "bg-slate-100 text-slate-600"}`}>
                                        {categoryLabel[template.category] ?? template.category}
                                      </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {tags.slice(0, 4).map((item) => (
                                        <span key={item} className="rounded-full border border-rakumo-border px-3 py-1 text-xs font-semibold text-rakumo-ink/70">
                                          {item}
                                        </span>
                                      ))}
                                    </div>

                                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                                      <div className="rounded-[14px] border border-rakumo-border px-2 py-2">
                                        <div className="flex items-center justify-center gap-1 text-[#f38a21]"><Flame className="size-4" /><span className="text-xs font-semibold">人気</span></div>
                                        <p className="mt-1 font-black text-rakumo-ink">{compactNumber(template.popularityScore)}</p>
                                      </div>
                                      <div className="rounded-[14px] border border-rakumo-border px-2 py-2">
                                        <div className="flex items-center justify-center gap-1 text-rakumo-ink/60"><Eye className="size-4" /><span className="text-xs font-semibold">閲覧</span></div>
                                        <p className="mt-1 font-black text-rakumo-ink">{compactNumber(template.viewCount)}</p>
                                      </div>
                                      <div className="rounded-[14px] border border-rakumo-border px-2 py-2">
                                        <div className="flex items-center justify-center gap-1 text-rakumo-ink/60"><Bookmark className="size-4" /><span className="text-xs font-semibold">保存</span></div>
                                        <p className="mt-1 font-black text-rakumo-ink">{compactNumber(template.saveCount)}</p>
                                      </div>
                                      <div className="rounded-[14px] border border-rakumo-border px-2 py-2">
                                        <div className="flex items-center justify-center gap-1 text-rakumo-ink/60"><Sparkles className="size-4" /><span className="text-xs font-semibold">利用</span></div>
                                        <p className="mt-1 font-black text-rakumo-ink">{compactNumber(template.useCount)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <form action={savePublicCriteriaAction.bind(null, template.id)}>
                                  <button type="submit" className={`inline-flex h-10 items-center justify-center rounded-[14px] px-4 text-sm font-bold ${isSaved ? "bg-[#1ea54c] text-white" : "border border-rakumo-border bg-white text-rakumo-ink"}`}>
                                    <Bookmark className="mr-2 size-4" />
                                    {isSaved ? "保存済み" : "保存する"}
                                  </button>
                                </form>
                                <form action={clonePublicCriteriaAction.bind(null, template.id)}>
                                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-[14px] border border-rakumo-border bg-white px-4 text-sm font-bold text-rakumo-ink">
                                    <Copy className="mr-2 size-4" />
                                    自分用にコピー
                                  </button>
                                </form>
                                <Link href="/jobs/new" className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[#1ea54c] bg-white px-4 text-sm font-bold text-[#1ea54c]">
                                  この基準でランク付け
                                </Link>
                                <Link href={cardHref} className="ml-auto inline-flex h-10 items-center justify-center rounded-[14px] px-2 text-sm font-bold text-[#1ea54c]">
                                  詳細
                                  <ArrowRight className="ml-1 size-4" />
                                </Link>
                              </div>

                              {locked ? (
                                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-rakumo-ink/60">
                                  <Lock className="size-4" />
                                  Plus以上で閲覧可能
                                </div>
                              ) : null}
                            </article>
                          );
                        })}

                        <div className="rounded-[24px] border border-[#d7f0de] bg-white px-5 py-5 shadow-[0_16px_32px_-28px_rgba(45,58,74,0.22)]">
                          <div className="flex items-center gap-4">
                            <div className="flex size-16 items-center justify-center rounded-full border border-rakumo-border bg-[#fafcfb] text-rakumo-ink/55">
                              <Search className="size-8" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[1.35rem] font-black text-rakumo-ink">条件に合う判断基準が見つかりません</p>
                              <p className="mt-2 text-sm leading-7 text-rakumo-ink/70">検索条件やタグの組み合わせを見直してみてください。</p>
                            </div>
                            <Link href="/criteria" className="inline-flex items-center justify-center rounded-[16px] border border-[#1ca354] bg-white px-5 py-3 text-base font-bold text-[#1ca354]">
                              条件をリセット
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div id="criteria-detail" className="space-y-4 rounded-[28px] border border-rakumo-border bg-white p-4 shadow-[0_18px_36px_-28px_rgba(45,58,74,0.22)] md:p-5">
                    {activeTemplate ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-4">
                            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#effbe8] text-[#21a148]">
                              {activeOwnedTemplate ? <PencilLine className="size-7" /> : <Medal className="size-7" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[1.55rem] font-black leading-tight text-rakumo-ink md:text-[1.85rem]">{activeTemplate.title}</p>
                                <span className={`rounded-full px-3 py-1 text-sm font-bold ${categoryAccent[activeTemplate.category] ?? "bg-slate-100 text-slate-600"}`}>
                                  {categoryLabel[activeTemplate.category] ?? activeTemplate.category}
                                </span>
                                {activeOwnedTemplate ? <span className="rounded-full bg-[#eef8ff] px-3 py-1 text-sm font-bold text-[#2c74d6]">自分用</span> : null}
                              </div>
                              <p className="mt-2 text-sm text-rakumo-ink/70">
                                {activeOwnedTemplate ? "作成者: あなた" : `作成者: ${activePublicTemplate?.user.name ?? "不明"}`}
                              </p>
                            </div>
                          </div>
                          <button type="button" className="inline-flex size-10 items-center justify-center rounded-full border border-rakumo-border text-rakumo-ink/65">
                            <MoreHorizontal className="size-5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selectedTags.map((item) => (
                            <span key={item} className="rounded-full border border-rakumo-border px-3 py-1 text-xs font-semibold text-rakumo-ink/70">
                              {item}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-4 gap-3 rounded-[18px] border border-rakumo-border bg-white p-3 text-center text-sm">
                          <div>
                            <p className="text-rakumo-ink/55">閲覧</p>
                            <p className="mt-1 text-[1.45rem] font-black text-rakumo-ink">{activeTemplate.viewCount}</p>
                          </div>
                          <div>
                            <p className="text-rakumo-ink/55">保存</p>
                            <p className="mt-1 text-[1.45rem] font-black text-rakumo-ink">{activeTemplate.saveCount}</p>
                          </div>
                          <div>
                            <p className="text-rakumo-ink/55">複製</p>
                            <p className="mt-1 text-[1.45rem] font-black text-rakumo-ink">{activeTemplate.cloneCount}</p>
                          </div>
                          <div>
                            <p className="text-rakumo-ink/55">利用</p>
                            <p className="mt-1 text-[1.45rem] font-black text-rakumo-ink">{activeTemplate.useCount}</p>
                          </div>
                        </div>

                        {activePublicTemplate ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <form action={savePublicCriteriaAction.bind(null, activePublicTemplate.id)}>
                              <button type="submit" className={`inline-flex h-12 w-full items-center justify-center rounded-[16px] px-4 text-base font-bold ${savedIds.has(activePublicTemplate.id) ? "bg-[#1ea54c] text-white" : "border border-rakumo-border bg-white text-rakumo-ink"}`}>
                                <Bookmark className="mr-2 size-4" />
                                {savedIds.has(activePublicTemplate.id) ? "保存済み" : "保存する"}
                              </button>
                            </form>
                            <form action={clonePublicCriteriaAction.bind(null, activePublicTemplate.id)}>
                              <button type="submit" className="inline-flex h-12 w-full items-center justify-center rounded-[16px] border border-rakumo-border bg-white px-4 text-base font-bold text-rakumo-ink">
                                <Copy className="mr-2 size-4" />
                                自分用にコピー
                              </button>
                            </form>
                            <form action={recordCriteriaUseAction.bind(null, activePublicTemplate.id)}>
                              <button type="submit" className="inline-flex h-12 w-full items-center justify-center rounded-[16px] border border-rakumo-border bg-white px-4 text-base font-bold text-rakumo-ink">
                                <Sparkles className="mr-2 size-4" />
                                利用を記録
                              </button>
                            </form>
                            <Link href="/jobs/new" className="inline-flex h-12 w-full items-center justify-center rounded-[16px] border border-[#1ea54c] bg-white px-4 text-base font-bold text-[#1ea54c]">
                              この基準でランク付け
                            </Link>
                            <Link href="/jobs" className="sm:col-span-2 inline-flex h-12 w-full items-center justify-center rounded-[16px] border border-rakumo-border bg-white px-4 text-base font-bold text-rakumo-ink">
                              求人整理へ
                            </Link>
                          </div>
                        ) : null}

                        {activeOwnedTemplate ? (
                          <form action={updateOwnedCriteriaAction} className="space-y-4 rounded-[18px] border border-rakumo-border bg-[#fcfffd] p-4">
                            <input type="hidden" name="templateId" value={activeOwnedTemplate.id} />
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="space-y-2">
                                <span className="text-sm font-semibold text-rakumo-ink/80">基準名</span>
                                <input name="title" defaultValue={activeOwnedTemplate.title} maxLength={60} className="field-input" />
                              </label>
                              <label className="space-y-2">
                                <span className="text-sm font-semibold text-rakumo-ink/80">カテゴリ</span>
                                <select name="category" defaultValue={activeOwnedTemplate.category} className="field-input">
                                  {CRITERIA_CATEGORIES.map((item) => (
                                    <option key={item} value={item}>
                                      {categoryLabel[item] ?? item}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-rakumo-ink/80">説明</span>
                              <textarea name="description" defaultValue={activeOwnedTemplate.description} maxLength={240} rows={3} className="field-input min-h-28 py-3" />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-rakumo-ink/80">タグ</span>
                              <input name="tags" defaultValue={selectedTags.join("、")} maxLength={160} className="field-input" />
                              <p className="text-xs text-rakumo-ink/60">`、` または `,` 区切りで最大8個まで。</p>
                            </label>

                            <div>
                              <p className="text-sm font-bold text-rakumo-ink">固定残業ランク</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <input name="overtimeAMaxHours" type="number" min={0} defaultValue={selectedSettings?.fixedOvertime.aMaxHours} className="field-input" />
                                <input name="overtimeBMaxHours" type="number" min={0} defaultValue={selectedSettings?.fixedOvertime.bMaxHours} className="field-input" />
                                <input name="overtimeCMaxHours" type="number" min={0} defaultValue={selectedSettings?.fixedOvertime.cMaxHours} className="field-input" />
                                <input name="overtimeDMaxHours" type="number" min={0} defaultValue={selectedSettings?.fixedOvertime.dMaxHours} className="field-input" />
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-bold text-rakumo-ink">年間休日ランク</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                <input name="holidaySMinDays" type="number" min={0} defaultValue={selectedSettings?.annualHolidays.sMinDays} className="field-input" />
                                <input name="holidayAMinDays" type="number" min={0} defaultValue={selectedSettings?.annualHolidays.aMinDays} className="field-input" />
                                <input name="holidayBMinDays" type="number" min={0} defaultValue={selectedSettings?.annualHolidays.bMinDays} className="field-input" />
                                <input name="holidayCMinDays" type="number" min={0} defaultValue={selectedSettings?.annualHolidays.cMinDays} className="field-input" />
                                <input name="holidayDMinDays" type="number" min={0} defaultValue={selectedSettings?.annualHolidays.dMinDays} className="field-input" />
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-bold text-rakumo-ink">賞与制度ランク</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <input name="bonusSMinCount" type="number" min={1} defaultValue={selectedSettings?.bonus.sMinCount} className="field-input" />
                                <input name="bonusAMinCount" type="number" min={1} defaultValue={selectedSettings?.bonus.aMinCount} className="field-input" />
                                <input name="bonusBMinCount" type="number" min={1} defaultValue={selectedSettings?.bonus.bMinCount} className="field-input" />
                                <input name="bonusCMinCount" type="number" min={1} defaultValue={selectedSettings?.bonus.cMinCount} className="field-input" />
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-bold text-rakumo-ink">退職金制度ランク</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <select name="retirementWithAllowanceRank" defaultValue={selectedSettings?.retirementAllowance.withAllowanceRank} className="field-input">
                                  {CONFIGURABLE_RANKS.map((rank) => (
                                    <option key={rank} value={rank}>
                                      制度あり: {rank}
                                    </option>
                                  ))}
                                </select>
                                <select name="retirementWithoutAllowanceRank" defaultValue={selectedSettings?.retirementAllowance.withoutAllowanceRank} className="field-input">
                                  {CONFIGURABLE_RANKS.map((rank) => (
                                    <option key={rank} value={rank}>
                                      制度なし: {rank}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button type="submit" className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#1ea54c] px-5 text-base font-bold text-white">
                                <Sparkles className="mr-2 size-4" />
                                自分用基準を保存
                              </button>
                              <Link href="/jobs/new" className="inline-flex h-12 items-center justify-center rounded-[16px] border border-[#1ea54c] bg-white px-5 text-base font-bold text-[#1ea54c]">
                                この基準でランク付け
                              </Link>
                            </div>
                          </form>
                        ) : null}

                        <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                          <p className="text-[1.1rem] font-black text-rakumo-ink">1. 固定残業ランク閾値</p>
                          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[14px] border border-rakumo-border text-center text-sm">
                            <div className="bg-[#edf9e8] px-2 py-3">
                              <p className="font-black text-[#219d44]">A</p>
                              <p className="mt-2">{selectedSettings?.fixedOvertime.aMaxHours}時間未満</p>
                            </div>
                            <div className="bg-[#f6faeb] px-2 py-3">
                              <p className="font-black text-[#60ad31]">B</p>
                              <p className="mt-2">{selectedSettings?.fixedOvertime.aMaxHours}〜{selectedSettings?.fixedOvertime.bMaxHours}時間未満</p>
                            </div>
                            <div className="bg-[#fff6ea] px-2 py-3">
                              <p className="font-black text-[#da9129]">C</p>
                              <p className="mt-2">{selectedSettings?.fixedOvertime.bMaxHours}〜{selectedSettings?.fixedOvertime.cMaxHours}時間未満</p>
                            </div>
                            <div className="bg-[#fff1ea] px-2 py-3">
                              <p className="font-black text-[#da6041]">D</p>
                              <p className="mt-2">{selectedSettings?.fixedOvertime.cMaxHours}時間以上</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                          <p className="text-[1.1rem] font-black text-rakumo-ink">2. 年間休日ランク閾値</p>
                          <div className="mt-3 grid grid-cols-5 overflow-hidden rounded-[14px] border border-rakumo-border text-center text-sm">
                            <div className="bg-[#edf6ff] px-2 py-3">
                              <p className="font-black text-[#2368e2]">S</p>
                              <p className="mt-2">{selectedSettings?.annualHolidays.sMinDays}日以上</p>
                            </div>
                            <div className="bg-[#edf9e8] px-2 py-3">
                              <p className="font-black text-[#219d44]">A</p>
                              <p className="mt-2">{selectedSettings?.annualHolidays.aMinDays}〜{(selectedSettings?.annualHolidays.sMinDays ?? 0) - 1}日</p>
                            </div>
                            <div className="bg-[#f6faeb] px-2 py-3">
                              <p className="font-black text-[#60ad31]">B</p>
                              <p className="mt-2">{selectedSettings?.annualHolidays.bMinDays}〜{(selectedSettings?.annualHolidays.aMinDays ?? 0) - 1}日</p>
                            </div>
                            <div className="bg-[#fff6ea] px-2 py-3">
                              <p className="font-black text-[#da9129]">C</p>
                              <p className="mt-2">{selectedSettings?.annualHolidays.cMinDays}〜{(selectedSettings?.annualHolidays.bMinDays ?? 0) - 1}日</p>
                            </div>
                            <div className="bg-[#fff1ea] px-2 py-3">
                              <p className="font-black text-[#da6041]">D</p>
                              <p className="mt-2">{(selectedSettings?.annualHolidays.cMinDays ?? 0) - 1}日以下</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                          <p className="text-[1.1rem] font-black text-rakumo-ink">3. 休日制度・賞与・退職金・福利厚生の見方</p>
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-[14px] border border-rakumo-border p-3">
                              <p className="text-sm font-bold text-rakumo-ink">賞与回数の目安</p>
                              <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[12px] border border-rakumo-border text-center text-sm">
                                <div className="bg-[#edf6ff] px-2 py-3">
                                  <p className="font-black text-[#2368e2]">S</p>
                                  <p className="mt-2">{selectedSettings?.bonus.sMinCount}回以上</p>
                                </div>
                                <div className="bg-[#edf9e8] px-2 py-3">
                                  <p className="font-black text-[#219d44]">A</p>
                                  <p className="mt-2">{selectedSettings?.bonus.aMinCount}回以上</p>
                                </div>
                                <div className="bg-[#f6faeb] px-2 py-3">
                                  <p className="font-black text-[#60ad31]">B</p>
                                  <p className="mt-2">{selectedSettings?.bonus.bMinCount}回以上</p>
                                </div>
                                <div className="bg-[#fff6ea] px-2 py-3">
                                  <p className="font-black text-[#da9129]">C</p>
                                  <p className="mt-2">{selectedSettings?.bonus.cMinCount}回以上</p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[14px] border border-rakumo-border p-3">
                              <p className="text-sm font-bold text-rakumo-ink">退職金制度の目安</p>
                              <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-[12px] border border-rakumo-border text-center text-sm">
                                <div className="bg-[#edf9e8] px-2 py-3">
                                  <p className="font-black text-[#219d44]">制度あり</p>
                                  <p className="mt-2">ランク {selectedSettings?.retirementAllowance.withAllowanceRank}</p>
                                </div>
                                <div className="bg-[#fff1ea] px-2 py-3">
                                  <p className="font-black text-[#da6041]">制度なし</p>
                                  <p className="mt-2">ランク {selectedSettings?.retirementAllowance.withoutAllowanceRank}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            {["完全週休2日制", "各種休暇あり", "賞与条件の明記", "退職金制度あり", "育休・産休制度", "フレックスタイム制"].map((item) => (
                              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-[#d7eedf] bg-[#fbfff9] px-3 py-2 font-semibold text-rakumo-ink">
                                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#1ea54c] text-white">✓</span>
                                {item}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-sm leading-7 text-rakumo-ink/70">
                            休日制度、賞与制度、退職金制度、福利厚生の明記がそろっているほど評価が高くなります。賞与はここで設定された回数基準を使い、業績連動の注記がある場合は一段慎重に見ます。
                          </p>
                          <p className="mt-2 text-sm leading-7 text-rakumo-ink/70">退職金制度は「あり」「なし」にそれぞれ設定されたランクをそのまま使い、不明は保留として扱います。</p>
                        </div>

                        <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[1.1rem] font-black text-rakumo-ink">4. この基準の使いどころ</p>
                              <p className="mt-3 text-sm leading-7 text-rakumo-ink/72">{activeTemplate.description}</p>
                              <p className="mt-3 text-sm leading-7 text-rakumo-ink/72">長く働き続けられる環境かどうかを、固定残業時間と年間休日を主軸に、賞与制度・退職金制度・福利厚生も含めて総合的に判断しやすい構成です。</p>
                            </div>
                            <RakumoAvatar tone="good" className="hidden h-20 w-20 border-[#d7eedf] md:block" />
                          </div>
                        </div>

                        {(plan === "free" || plan === "starter") ? (
                          <div className="rounded-[18px] border border-rakumo-border bg-white p-4">
                            <div className="flex items-center gap-3 text-sm text-rakumo-ink/70">
                              <Lock className="size-4" />
                              一部の詳細統計は Plus プラン以上でご利用いただけます。
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Link href="/pricing" className="inline-flex items-center gap-2 font-bold text-[#20a257]">
                                プランをアップグレード
                                <ArrowRight className="size-4" />
                              </Link>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="rounded-[24px] border border-rakumo-border bg-white p-5 text-center text-rakumo-ink/70">
                        表示する判断基準を選ぶと、ここに詳細が出ます。
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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
        <Link href="/criteria" className="dashboard-mobile-nav-item dashboard-mobile-nav-item-active">
          <Scale className="size-5" />
          <span>判断基準</span>
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
