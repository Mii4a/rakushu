"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scoreParsedJob, type ParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs, rankSettings } from "@/lib/db/schema";
import { getUserRankSettings } from "@/lib/subscription/rank-settings";
import { getUserPlan } from "@/lib/subscription";

const rankSettingsSchema = z
  .object({
    overtimeAMaxHours: z.coerce.number().int().min(0),
    overtimeBMaxHours: z.coerce.number().int().min(0),
    overtimeCMaxHours: z.coerce.number().int().min(0),
    overtimeDMaxHours: z.coerce.number().int().min(0),
    holidaySMinDays: z.coerce.number().int().min(0),
    holidayAMinDays: z.coerce.number().int().min(0),
    holidayBMinDays: z.coerce.number().int().min(0),
    holidayCMinDays: z.coerce.number().int().min(0),
    holidayDMinDays: z.coerce.number().int().min(0)
  })
  .superRefine((value, ctx) => {
    if (!(value.overtimeAMaxHours < value.overtimeBMaxHours && value.overtimeBMaxHours < value.overtimeCMaxHours && value.overtimeCMaxHours < value.overtimeDMaxHours)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "固定残業の閾値は A < B < C < D になるように入力してください。"
      });
    }

    if (!(value.holidaySMinDays > value.holidayAMinDays && value.holidayAMinDays > value.holidayBMinDays && value.holidayBMinDays > value.holidayCMinDays && value.holidayCMinDays > value.holidayDMinDays)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "年間休日の閾値は S > A > B > C > D になるように入力してください。"
      });
    }
  });

export async function updateRankSettingsAction(formData: FormData) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  if (plan !== "plus" && plan !== "pro") {
    throw new Error("ランク基準の編集はPlusプラン以上で利用できます。");
  }

  const parsedForm = rankSettingsSchema.safeParse({
    overtimeAMaxHours: formData.get("overtimeAMaxHours"),
    overtimeBMaxHours: formData.get("overtimeBMaxHours"),
    overtimeCMaxHours: formData.get("overtimeCMaxHours"),
    overtimeDMaxHours: formData.get("overtimeDMaxHours"),
    holidaySMinDays: formData.get("holidaySMinDays"),
    holidayAMinDays: formData.get("holidayAMinDays"),
    holidayBMinDays: formData.get("holidayBMinDays"),
    holidayCMinDays: formData.get("holidayCMinDays"),
    holidayDMinDays: formData.get("holidayDMinDays")
  });

  if (!parsedForm.success) {
    throw new Error(parsedForm.error.issues[0]?.message ?? "ランク基準の入力値が不正です。");
  }

  const now = new Date();
  const existing = await db.query.rankSettings.findFirst({
    where: eq(rankSettings.userId, user.id)
  });

  if (!existing) {
    await db.insert(rankSettings).values({
      id: crypto.randomUUID(),
      userId: user.id,
      ...parsedForm.data,
      createdAt: now,
      updatedAt: now
    });
  } else {
    await db
      .update(rankSettings)
      .set({
        ...parsedForm.data,
        updatedAt: now
      })
      .where(eq(rankSettings.userId, user.id));
  }

  const currentSettings = await getUserRankSettings(user.id);
  const userJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    with: {
      analyses: true
    }
  });

  for (const job of userJobs) {
    for (const analysis of job.analyses) {
      if (!analysis.evidenceJson) continue;

      const parsedJob = JSON.parse(analysis.evidenceJson) as ParsedJob;
      const rescored = scoreParsedJob(parsedJob, currentSettings);

      await db
        .update(jobAnalyses)
        .set({
          salaryRank: rescored.fixedOvertimeRank,
          holidayRank: rescored.holidayRank,
          holidayTypeRank: rescored.holidayTypeRank,
          bonusRank: rescored.bonusRank,
          retirementAllowanceRank: rescored.retirementAllowanceRank,
          benefitRank: rescored.benefitRank,
          totalRank: rescored.totalRank,
          updatedAt: now
        })
        .where(eq(jobAnalyses.id, analysis.id));
    }
  }

  revalidatePath("/pricing");
  revalidatePath("/jobs");
}
