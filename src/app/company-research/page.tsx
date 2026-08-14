import { and, desc, eq, gte } from "drizzle-orm";

import { CompanyResearchMockExperience } from "@/components/company-research/company-research-mock-experience";
import { buildCompanyResearchResultFromQuery } from "@/lib/company-research/generate-result";
import type { CompanyResearchChatMessage, CompanyResearchReport } from "@/lib/company-research/types";
import { requireUser } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { companyResearches, jobs } from "@/lib/db/schema";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const planCopy: Record<Plan, string> = {
  free: "フリープラン",
  starter: "スタータープラン",
  plus: "プラスプラン",
  pro: "プロプラン"
};

const initialHistoryLimit = 8;

function parseJsonOr<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getDisplayName(name: string | null | undefined) {
  if (!name) return "山田 花子";
  const japaneseNameMatch = name.match(/\(([^)]+)\)/);
  const displayName = japaneseNameMatch?.[1] ?? name;
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

type SearchParams = Record<string, string | string[] | undefined>;

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CompanyResearchPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [user, session, params] = await Promise.all([requireUser(), getSession(), searchParams]);
  const plan = await getUserPlan(user.id);
  const planLimits = PLAN_LIMITS[plan];

  const displayName = getDisplayName(session?.user?.name ?? user.name);
  const initialJobId = (getSingle(params?.jobId) ?? "").trim();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [researchRowsForLimit, savedResearches, checkedJobs] = await Promise.all([
    db
      .select({ id: companyResearches.id })
      .from(companyResearches)
      .where(
        plan === "free"
          ? eq(companyResearches.userId, user.id)
          : and(eq(companyResearches.userId, user.id), gte(companyResearches.createdAt, monthStart))
      )
      .limit(Number.isFinite(planLimits.maxCompanyResearches) ? planLimits.maxCompanyResearches : 1),
    db
      .select()
      .from(companyResearches)
      .where(eq(companyResearches.userId, user.id))
      .orderBy(desc(companyResearches.createdAt))
      .limit(initialHistoryLimit + 1),
    db
      .select({ id: jobs.id, companyName: jobs.companyName, websiteUrl: jobs.sourceUrl })
      .from(jobs)
      .where(eq(jobs.userId, user.id))
      .orderBy(desc(jobs.updatedAt))
  ]);

  const remainingResearchCount = Number.isFinite(planLimits.maxCompanyResearches)
    ? Math.max(0, planLimits.maxCompanyResearches - researchRowsForLimit.length)
    : 999;
  const initialResearchRows = savedResearches.slice(0, initialHistoryLimit);

  return (
    <CompanyResearchMockExperience
      displayName={displayName}
      profileInitial={displayName.slice(0, 1) || "ら"}
      planLabel={planCopy[plan]}
      remainingResearchCount={remainingResearchCount}
      initialJobId={initialJobId}
      checkedJobs={checkedJobs.map((item) => ({
        id: item.id,
        companyName: item.companyName ?? "会社名未取得",
        websiteUrl: item.websiteUrl ?? ""
      }))}
      initialHasMoreResearches={savedResearches.length > initialHistoryLimit}
      initialResearches={initialResearchRows.map((item) => {
        const fallback = buildCompanyResearchResultFromQuery(item.query);
        return {
          id: item.id,
          companyName: item.companyName,
          researchedAt: item.createdAt.toISOString(),
          status: item.status,
          query: item.query,
          result: {
            companyName: item.companyName,
            industry: item.industry,
            location: item.location,
            size: item.size,
            summary: item.summary,
            keyPoints: parseJsonOr<string[]>(item.keyPointsJson, fallback.keyPoints),
            interviewHints: parseJsonOr<string[]>(item.interviewHintsJson, fallback.interviewHints),
            nextActions: parseJsonOr<string[]>(item.nextActionsJson, fallback.nextActions),
            report: parseJsonOr<CompanyResearchReport>(item.reportJson, fallback.report),
            chatMessages: parseJsonOr<CompanyResearchChatMessage[]>(item.chatMessagesJson, fallback.chatMessages)
          }
        };
      })}
    />
  );
}
