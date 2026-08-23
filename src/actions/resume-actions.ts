"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { validateCompanyResearchEvidence } from "@/lib/company-research/evidence-validator";
import { db } from "@/lib/db/client";
import { companyResearches, jobs, resumeProfiles } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { generateResumeAiProposal, type ResumeAiProposal } from "@/lib/resume/ai-generator";
import { getUserPlan } from "@/lib/subscription";
import { assertAiCreditsAvailable, consumeAiCredits } from "@/lib/usage/counters";

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

  if (!PLAN_LIMITS[plan].features.resumeWorkspace) {
    return {
      error: "このプランでは履歴書ワークスペースを利用できません。",
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

export type ResumeAiActionState = {
  error: string | null;
  proposal: ResumeAiProposal | null;
};

const resumeAiInputSchema = z.object({
  mode: z.enum(["draft", "review", "company"]),
  jobId: z.string().trim().max(120).optional(),
  motivation: z.string().max(4000),
  selfPr: z.string().max(4000),
  education: z.string().max(4000),
  experience: z.string().max(4000),
  licenses: z.string().max(4000)
}).superRefine((value, context) => {
  const hasCurrent = Boolean(value.motivation.trim() || value.selfPr.trim());
  const hasBackground = Boolean(value.education.trim() || value.experience.trim() || value.licenses.trim());
  if (value.mode === "review" && !hasCurrent) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["motivation"], message: "志望動機または自己PRを入力してください" });
  } else if (value.mode !== "review" && !hasCurrent && !hasBackground) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["motivation"], message: "志望動機、自己PR、学歴、職歴、免許資格のいずれかを入力してください" });
  }
  if (value.mode === "company" && !value.jobId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["jobId"], message: "対象求人を選択してください" });
  }
});

const reportCitationSchema = z.object({ sourceId: z.string().trim().min(1).max(100), label: z.string().trim().min(1).max(100) });
const reportSubsectionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  content: z.array(z.string().trim().min(1).max(4000)).min(1).max(10),
  citations: z.array(reportCitationSchema).min(1).max(10)
});
const reportSectionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(500).optional(),
  subsections: z.array(reportSubsectionSchema).min(1).max(20)
});
const reportSourceSchema = z.object({
  id: z.string().trim().min(1).max(100),
  kind: z.enum(["official", "ir", "recruit", "review", "news", "other"]),
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().min(1).max(2048).url(),
  fetchedAt: z.string().trim().min(1).max(120),
  excerpt: z.string().trim().min(1).max(4000),
  reliability: z.enum(["high", "medium", "low"])
});
const persistedCompanyResearchReportSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  generatedAt: z.string().trim().min(1).max(120),
  estimatedPages: z.number().int().min(0).max(200),
  estimatedFigures: z.number().int().min(0).max(200),
  sections: z.array(reportSectionSchema).min(1).max(12),
  sources: z.array(reportSourceSchema).min(1).max(20),
  suggestedQuestions: z.array(z.string().trim().min(1).max(500)).min(1).max(6)
});

function resumeAiError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("今月のAIクレジット上限（")) {
    return "今月のAIクレジット上限に達しています。料金ページでプランをご確認ください。";
  }
  return "履歴書AI提案の生成に失敗しました。時間をおいて再度お試しください。";
}

async function loadResumeCompanyContext(userId: string, jobId: string) {
  const job = (await db
    .select({ id: jobs.id, companyName: jobs.companyName, title: jobs.title })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1))[0];
  if (!job?.companyName?.trim() || !job.title?.trim()) {
    return { ok: false as const, error: "指定された求人の会社情報を確認できませんでした。" };
  }

  const research = (await db
    .select({ id: companyResearches.id, reportJson: companyResearches.reportJson })
    .from(companyResearches)
    .where(and(eq(companyResearches.userId, userId), eq(companyResearches.companyName, job.companyName)))
    .orderBy(desc(companyResearches.createdAt))
    .limit(1))[0];
  if (!research) {
    return { ok: false as const, error: "対象企業の保存済み企業研究が必要です。先に企業研究を実行してください。" };
  }

  try {
    const parsedReport = persistedCompanyResearchReportSchema.safeParse(JSON.parse(research.reportJson) as unknown);
    if (
      !parsedReport.success
      || parsedReport.data.companyName !== job.companyName.trim()
      || validateCompanyResearchEvidence(parsedReport.data).ok !== true
    ) {
      return { ok: false as const, error: "保存済み企業研究を読み込めませんでした。企業研究を再実行してください。" };
    }
    return {
      ok: true as const,
      targetJob: { id: job.id, companyName: job.companyName.trim(), title: job.title.trim() },
      companyResearch: { id: research.id, report: parsedReport.data }
    };
  } catch {
    return { ok: false as const, error: "保存済み企業研究を読み込めませんでした。企業研究を再実行してください。" };
  }
}

async function generateResumeAiProposalForUser(
  userId: string,
  formData: FormData
): Promise<ResumeAiActionState> {
  const parsed = resumeAiInputSchema.safeParse({
    mode: formData.get("mode")?.toString() ?? "",
    jobId: formData.get("jobId")?.toString() ?? "",
    motivation: formData.get("motivation")?.toString() ?? "",
    selfPr: formData.get("selfPr")?.toString() ?? "",
    education: formData.get("education")?.toString() ?? "",
    experience: formData.get("experience")?.toString() ?? "",
    licenses: formData.get("licenses")?.toString() ?? ""
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です。", proposal: null };
  }

  const plan = await getUserPlan(userId);
  if (!PLAN_LIMITS[plan].features.resumeWorkspace) {
    return { error: "このプランでは履歴書ワークスペースを利用できません。", proposal: null };
  }

  const companyContext = parsed.data.mode === "company"
    ? await loadResumeCompanyContext(userId, parsed.data.jobId ?? "")
    : null;
  if (companyContext && !companyContext.ok) {
    return { error: companyContext.error, proposal: null };
  }

  try {
    await assertAiCreditsAvailable(userId, "resume_ai");
  } catch (error) {
    return { error: resumeAiError(error), proposal: null };
  }

  const profile = (await db
    .select({ id: resumeProfiles.id })
    .from(resumeProfiles)
    .where(eq(resumeProfiles.userId, userId))
    .limit(1))[0];

  try {
    const common = {
      userId,
      resumeProfileId: profile?.id ?? "unsaved",
      current: { motivation: parsed.data.motivation, selfPr: parsed.data.selfPr },
      background: { education: parsed.data.education, experience: parsed.data.experience, licenses: parsed.data.licenses }
    };
    const proposal = parsed.data.mode === "company" && companyContext?.ok
      ? await generateResumeAiProposal({ ...common, mode: "company", targetJob: companyContext.targetJob, companyResearch: companyContext.companyResearch })
      : await generateResumeAiProposal({ ...common, mode: parsed.data.mode as "draft" | "review" });

    await consumeAiCredits(userId, "resume_ai");
    return { error: null, proposal };
  } catch (error) {
    return { error: resumeAiError(error), proposal: null };
  }
}

export async function generateResumeAiProposalAction(
  _: ResumeAiActionState,
  formData: FormData
): Promise<ResumeAiActionState> {
  const user = await requireUser();
  try {
    return await generateResumeAiProposalForUser(user.id, formData);
  } catch (error) {
    return { error: resumeAiError(error), proposal: null };
  }
}
