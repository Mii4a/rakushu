import { desc, eq, getTableColumns, sql } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/require-user";
import {
  CRITERIA_CATEGORIES,
  criteriaToRankSettings,
  ensureDefaultPublicCriteria,
  listPublicCriteria,
  parseTags,
  type CriteriaSort
} from "@/lib/criteria/templates";
import { db } from "@/lib/db/client";
import { criteriaTemplates, criteriaUsageEvents, savedCriteriaTemplates } from "@/lib/db/schema";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { CriteriaMockExperience } from "@/components/criteria/criteria-mock-experience";

export const dynamic = "force-dynamic";

const planCopy: Record<Plan, string> = {
  free: "フリープラン",
  starter: "スタータープラン",
  plus: "プラスプラン",
  pro: "プロプラン"
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

const criteriaTemplateColumns = getTableColumns(criteriaTemplates);

type SearchParams = Record<string, string | string[] | undefined>;

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createParamsObject(params: SearchParams) {
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
  return `/criteria?${next.toString()}`;
}

function buildOwnedHref(params: URLSearchParams, selectedId: string) {
  const next = new URLSearchParams(params);
  next.set("owned", selectedId);
  next.delete("selected");
  return `/criteria?${next.toString()}`;
}

export default async function CriteriaPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
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
        keyword: keyword || undefined
      })
    : [];

  const [savedRows, usageRows, publicCountRows, ownedTemplates] = await Promise.all([
    db
      .select({
        templateId: savedCriteriaTemplates.templateId
      })
      .from(savedCriteriaTemplates)
      .where(eq(savedCriteriaTemplates.userId, user.id)),
    db
      .select({
        templateId: criteriaUsageEvents.templateId
      })
      .from(criteriaUsageEvents)
      .where(eq(criteriaUsageEvents.userId, user.id)),
    db.select({ count: sql<number>`count(*)` }).from(criteriaTemplates).where(eq(criteriaTemplates.visibility, "public")),
    db
      .select({
        ...criteriaTemplateColumns
      })
      .from(criteriaTemplates)
      .where(eq(criteriaTemplates.userId, user.id))
      .orderBy(desc(criteriaTemplates.updatedAt))
  ]);

  const savedIds = new Set(savedRows.map((row) => row.templateId));
  const usedIds = new Set(usageRows.map((row) => row.templateId));
  const selectedTemplate = templates.find((template) => template.id === selectedParam) ?? templates[0] ?? null;
  const ownedOnlyTemplates = ownedTemplates.filter((template) => template.visibility === "private");
  const selectedOwnedTemplate = ownedOnlyTemplates.find((template) => template.id === ownedParam) ?? ownedOnlyTemplates[0] ?? null;
  const showingOwnedTemplate = Boolean(ownedParam || (!selectedParam && selectedOwnedTemplate));
  const activePublicTemplate = showingOwnedTemplate ? null : selectedTemplate;
  const activeOwnedTemplate = showingOwnedTemplate ? selectedOwnedTemplate : null;
  const activeTemplate = activeOwnedTemplate ?? activePublicTemplate;
  const selectedSettings = activeTemplate ? criteriaToRankSettings(activeTemplate) : null;
  const selectedTags = activeTemplate ? parseTags(activeTemplate.tagsJson) : [];
  const displayName = session?.user?.name ?? user.name ?? "ゲスト";
  const profileInitial = displayName.slice(0, 1) || "ら";
  const selectedParams = createParamsObject(params);

  const publicCards = templates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    href: buildSelectedHref(selectedParams, template.id),
    selected: activePublicTemplate?.id === template.id,
    categoryLabel: categoryLabel[template.category] ?? template.category,
    categoryAccent: categoryAccent[template.category] ?? "bg-slate-100 text-slate-600",
    tags: parseTags(template.tagsJson),
    isSaved: savedIds.has(template.id),
    isUsed: usedIds.has(template.id),
    viewCount: template.viewCount,
    saveCount: template.saveCount,
    cloneCount: template.cloneCount,
    useCount: template.useCount
  }));

  const ownedCards = ownedOnlyTemplates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    href: buildOwnedHref(selectedParams, template.id),
    selected: activeOwnedTemplate?.id === template.id,
    categoryLabel: categoryLabel[template.category] ?? template.category,
    categoryAccent: categoryAccent[template.category] ?? "bg-slate-100 text-slate-600",
    tags: parseTags(template.tagsJson)
  }));

  const scoreItems = [
    { label: "応募可能性", percentage: 25, emphasis: "最重視", icon: "timer" },
    { label: "職種一致", percentage: 20, emphasis: "高", icon: "briefcase" },
    { label: "働き方", percentage: 15, emphasis: "中", icon: "sparkles" },
    { label: "勤務地・通勤時間", percentage: 15, emphasis: "中", icon: "map" },
    { label: "年収", percentage: 10, emphasis: "中", icon: "gift" },
    { label: "スキル一致", percentage: 10, emphasis: "中", icon: "shield" },
    { label: "避けたい条件", percentage: 5, emphasis: "補助", icon: "trend" }
  ] as const;

  return (
    <CriteriaMockExperience
      displayName={displayName}
      profileInitial={profileInitial}
      planLabel={planCopy[plan]}
      activeTemplateTitle={activeTemplate?.title ?? "表示できる判断基準がまだありません"}
      activeTemplateDescription={
        activeTemplate?.description ??
        "公開基準を選ぶか、自分用基準を作成すると、ここに AI が参照する判断軸の詳細が表示されます。"
      }
      activeTemplateCategory={activeTemplate?.category ?? "balanced"}
      activeTemplateCategoryLabel={activeTemplate ? categoryLabel[activeTemplate.category] ?? activeTemplate.category : "基準未選択"}
      activeTemplateCategoryAccent={activeTemplate ? categoryAccent[activeTemplate.category] ?? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-600"}
      activeTemplateTags={selectedTags}
      publicTemplateCount={publicCountRows[0]?.count ?? 0}
      ownedTemplateCount={ownedOnlyTemplates.length}
      savedTemplateCount={savedIds.size}
      usedTemplateCount={usedIds.size}
      canBrowse={criteriaLimits.canBrowsePublic}
      canCreatePrivate={criteriaLimits.canCreatePrivate}
      canEditOwned={Boolean(activeOwnedTemplate?.editable && criteriaLimits.canEditClonedTemplates)}
      activeTemplateId={activeTemplate?.id ?? null}
      activeTemplateViewCount={activeTemplate?.viewCount ?? 0}
      activeTemplateSaveCount={activeTemplate?.saveCount ?? 0}
      activeTemplateCloneCount={activeTemplate?.cloneCount ?? 0}
      activeTemplateUseCount={activeTemplate?.useCount ?? 0}
      activeTemplateIsOwned={Boolean(activeOwnedTemplate)}
      fixedOvertime={{
        a: selectedSettings?.fixedOvertime.aMaxHours ?? 10,
        b: selectedSettings?.fixedOvertime.bMaxHours ?? 20,
        c: selectedSettings?.fixedOvertime.cMaxHours ?? 30,
        d: selectedSettings?.fixedOvertime.dMaxHours ?? 45
      }}
      annualHolidays={{
        s: selectedSettings?.annualHolidays.sMinDays ?? 125,
        a: selectedSettings?.annualHolidays.aMinDays ?? 115,
        b: selectedSettings?.annualHolidays.bMinDays ?? 105,
        c: selectedSettings?.annualHolidays.cMinDays ?? 95,
        d: selectedSettings?.annualHolidays.dMinDays ?? 85
      }}
      bonus={{
        s: selectedSettings?.bonus.sMinCount ?? 3,
        a: selectedSettings?.bonus.aMinCount ?? 2,
        b: selectedSettings?.bonus.bMinCount ?? 2,
        c: selectedSettings?.bonus.cMinCount ?? 1
      }}
      retirement={{
        withAllowance: selectedSettings?.retirementAllowance.withAllowanceRank ?? "A",
        withoutAllowance: selectedSettings?.retirementAllowance.withoutAllowanceRank ?? "D"
      }}
      ownedFormDefaults={
        activeOwnedTemplate
          ? {
              templateId: activeOwnedTemplate.id,
              title: activeOwnedTemplate.title,
              description: activeOwnedTemplate.description,
              category: CRITERIA_CATEGORIES.includes(activeOwnedTemplate.category as never) ? activeOwnedTemplate.category : "balanced",
              tags: selectedTags.join("、")
            }
          : null
      }
      publicTemplates={publicCards}
      ownedTemplates={ownedCards}
      scoreItems={scoreItems}
    />
  );
}
