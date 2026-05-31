"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { resumeProfiles } from "@/lib/db/schema";
import { getUserPlan } from "@/lib/subscription";

export type ResumeActionState = {
  error: string | null;
  result: string | null;
};

function formatJapaneseDate(dateText: string | null | undefined) {
  if (!dateText) {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!match) {
    return dateText;
  }

  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function calculateAge(birthDateText: string | null | undefined, asOfDateText: string | null | undefined) {
  if (!birthDateText) {
    return null;
  }

  const birthDate = new Date(birthDateText);
  const asOfDate = asOfDateText ? new Date(asOfDateText) : new Date();
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(asOfDate.getTime())) {
    return null;
  }

  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const monthDelta = asOfDate.getMonth() - birthDate.getMonth();
  const dayDelta = asOfDate.getDate() - birthDate.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

const resumeDraftSchema = z.object({
  asOfDate: z.string().trim().optional(),
  fullName: z.string().trim().min(1, "氏名を入力してください").max(100),
  furigana: z.string().trim().max(100).optional(),
  gender: z.string().trim().max(30).optional(),
  birthDate: z.string().trim().optional(),
  currentAddress: z.string().trim().min(1, "現住所を入力してください").max(300),
  contactAddress: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.literal(""), z.string().email("メールアドレス形式が不正です")]),
  education: z.string().trim().min(1, "学歴を入力してください").max(4000),
  experience: z.string().trim().max(4000).optional(),
  licenses: z.string().trim().max(4000).optional(),
  selfPr: z.string().trim().min(1, "自己PRを入力してください").max(4000),
  motivation: z.string().trim().min(1, "志望動機を入力してください").max(4000),
  desiredConditions: z.string().trim().max(4000).optional(),
  templateName: z.string().trim().min(1, "フォーマット名を入力してください").max(120)
});

export async function generateResumeDraftAction(
  _: ResumeActionState,
  formData: FormData
): Promise<ResumeActionState> {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  if (plan !== "pro") {
    return {
      error: "履歴書下書き作成はProプラン限定機能です。",
      result: null
    };
  }

  const parsed = resumeDraftSchema.safeParse({
    asOfDate: formData.get("asOfDate")?.toString() ?? "",
    fullName: formData.get("fullName")?.toString() ?? "",
    furigana: formData.get("furigana")?.toString() ?? "",
    gender: formData.get("gender")?.toString() ?? "",
    birthDate: formData.get("birthDate")?.toString() ?? "",
    currentAddress: formData.get("currentAddress")?.toString() ?? "",
    contactAddress: formData.get("contactAddress")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    education: formData.get("education")?.toString() ?? "",
    experience: formData.get("experience")?.toString() ?? "",
    licenses: formData.get("licenses")?.toString() ?? "",
    selfPr: formData.get("selfPr")?.toString() ?? "",
    motivation: formData.get("motivation")?.toString() ?? "",
    desiredConditions: formData.get("desiredConditions")?.toString() ?? "",
    templateName: formData.get("templateName")?.toString() ?? ""
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力値が不正です。",
      result: null
    };
  }

  const data = parsed.data;
  const existing = (await db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, user.id)).limit(1))[0];
  const now = new Date();
  const profilePayload = {
    templateName: data.templateName,
    asOfDate: data.asOfDate || null,
    fullName: data.fullName,
    furigana: data.furigana || null,
    gender: data.gender || null,
    birthDate: data.birthDate || null,
    currentAddress: data.currentAddress,
    contactAddress: data.contactAddress || null,
    phone: data.phone || null,
    email: data.email || null,
    education: data.education,
    experience: data.experience || null,
    licenses: data.licenses || null,
    selfPr: data.selfPr,
    motivation: data.motivation,
    desiredConditions: data.desiredConditions || null,
    updatedAt: now
  };

  if (!existing) {
    await db.insert(resumeProfiles).values({
      id: crypto.randomUUID(),
      userId: user.id,
      ...profilePayload,
      createdAt: now
    });
  } else {
    await db.update(resumeProfiles).set(profilePayload).where(eq(resumeProfiles.id, existing.id));
  }

  const age = calculateAge(data.birthDate, data.asOfDate);
  const currentAddressLine = data.currentAddress.trim();
  const contactAddressLine = data.contactAddress?.trim() ? data.contactAddress.trim() : "(現住所以外への連絡希望なし)";
  const content = [
    `【履歴書（${data.templateName}）】`,
    "",
    `日付: ${formatJapaneseDate(data.asOfDate) || "(未記入)"}`,
    `氏名: ${data.fullName}`,
    `ふりがな: ${data.furigana || ""}`,
    `性別: ${data.gender || "(任意・未記入)"}`,
    `生年月日: ${formatJapaneseDate(data.birthDate) || "(未記入)"}${age === null ? "" : `（満${age}歳）`}`,
    `現住所: ${currentAddressLine}`,
    `連絡先: ${contactAddressLine}`,
    `電話番号: ${data.phone || ""}`,
    `メール: ${data.email || ""}`,
    "",
    "--- 学歴 ---",
    data.education,
    "",
    "--- 職歴 ---",
    data.experience || "(未記入)",
    "",
    "--- 免許・資格 ---",
    data.licenses || "(未記入)",
    "",
    "--- 志望動機・アピールポイント ---",
    data.motivation,
    "",
    "--- 自己PR補足 ---",
    data.selfPr,
    "",
    "--- 本人希望記入欄 ---",
    data.desiredConditions || "(未記入)"
  ].join("\n");
  const shortSelfPr = data.selfPr.replace(/\s+/g, " ").slice(0, 140);
  const shortMotivation = data.motivation.replace(/\s+/g, " ").slice(0, 140);
  const interviewPoints = [
    `自己PRでは「${shortSelfPr}${data.selfPr.length > 140 ? "..." : ""}」を軸に話す`,
    `志望動機では「${shortMotivation}${data.motivation.length > 140 ? "..." : ""}」を軸に話す`,
    data.experience ? "職歴・経験から再現性のある実績を1つ補足する" : "経験欄が薄い場合は学業・活動経験を具体化する"
  ];

  return {
    error: null,
    result: `${content}\n--- 提出前メモ ---\n自己PR要約: ${shortSelfPr}${data.selfPr.length > 140 ? "..." : ""}\n志望動機要約: ${shortMotivation}${data.motivation.length > 140 ? "..." : ""}\n\n--- 面接で口頭補足するポイント ---\n- ${interviewPoints.join("\n- ")}`
  };
}
