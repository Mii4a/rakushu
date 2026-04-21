"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseJobText, scoreParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserRankSettings } from "@/lib/subscription/rank-settings";
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey, getWeekKey, incrementAnalysisCount } from "@/lib/usage/counters";

export type JobActionState =
  | {
      status: "idle";
      code?: undefined;
      message?: undefined;
    }
  | {
      status: "success";
      code?: undefined;
      message?: undefined;
    }
  | {
      status: "error";
      code: "analysis_limit" | "job_limit" | "generic";
      message: string;
    };

const newJobSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  sourceName: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  rawText: z.string().trim().min(20, "求人本文は20文字以上入力してください")
});

class ActionLimitError extends Error {
  code: "analysis_limit" | "job_limit";

  constructor(code: "analysis_limit" | "job_limit", message: string) {
    super(message);
    this.code = code;
  }
}

async function enforceJobLimit(userId: string) {
  const plan = await getUserPlan(userId);
  const maxJobs = PLAN_LIMITS[plan].maxJobs;
  if (!Number.isFinite(maxJobs)) return;

  const result = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, userId));
  const currentCount = result[0]?.count ?? 0;

  if (currentCount >= maxJobs) {
    throw new ActionLimitError("job_limit", `無料プランの求人保存上限（${maxJobs}件）に達しています。`);
  }
}

async function enforceAnalysisLimit(userId: string) {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan];
  const periodKey = limit.analysisPeriod === "week" ? getWeekKey() : getMonthKey();
  const current = await getAnalysisCount(userId, periodKey);
  const periodLabel = limit.analysisPeriod === "week" ? "今週" : "今月";

  if (current >= limit.maxAnalyses) {
    throw new ActionLimitError("analysis_limit", `${periodLabel}の解析上限（${limit.maxAnalyses}件）に達しています。`);
  }
}

export async function createJobAction(_: JobActionState | undefined, formData: FormData): Promise<JobActionState> {
  const user = await requireUser();

  const parsedForm = newJobSchema.safeParse({
    companyName: formData.get("companyName")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    sourceName: formData.get("sourceName")?.toString() ?? "",
    sourceUrl: formData.get("sourceUrl")?.toString() ?? "",
    rawText: formData.get("rawText")?.toString() ?? ""
  });

  if (!parsedForm.success) {
    return {
      status: "error",
      code: "generic",
      message: parsedForm.error.issues[0]?.message ?? "入力値が不正です"
    };
  }

  try {
    await enforceJobLimit(user.id);
    await enforceAnalysisLimit(user.id);
  } catch (error) {
    if (error instanceof ActionLimitError) {
      return {
        status: "error",
        code: error.code,
        message: error.message
      };
    }
    return {
      status: "error",
      code: "generic",
      message: "求人の保存に失敗しました。"
    };
  }

  const now = new Date();
  const jobId = crypto.randomUUID();
  const analysisId = crypto.randomUUID();

  const parsed = parseJobText(parsedForm.data.rawText);
  const rankSettings = await getUserRankSettings(user.id);
  const scored = scoreParsedJob(parsed, rankSettings);

  await db.insert(jobs).values({
    id: jobId,
    userId: user.id,
    companyName: parsed.companyName.value || parsedForm.data.companyName || null,
    title: parsed.title.value || parsedForm.data.title || null,
    sourceName: parsedForm.data.sourceName || null,
    sourceUrl: parsedForm.data.sourceUrl || null,
    rawText: parsedForm.data.rawText,
    createdAt: now,
    updatedAt: now
  });

  await db.insert(jobAnalyses).values({
    id: analysisId,
    jobId,
    parserVersion: parsed.parserVersion,
    employmentType: parsed.employmentType.value,
    baseSalaryMin: parsed.baseSalaryMin.value,
    baseSalaryMax: parsed.baseSalaryMax.value,
    fixedOvertimeHours: parsed.fixedOvertimeHours.value,
    fixedOvertimePay: parsed.fixedOvertimePay.value,
    annualHolidays: parsed.annualHolidays.value,
    holidayType: parsed.holidayType.value,
    housingAllowance: parsed.housingAllowance.status === "found" ? true : parsed.housingAllowance.status === "none" ? false : null,
    companyHousing: parsed.companyHousing.status === "found" ? true : parsed.companyHousing.status === "none" ? false : null,
    benefitsJson: JSON.stringify(parsed.benefits.value ?? []),
    warningsJson: JSON.stringify(parsed.warnings.value ?? []),
    salaryRank: scored.fixedOvertimeRank,
    holidayRank: scored.holidayRank,
    holidayTypeRank: scored.holidayTypeRank,
    benefitRank: scored.benefitRank,
    totalRank: scored.totalRank,
    evidenceJson: JSON.stringify(parsed),
    createdAt: now,
    updatedAt: now
  });

  const plan = await getUserPlan(user.id);
  await incrementAnalysisCount(user.id, PLAN_LIMITS[plan].analysisPeriod === "week" ? getWeekKey() : getMonthKey());

  revalidatePath("/jobs");
  redirect(`/jobs/${jobId}`);
}

export async function rerunAnalysisAction(jobId: string, _: JobActionState | undefined, __: FormData): Promise<JobActionState> {
  const user = await requireUser();
  try {
    await enforceAnalysisLimit(user.id);
  } catch (error) {
    if (error instanceof ActionLimitError) {
      return {
        status: "error",
        code: error.code,
        message: error.message
      };
    }
    return {
      status: "error",
      code: "generic",
      message: "再解析に失敗しました。"
    };
  }

  const target = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, user.id)),
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  if (!target) {
    return {
      status: "error",
      code: "generic",
      message: "求人が見つかりません"
    };
  }

  const now = new Date();
  const parsed = parseJobText(target.rawText);
  const rankSettings = await getUserRankSettings(user.id);
  const scored = scoreParsedJob(parsed, rankSettings);

  await db
    .update(jobs)
    .set({
      companyName: parsed.companyName.value || target.companyName,
      title: parsed.title.value || target.title,
      updatedAt: now
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

  await db.insert(jobAnalyses).values({
    id: crypto.randomUUID(),
    jobId,
    parserVersion: parsed.parserVersion,
    employmentType: parsed.employmentType.value,
    baseSalaryMin: parsed.baseSalaryMin.value,
    baseSalaryMax: parsed.baseSalaryMax.value,
    fixedOvertimeHours: parsed.fixedOvertimeHours.value,
    fixedOvertimePay: parsed.fixedOvertimePay.value,
    annualHolidays: parsed.annualHolidays.value,
    holidayType: parsed.holidayType.value,
    housingAllowance: parsed.housingAllowance.status === "found" ? true : parsed.housingAllowance.status === "none" ? false : null,
    companyHousing: parsed.companyHousing.status === "found" ? true : parsed.companyHousing.status === "none" ? false : null,
    benefitsJson: JSON.stringify(parsed.benefits.value ?? []),
    warningsJson: JSON.stringify(parsed.warnings.value ?? []),
    salaryRank: scored.fixedOvertimeRank,
    holidayRank: scored.holidayRank,
    holidayTypeRank: scored.holidayTypeRank,
    benefitRank: scored.benefitRank,
    totalRank: scored.totalRank,
    evidenceJson: JSON.stringify(parsed),
    createdAt: now,
    updatedAt: now
  });

  const plan = await getUserPlan(user.id);
  await incrementAnalysisCount(user.id, PLAN_LIMITS[plan].analysisPeriod === "week" ? getWeekKey() : getMonthKey());

  revalidatePath(`/jobs/${jobId}`);
  return {
    status: "success"
  };
}
