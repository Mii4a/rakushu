"use server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS,
  AI_INTERVIEW_SCENARIO_TYPE_OPTIONS,
  type AiInterviewInterviewType,
  type AiInterviewScenarioType
} from "@/lib/ai-interview/setup-scenarios";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { aiInterviewCategoryFeedbacks, aiInterviewConfirmedAnswers, aiInterviewGeneratedQuestions, aiInterviewSessionAnswers, aiInterviewSessions } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { consumeAiCredits } from "@/lib/usage/counters";

const aiInterviewSessionSetupSchema = z.object({
  settingSetName: z.string().trim().min(1, "設定セット名を入力してください").max(80, "設定セット名が長すぎます"),
  interviewType: z.enum(AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS),
  targetCompany: z.string().trim().min(1, "想定企業を入力してください").max(120, "想定企業が長すぎます"),
  targetRole: z.string().trim().min(1, "想定職種を入力してください").max(120, "想定職種が長すぎます"),
  scenarioType: z.enum(AI_INTERVIEW_SCENARIO_TYPE_OPTIONS)
});

const resetAiInterviewCategorySchema = z.object({
  sessionId: z.string().trim().min(1, "セッションIDが不正です"),
  categoryId: z.string().trim().min(1, "カテゴリIDが不正です"),
  questionIds: z.array(z.string().trim().min(1)).min(1, "リセット対象の質問がありません")
});

function toAiCreditLimitMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("AIクレジット上限")) {
    return "今月のAIクレジットを使い切りました。続ける場合は料金ページからプランを見直してください。";
  }

  return null;
}

export type CreatedAiInterviewSession = {
  id: string;
  settingSetName: string;
  interviewType: AiInterviewInterviewType;
  targetCompany: string;
  targetRole: string;
  scenarioType: AiInterviewScenarioType;
  startedAt: Date;
  updatedAt: Date;
  savedAnswerCount: number;
  averageScore: number | null;
  latestAnswer: null;
  answers: [];
  generatedQuestions: [];
  categoryFeedbacks: [];
};

export async function createAiInterviewSessionAction(input: {
  settingSetName: string;
  interviewType: AiInterviewInterviewType;
  targetCompany: string;
  targetRole: string;
  scenarioType: AiInterviewScenarioType;
}) {
  const user = await requireUser();
  const parsed = aiInterviewSessionSetupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "面接セッションの作成に失敗しました"
    };
  }

  const plan = await getUserPlan(user.id);
  const maxAiInterviewSessions = PLAN_LIMITS[plan].maxAiInterviewSessions;
  if (Number.isFinite(maxAiInterviewSessions)) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const limitWhereClause =
      plan === "free"
        ? eq(aiInterviewSessions.userId, user.id)
        : and(eq(aiInterviewSessions.userId, user.id), gte(aiInterviewSessions.startedAt, monthStart));

    const existingSessions = await db
      .select({ id: aiInterviewSessions.id })
      .from(aiInterviewSessions)
      .where(limitWhereClause)
      .limit(maxAiInterviewSessions);

    if (existingSessions.length >= maxAiInterviewSessions) {
      return {
        ok: false as const,
        message:
          plan === "free"
            ? "無料プランのAI面接お試しは1セッションまでです。続けて使う場合は Starter 以上へアップグレードしてください。"
            : `今月のAI面接セッション上限（${maxAiInterviewSessions}件）に達しました。`
      };
    }
  }

  const now = new Date();
  const sessionId = crypto.randomUUID();

  try {
    await consumeAiCredits(user.id, "ai_interview_session");
  } catch (error) {
    const message = toAiCreditLimitMessage(error);
    if (message) {
      return {
        ok: false as const,
        message
      };
    }

    throw error;
  }

  await db.insert(aiInterviewSessions).values({
    id: sessionId,
    userId: user.id,
    settingSetName: parsed.data.settingSetName,
    interviewType: parsed.data.interviewType,
    targetCompany: parsed.data.targetCompany,
    targetRole: parsed.data.targetRole,
    scenarioType: parsed.data.scenarioType,
    questionSet: parsed.data.settingSetName,
    startedAt: now,
    updatedAt: now
  });

  revalidatePath("/ai-interview");

  return {
    ok: true as const,
    session: {
      id: sessionId,
      settingSetName: parsed.data.settingSetName,
      interviewType: parsed.data.interviewType,
      targetCompany: parsed.data.targetCompany,
      targetRole: parsed.data.targetRole,
      scenarioType: parsed.data.scenarioType,
      startedAt: now,
      updatedAt: now,
      savedAnswerCount: 0,
      averageScore: null,
      latestAnswer: null,
      answers: [],
      generatedQuestions: [],
      categoryFeedbacks: []
    } satisfies CreatedAiInterviewSession
  };
}

export async function resetAiInterviewCategoryAction(input: { sessionId: string; categoryId: string; questionIds: string[] }) {
  const user = await requireUser();
  const parsed = resetAiInterviewCategorySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "カテゴリ回答のリセットに失敗しました"
    };
  }

  const ownedSession = (
    await db
      .select({ id: aiInterviewSessions.id })
      .from(aiInterviewSessions)
      .where(and(eq(aiInterviewSessions.id, parsed.data.sessionId), eq(aiInterviewSessions.userId, user.id)))
      .limit(1)
  )[0];

  if (!ownedSession) {
    return { ok: false as const, message: "セッションが見つかりませんでした" };
  }

  await db
    .delete(aiInterviewSessionAnswers)
    .where(and(eq(aiInterviewSessionAnswers.sessionId, parsed.data.sessionId), inArray(aiInterviewSessionAnswers.questionId, parsed.data.questionIds)));

  await db
    .delete(aiInterviewConfirmedAnswers)
    .where(and(eq(aiInterviewConfirmedAnswers.sessionId, parsed.data.sessionId), inArray(aiInterviewConfirmedAnswers.questionId, parsed.data.questionIds)));

  await db
    .delete(aiInterviewGeneratedQuestions)
    .where(and(eq(aiInterviewGeneratedQuestions.sessionId, parsed.data.sessionId), eq(aiInterviewGeneratedQuestions.categoryId, parsed.data.categoryId)));

  await db
    .delete(aiInterviewCategoryFeedbacks)
    .where(and(eq(aiInterviewCategoryFeedbacks.sessionId, parsed.data.sessionId), eq(aiInterviewCategoryFeedbacks.categoryId, parsed.data.categoryId)));

  await db.update(aiInterviewSessions).set({ updatedAt: new Date() }).where(eq(aiInterviewSessions.id, parsed.data.sessionId));

  revalidatePath("/ai-interview");
  return { ok: true as const };
}
