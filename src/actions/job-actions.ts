"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseJobText, scoreParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs, jobStatusEvents } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey, incrementAnalysisCount } from "@/lib/usage/counters";

export type ActionState = {
  error: string | null;
};

const initialActionState: ActionState = { error: null };

const newJobSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  sourceName: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  rawText: z.string().trim().min(20, "求人本文は20文字以上入力してください")
});

const updateJobSchema = z.object({
  jobId: z.string().uuid("求人IDが不正です"),
  companyName: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  sourceName: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  rawText: z.string().trim().min(20, "求人本文は20文字以上入力してください")
});

const selectionStatuses = ["saved", "applied", "screening", "interview", "offer", "rejected"] as const;

const optionalInt = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}, z.number().int().min(0).nullable());

const updateAnalysisCorrectionSchema = z
  .object({
    analysisId: z.string().uuid("解析IDが不正です"),
    employmentType: z.string().trim().max(100).optional(),
    annualHolidays: optionalInt,
    holidayType: z.string().trim().max(100).optional(),
    baseSalaryMin: optionalInt,
    baseSalaryMax: optionalInt
  })
  .refine((data) => data.baseSalaryMin === null || data.baseSalaryMax === null || data.baseSalaryMin <= data.baseSalaryMax, {
    message: "基本給の最小値は最大値以下にしてください",
    path: ["baseSalaryMin"]
  });

const updateSelectionSchema = z.object({
  jobId: z.string().uuid("求人IDが不正です"),
  selectionStatus: z.enum(selectionStatuses),
  nextActionDate: z.string().optional(),
  selectionMemo: z.string().trim().max(2000).optional()
});

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
    throw new Error(`無料プランの求人保存上限（${maxJobs}件）に達しています。`);
  }
}

async function enforceAnalysisLimit(userId: string) {
  const plan = await getUserPlan(userId);
  const maxPerMonth = PLAN_LIMITS[plan].maxAnalysesPerMonth;
  const current = await getAnalysisCount(userId, getMonthKey());

  if (current >= maxPerMonth) {
    throw new Error(`今月の解析上限（${maxPerMonth}件）に達しています。`);
  }
}

export async function createJobAction(formData: FormData) {
  const user = await requireUser();

  const parsedForm = newJobSchema.safeParse({
    companyName: formData.get("companyName")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    sourceName: formData.get("sourceName")?.toString() ?? "",
    sourceUrl: formData.get("sourceUrl")?.toString() ?? "",
    rawText: formData.get("rawText")?.toString() ?? ""
  });

  if (!parsedForm.success) {
    throw new Error(parsedForm.error.issues[0]?.message ?? "入力値が不正です");
  }

  await enforceJobLimit(user.id);
  await enforceAnalysisLimit(user.id);

  const now = new Date();
  const jobId = crypto.randomUUID();
  const analysisId = crypto.randomUUID();

  const parsed = parseJobText(parsedForm.data.rawText);
  const scored = scoreParsedJob(parsed);

  await db.insert(jobs).values({
    id: jobId,
    userId: user.id,
    companyName: parsedForm.data.companyName || parsed.companyName.value,
    title: parsedForm.data.title || parsed.title.value,
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
    benefitRank: scored.benefitRank,
    totalRank: scored.totalRank,
    evidenceJson: JSON.stringify(parsed),
    createdAt: now,
    updatedAt: now
  });

  await incrementAnalysisCount(user.id);

  revalidatePath("/jobs");
  redirect(`/jobs/${jobId}`);
}

export async function rerunAnalysisAction(jobId: string) {
  const user = await requireUser();
  await enforceAnalysisLimit(user.id);

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
    throw new Error("求人が見つかりません");
  }

  const now = new Date();
  const parsed = parseJobText(target.rawText);
  const scored = scoreParsedJob(parsed);

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
    benefitRank: scored.benefitRank,
    totalRank: scored.totalRank,
    evidenceJson: JSON.stringify(parsed),
    createdAt: now,
    updatedAt: now
  });

  await incrementAnalysisCount(user.id);

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateJobAction(formData: FormData) {
  const user = await requireUser();

  const parsedForm = updateJobSchema.safeParse({
    jobId: formData.get("jobId")?.toString() ?? "",
    companyName: formData.get("companyName")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    sourceName: formData.get("sourceName")?.toString() ?? "",
    sourceUrl: formData.get("sourceUrl")?.toString() ?? "",
    rawText: formData.get("rawText")?.toString() ?? ""
  });

  if (!parsedForm.success) {
    throw new Error(parsedForm.error.issues[0]?.message ?? "入力値が不正です");
  }

  const { jobId, companyName, title, sourceName, sourceUrl, rawText } = parsedForm.data;

  const target = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, user.id))
  });

  if (!target) {
    throw new Error("編集対象の求人が見つかりません");
  }

  await db
    .update(jobs)
    .set({
      companyName: companyName || null,
      title: title || null,
      sourceName: sourceName || null,
      sourceUrl: sourceUrl || null,
      rawText,
      updatedAt: new Date()
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/edit`);
  redirect(`/jobs/${jobId}`);
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


export async function updateAnalysisCorrectionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsedForm = updateAnalysisCorrectionSchema.safeParse({
    analysisId: formData.get("analysisId")?.toString() ?? "",
    employmentType: formData.get("employmentType")?.toString() ?? "",
    annualHolidays: formData.get("annualHolidays")?.toString() ?? "",
    holidayType: formData.get("holidayType")?.toString() ?? "",
    baseSalaryMin: formData.get("baseSalaryMin")?.toString() ?? "",
    baseSalaryMax: formData.get("baseSalaryMax")?.toString() ?? ""
  });

  if (!parsedForm.success) {
    return { error: parsedForm.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const { analysisId, employmentType, annualHolidays, holidayType, baseSalaryMin, baseSalaryMax } = parsedForm.data;

  const target = await db.query.jobAnalyses.findFirst({
    where: eq(jobAnalyses.id, analysisId),
    with: {
      job: true
    }
  });

  if (!target || target.job.userId !== user.id) {
    return { error: "更新対象の解析結果が見つかりません" };
  }

  await db
    .update(jobAnalyses)
    .set({
      employmentType: employmentType || null,
      annualHolidays,
      holidayType: holidayType || null,
      baseSalaryMin,
      baseSalaryMax,
      updatedAt: new Date()
    })
    .where(eq(jobAnalyses.id, analysisId));

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${target.jobId}`);
  return { error: null };
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
  redirect(`/jobs/${jobId}`);
}

export { initialActionState };
