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
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey, incrementAnalysisCount } from "@/lib/usage/counters";

const newJobSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  sourceName: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.string().url()]).optional(),
  rawText: z.string().trim().min(20, "求人本文は20文字以上入力してください")
});

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
