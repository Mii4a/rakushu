"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseJobText, scoreParsedJob } from "@/lib/analysis";
import { buildJobAnalysisFeedbackInsert } from "@/lib/analysis/feedback";
import type { ExtractedValue, ParsedJob, ScoredJob } from "@/lib/analysis/types";
import { requireUser } from "@/lib/auth/require-user";
import { resolveCommuteFields } from "@/lib/commute";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobAnalysisFeedback, jobs, jobStatusEvents } from "@/lib/db/schema";
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

export type ActionState = {
  error: string | null;
};

const newJobSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  sourceName: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  workAddress: z.string().trim().max(240).optional(),
  nearestStation: z.string().trim().max(120).optional(),
  commuteMinutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(240)]).optional(),
  rawText: z.string().trim().min(20, "求人本文は20文字以上入力してください")
});

const updateJobSchema = z.object({
  jobId: z.string().uuid("求人IDが不正です"),
  companyName: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  sourceName: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  workAddress: z.string().trim().max(240).optional(),
  nearestStation: z.string().trim().max(120).optional(),
  commuteMinutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(240)]).optional(),
  rawText: z.string().trim().min(20, "求人本文は20文字以上入力してください")
});

const selectionStatuses = ["saved", "applied", "screening", "interview", "offer", "rejected"] as const;

const updateSelectionSchema = z.object({
  jobId: z.string().uuid("求人IDが不正です"),
  selectionStatus: z.enum(selectionStatuses),
  nextActionDate: z.string().optional(),
  selectionMemo: z.string().trim().max(2000).optional()
});

class ActionLimitError extends Error {
  code: "analysis_limit" | "job_limit";

  constructor(code: "analysis_limit" | "job_limit", message: string) {
    super(message);
    this.code = code;
  }
}

function toBooleanColumnValue(field: ExtractedValue<boolean>) {
  if (field.status === "found") return true;
  if (field.status === "none") return false;
  return null;
}

function buildJobAnalysisValues(params: {
  analysisId: string;
  jobId: string;
  parsed: ParsedJob;
  scored: ScoredJob;
  now: Date;
}) {
  const { analysisId, jobId, parsed, scored, now } = params;

  return {
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
    bonusCount: parsed.bonusCount.value,
    bonusPerformanceLinked: parsed.bonusPerformanceLinked.status === "found" ? true : null,
    housingAllowance: toBooleanColumnValue(parsed.housingAllowance),
    companyHousing: toBooleanColumnValue(parsed.companyHousing),
    retirementAllowance: toBooleanColumnValue(parsed.retirementAllowance),
    benefitsJson: JSON.stringify(parsed.benefits.value ?? []),
    warningsJson: JSON.stringify(parsed.warnings.value ?? []),
    salaryRank: scored.fixedOvertimeRank,
    holidayRank: scored.holidayRank,
    holidayTypeRank: scored.holidayTypeRank,
    bonusRank: scored.bonusRank,
    retirementAllowanceRank: scored.retirementAllowanceRank,
    benefitRank: scored.benefitRank,
    totalRank: scored.totalRank,
    evidenceJson: JSON.stringify(parsed),
    createdAt: now,
    updatedAt: now
  };
}

async function insertAutoAnalysisFeedback(params: {
  analysisId: string;
  rawText: string;
  parsed: ParsedJob;
  now: Date;
}) {
  const feedbackValues = buildJobAnalysisFeedbackInsert({
    analysisId: params.analysisId,
    rawText: params.rawText,
    parsed: params.parsed,
    now: params.now
  });

  if (!feedbackValues) {
    return;
  }

  await db.insert(jobAnalysisFeedback).values(feedbackValues);
}

function parseDateOnlyToUtc(value: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("次アクション日の形式が不正です");
  }

  const [, year, month, day] = match;
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    utcDate.getUTCFullYear() !== Number(year) ||
    utcDate.getUTCMonth() + 1 !== Number(month) ||
    utcDate.getUTCDate() !== Number(day)
  ) {
    throw new Error("次アクション日の形式が不正です");
  }

  return utcDate;
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
    workAddress: formData.get("workAddress")?.toString() ?? "",
    nearestStation: formData.get("nearestStation")?.toString() ?? "",
    commuteMinutes: formData.get("commuteMinutes")?.toString() ?? "",
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
  const commuteFields = await resolveCommuteFields({
    userId: user.id,
    destinationStationName: parsedForm.data.nearestStation || null,
    manualCommuteMinutes: typeof parsedForm.data.commuteMinutes === "number" ? parsedForm.data.commuteMinutes : null
  });

  await db.insert(jobs).values({
    id: jobId,
    userId: user.id,
    companyName: parsed.companyName.value || parsedForm.data.companyName || null,
    title: parsed.title.value || parsedForm.data.title || null,
    sourceName: parsedForm.data.sourceName || null,
    sourceUrl: parsedForm.data.sourceUrl || null,
    workAddress: parsedForm.data.workAddress || null,
    nearestStation: parsedForm.data.nearestStation || null,
    ...commuteFields,
    rawText: parsedForm.data.rawText,
    createdAt: now,
    updatedAt: now
  });

  await db.insert(jobAnalyses).values(buildJobAnalysisValues({ analysisId, jobId, parsed, scored, now }));
  await insertAutoAnalysisFeedback({ analysisId, rawText: parsedForm.data.rawText, parsed, now });

  const plan = await getUserPlan(user.id);
  await incrementAnalysisCount(user.id, PLAN_LIMITS[plan].analysisPeriod === "week" ? getWeekKey() : getMonthKey());

  revalidatePath("/jobs");
  redirect(`/jobs?selected=${jobId}`);
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
  const commuteFields = await resolveCommuteFields({
    userId: user.id,
    destinationStationName: target.nearestStation,
    manualCommuteMinutes: target.commuteDataKind === "manual" ? target.commuteMinutes : null
  });

  await db
    .update(jobs)
    .set({
      companyName: parsed.companyName.value || target.companyName,
      title: parsed.title.value || target.title,
      ...commuteFields,
      updatedAt: now
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

  const analysisId = crypto.randomUUID();

  await db.insert(jobAnalyses).values(buildJobAnalysisValues({ analysisId, jobId, parsed, scored, now }));
  await insertAutoAnalysisFeedback({ analysisId, rawText: target.rawText, parsed, now });

  const plan = await getUserPlan(user.id);
  await incrementAnalysisCount(user.id, PLAN_LIMITS[plan].analysisPeriod === "week" ? getWeekKey() : getMonthKey());

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  return {
    status: "success"
  };
}

export async function updateJobAction(formData: FormData) {
  const user = await requireUser();

  const parsedForm = updateJobSchema.safeParse({
    jobId: formData.get("jobId")?.toString() ?? "",
    companyName: formData.get("companyName")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    sourceName: formData.get("sourceName")?.toString() ?? "",
    sourceUrl: formData.get("sourceUrl")?.toString() ?? "",
    workAddress: formData.get("workAddress")?.toString() ?? "",
    nearestStation: formData.get("nearestStation")?.toString() ?? "",
    commuteMinutes: formData.get("commuteMinutes")?.toString() ?? "",
    rawText: formData.get("rawText")?.toString() ?? ""
  });

  if (!parsedForm.success) {
    throw new Error(parsedForm.error.issues[0]?.message ?? "入力値が不正です");
  }

  const { jobId, companyName, title, sourceName, sourceUrl, workAddress, nearestStation, commuteMinutes, rawText } = parsedForm.data;
  const target = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, user.id))
  });

  if (!target) {
    throw new Error("編集対象の求人が見つかりません");
  }

  const rawTextChanged = rawText !== target.rawText;
  if (rawTextChanged) {
    await enforceAnalysisLimit(user.id);
  }

  const now = new Date();
  const commuteFields = await resolveCommuteFields({
    userId: user.id,
    destinationStationName: nearestStation || null,
    manualCommuteMinutes: typeof commuteMinutes === "number" ? commuteMinutes : null
  });

  await db
    .update(jobs)
    .set({
      companyName: companyName || null,
      title: title || null,
      sourceName: sourceName || null,
      sourceUrl: sourceUrl || null,
      workAddress: workAddress || null,
      nearestStation: nearestStation || null,
      ...commuteFields,
      rawText,
      updatedAt: now
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

  if (rawTextChanged) {
    const parsed = parseJobText(rawText);
    const rankSettings = await getUserRankSettings(user.id);
    const scored = scoreParsedJob(parsed, rankSettings);
    const analysisId = crypto.randomUUID();

    await db.insert(jobAnalyses).values(buildJobAnalysisValues({ analysisId, jobId, parsed, scored, now }));
    await insertAutoAnalysisFeedback({ analysisId, rawText, parsed, now });

    const plan = await getUserPlan(user.id);
    await incrementAnalysisCount(user.id, PLAN_LIMITS[plan].analysisPeriod === "week" ? getWeekKey() : getMonthKey());
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/edit`);
  redirect(`/jobs?selected=${jobId}`);
}

export async function deleteJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = formData.get("jobId")?.toString() ?? "";

  if (!jobId) {
    throw new Error("求人IDが指定されていません");
  }

  const target = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, user.id))
  });

  if (!target) {
    throw new Error("削除対象の求人が見つかりません");
  }

  await db.delete(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

  revalidatePath("/jobs");
  redirect("/jobs");
}

export async function updateSelectionProgressAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsedForm = updateSelectionSchema.safeParse({
    jobId: formData.get("jobId")?.toString() ?? "",
    selectionStatus: formData.get("selectionStatus")?.toString() ?? "saved",
    nextActionDate: formData.get("nextActionDate")?.toString() ?? "",
    selectionMemo: formData.get("selectionMemo")?.toString() ?? ""
  });

  if (!parsedForm.success) {
    return { error: parsedForm.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const { jobId, selectionStatus, nextActionDate, selectionMemo } = parsedForm.data;

  let nextActionAt: Date | null = null;
  try {
    nextActionAt = parseDateOnlyToUtc(nextActionDate ?? "");
  } catch {
    return { error: "次アクション日の形式が不正です" };
  }

  const target = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, user.id))
  });

  if (!target) {
    return { error: "更新対象の求人が見つかりません" };
  }

  await db
    .update(jobs)
    .set({
      selectionStatus,
      nextActionAt,
      selectionMemo: selectionMemo || null,
      updatedAt: new Date()
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

  if (target.selectionStatus !== selectionStatus) {
    await db.insert(jobStatusEvents).values({
      id: crypto.randomUUID(),
      jobId,
      fromStatus: target.selectionStatus,
      toStatus: selectionStatus,
      createdAt: new Date()
    });
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs?selected=${jobId}`);
}
