"use server";

import { z } from "zod";

import { db } from "@/lib/db/client";
import { betaIntakeSubmissions } from "@/lib/db/schema";
import { recordMarketingEvent } from "@/lib/marketing/events";

export type BetaIntakeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const betaIntakeSchema = z.object({
  contact: z.string().trim().min(2, "連絡先を入力してください").max(320, "連絡先は320文字以内で入力してください"),
  currentStatus: z.enum(["新卒就活", "転職活動", "情報収集中"]),
  topProblemCategory: z.enum(["ブラック求人の見分け方", "条件比較", "応募管理", "自己分析・軸づくり", "その他"]),
  topProblem: z.string().trim().min(10, "困りごとは10文字以上で入力してください").max(2000, "困りごとは2000文字以内で入力してください"),
  desiredJobCategory: z.string().trim().max(200).optional(),
  jobsPerWeekBucket: z.enum(["1-5", "6-10", "11-20", "21+", "未定"]).optional(),
  interviewOptIn: z.boolean(),
  page: z.string().trim().max(200).optional(),
  referrer: z.string().trim().max(1000).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
  utmContent: z.string().trim().max(120).optional(),
  utmTerm: z.string().trim().max(120).optional(),
  ctaVariant: z.string().trim().max(40).optional()
});

function optionalString(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : undefined;
}

export async function submitBetaIntakeAction(
  _: BetaIntakeActionState | undefined,
  formData: FormData
): Promise<BetaIntakeActionState> {
  const parsed = betaIntakeSchema.safeParse({
    contact: formData.get("contact")?.toString() ?? "",
    currentStatus: formData.get("currentStatus")?.toString() ?? "",
    topProblemCategory: formData.get("topProblemCategory")?.toString() ?? "",
    topProblem: formData.get("topProblem")?.toString() ?? "",
    desiredJobCategory: optionalString(formData.get("desiredJobCategory")),
    jobsPerWeekBucket: optionalString(formData.get("jobsPerWeekBucket")),
    interviewOptIn: formData.get("interviewOptIn") === "on",
    page: optionalString(formData.get("page")),
    referrer: optionalString(formData.get("referrer")),
    utmSource: optionalString(formData.get("utmSource")),
    utmMedium: optionalString(formData.get("utmMedium")),
    utmCampaign: optionalString(formData.get("utmCampaign")),
    utmContent: optionalString(formData.get("utmContent")),
    utmTerm: optionalString(formData.get("utmTerm")),
    ctaVariant: optionalString(formData.get("ctaVariant"))
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "入力内容を確認してください"
    };
  }

  const now = new Date();

  await db.insert(betaIntakeSubmissions).values({
    id: crypto.randomUUID(),
    contact: parsed.data.contact,
    currentStatus: parsed.data.currentStatus,
    topProblemCategory: parsed.data.topProblemCategory,
    topProblem: parsed.data.topProblem,
    desiredJobCategory: parsed.data.desiredJobCategory ?? null,
    jobsPerWeekBucket: parsed.data.jobsPerWeekBucket ?? null,
    interviewOptIn: parsed.data.interviewOptIn,
    referrer: parsed.data.referrer ?? null,
    utmSource: parsed.data.utmSource ?? null,
    utmMedium: parsed.data.utmMedium ?? null,
    utmCampaign: parsed.data.utmCampaign ?? null,
    utmContent: parsed.data.utmContent ?? null,
    utmTerm: parsed.data.utmTerm ?? null,
    createdAt: now,
    updatedAt: now
  });

  await recordMarketingEvent({
    eventType: "beta_form_submit",
    page: parsed.data.page,
    referrer: parsed.data.referrer,
    utmSource: parsed.data.utmSource,
    utmMedium: parsed.data.utmMedium,
    utmCampaign: parsed.data.utmCampaign,
    utmContent: parsed.data.utmContent,
    utmTerm: parsed.data.utmTerm,
    ctaVariant: parsed.data.ctaVariant,
    currentStatus: parsed.data.currentStatus,
    topProblemCategory: parsed.data.topProblemCategory,
    interviewOptIn: parsed.data.interviewOptIn
  });

  return {
    status: "success",
    message: "ありがとうございます。案内制βとして内容を確認し、順番に連絡します。"
  };
}
