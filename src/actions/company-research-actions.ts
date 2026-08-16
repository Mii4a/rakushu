"use server";

import { and, desc, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { generateCompanyResearchChatAnswer } from "@/lib/company-research/chat-generator";
import { buildCompanyResearchResultFromQuery } from "@/lib/company-research/generate-result";
import { generateCompanyResearchReport } from "@/lib/company-research/report-generator";
import { buildCompanyResearchRequest } from "@/lib/company-research/research-request";
import { MAX_COMPANY_RESEARCH_CHAT_QUESTIONS, MAX_COMPANY_RESEARCH_QUESTION_LENGTH, countCompanyResearchUserQuestions, parsePersistedCompanyResearchChatMessages } from "@/lib/company-research/chat-policy";
import type { CompanyResearchChatMessage, CompanyResearchReport } from "@/lib/company-research/types";
import { normalizeCompanyWebsiteUrl } from "@/lib/company-research/url";
import { db } from "@/lib/db/client";
import { companyResearches } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { consumeAiCredits } from "@/lib/usage/counters";

const saveCompanyResearchSchema = z.object({
  query: z.string().trim().min(1, "企業URLを入力してください").max(500, "URLが長すぎます")
});

const loadMoreCompanyResearchesSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(20).optional()
});

const askCompanyResearchQuestionSchema = z.object({
  researchId: z.string().trim().min(1).max(120),
  question: z.string().trim().min(1, "質問を入力してください").max(MAX_COMPANY_RESEARCH_QUESTION_LENGTH, "質問は200文字以内で入力してください")
});

function parseJsonOr<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseChatMessagesOrFallback(value: string | null | undefined, fallback: unknown): unknown {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return Symbol.for("parse-error");
  }
}

function mapCompanyResearchRow(item: typeof companyResearches.$inferSelect) {
  const fallback = buildCompanyResearchResultFromQuery(item.query);
  const report = parseJsonOr<CompanyResearchReport>(item.reportJson, fallback.report);
  const chatMessages = parseJsonOr<CompanyResearchChatMessage[]>(item.chatMessagesJson, fallback.chatMessages);

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
      report,
      chatMessages
    }
  };
}

function toAiCreditLimitMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("AIクレジット上限")) {
    return "今月のAIクレジットを使い切りました。続ける場合は料金ページからプランを見直してください。";
  }

  return null;
}

function toGenerationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
    return "企業研究AIの設定が未完了です。管理者にOPENAI_API_KEYの設定を依頼してください。";
  }

  if (error instanceof TypeError || error instanceof Error) {
    return "企業研究レポートの生成に失敗しました。時間をおいて再度お試しください。";
  }

  return "企業研究レポートの生成に失敗しました。時間をおいて再度お試しください。";
}

export async function saveCompanyResearchAction(input: { query: string }) {
  const user = await requireUser();
  const parsed = saveCompanyResearchSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "企業研究の保存に失敗しました"
    };
  }

  let websiteUrl: string;
  try {
    websiteUrl = normalizeCompanyWebsiteUrl(parsed.data.query);
  } catch {
    return {
      ok: false as const,
      message: "企業公式サイトのURLを確認してください。例: https://example.co.jp"
    };
  }

  const plan = await getUserPlan(user.id);
  const maxCompanyResearches = PLAN_LIMITS[plan].maxCompanyResearches;
  if (Number.isFinite(maxCompanyResearches)) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const limitWhereClause =
      plan === "free"
        ? eq(companyResearches.userId, user.id)
        : and(eq(companyResearches.userId, user.id), gte(companyResearches.createdAt, monthStart));

    const existingResearches = await db
      .select({ id: companyResearches.id })
      .from(companyResearches)
      .where(limitWhereClause)
      .limit(maxCompanyResearches);

    if (existingResearches.length >= maxCompanyResearches) {
      return {
        ok: false as const,
        message:
          plan === "free"
            ? "無料プランの企業研究お試しは1回までです。続けて使う場合は Starter 以上へアップグレードしてください。"
            : `今月の企業研究上限（${maxCompanyResearches}件）に達しました。`
      };
    }
  }

  try {
    await consumeAiCredits(user.id, "company_research");
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

  const now = new Date();
  const id = crypto.randomUUID();
  const researchRequest = buildCompanyResearchRequest(websiteUrl);
  let generation;

  try {
    generation = await generateCompanyResearchReport({ userId: user.id, researchId: id, websiteUrl, researchRequest, now });
  } catch (error) {
    return {
      ok: false as const,
      message: toGenerationErrorMessage(error)
    };
  }

  const generatedResult = generation.result;
  const sourceChunks = generatedResult.report.sourceChunks ?? [];

  await db.insert(companyResearches).values({
    id,
    userId: user.id,
    query: parsed.data.query,
    websiteUrl,
    companyName: generatedResult.companyName,
    industry: generatedResult.industry,
    location: generatedResult.location,
    size: generatedResult.size,
    summary: generatedResult.summary,
    keyPointsJson: JSON.stringify(generatedResult.keyPoints),
    interviewHintsJson: JSON.stringify(generatedResult.interviewHints),
    nextActionsJson: JSON.stringify(generatedResult.nextActions),
    reportJson: JSON.stringify(generatedResult.report),
    sourceChunksJson: JSON.stringify(sourceChunks),
    chatMessagesJson: JSON.stringify(generatedResult.chatMessages.slice(-50)),
    modelName: generation.model,
    sourceCount: generatedResult.report.sources.length,
    status: "レポート作成済み",
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/company-research");

  return {
    ok: true as const,
    savedResearch: {
      id,
      query: parsed.data.query,
      companyName: generatedResult.companyName,
      industry: generatedResult.industry,
      location: generatedResult.location,
      size: generatedResult.size,
      summary: generatedResult.summary,
      keyPoints: generatedResult.keyPoints,
      interviewHints: generatedResult.interviewHints,
      nextActions: generatedResult.nextActions,
      report: generatedResult.report,
      chatMessages: generatedResult.chatMessages,
      status: "レポート作成済み",
      createdAt: now
    }
  };
}

export async function loadMoreCompanyResearchesAction(input: { cursor?: string; limit?: number }) {
  const user = await requireUser();
  const parsed = loadMoreCompanyResearchesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: "企業研究の履歴を読み込めませんでした"
    };
  }

  const limit = parsed.data.limit ?? 8;
  const cursorDate = parsed.data.cursor ? new Date(parsed.data.cursor) : null;
  const whereClause = cursorDate
    ? and(eq(companyResearches.userId, user.id), lt(companyResearches.createdAt, cursorDate))
    : eq(companyResearches.userId, user.id);

  const rows = await db
    .select()
    .from(companyResearches)
    .where(whereClause)
    .orderBy(desc(companyResearches.createdAt))
    .limit(limit + 1);

  const items = rows.slice(0, limit).map(mapCompanyResearchRow);

  return {
    ok: true as const,
    items,
    hasMore: rows.length > limit,
    nextCursor: items.at(-1)?.researchedAt ?? null
  };
}

export async function askCompanyResearchQuestionAction(input: { researchId: string; question: string }) {
  const user = await requireUser();
  const parsed = askCompanyResearchQuestionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "質問を送信できませんでした"
    };
  }

  const rows = await db
    .select()
    .from(companyResearches)
    .where(and(eq(companyResearches.id, parsed.data.researchId), eq(companyResearches.userId, user.id)))
    .limit(1);
  const research = rows[0];

  if (!research) {
    return {
      ok: false as const,
      message: "企業研究が見つかりませんでした"
    };
  }

  const fallback = buildCompanyResearchResultFromQuery(research.query);
  const now = new Date();
  const report = parseJsonOr<CompanyResearchReport>(research.reportJson, fallback.report);
  const previousMessages = parseChatMessagesOrFallback(research.chatMessagesJson, fallback.chatMessages);
  const parsedPreviousMessages = parsePersistedCompanyResearchChatMessages(previousMessages);

  if (parsedPreviousMessages === null) {
    return {
      ok: false as const,
      message: "企業研究チャットの履歴を読み込めませんでした"
    };
  }

  if (countCompanyResearchUserQuestions(parsedPreviousMessages) >= MAX_COMPANY_RESEARCH_CHAT_QUESTIONS) {
    return {
      ok: false as const,
      message: "この企業への追加質問は3回までです"
    };
  }
  const userMessage: CompanyResearchChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: parsed.data.question,
    createdAt: now.toISOString()
  };

  let assistantMessage: CompanyResearchChatMessage;
  try {
    assistantMessage = await generateCompanyResearchChatAnswer({
      userId: user.id,
      researchId: parsed.data.researchId,
      question: parsed.data.question,
      report,
      previousMessages: parsedPreviousMessages,
      now
    });
  } catch {
    return {
      ok: false as const,
      message: "企業研究チャットの回答生成に失敗しました。時間をおいて再度お試しください。"
    };
  }

  const nextMessages = [...parsedPreviousMessages, userMessage, assistantMessage].slice(-50);

  const updateSet = db
    .update(companyResearches)
    .set({
      chatMessagesJson: JSON.stringify(nextMessages),
      updatedAt: now
    });

  await updateSet.where(and(eq(companyResearches.id, parsed.data.researchId), eq(companyResearches.userId, user.id)));

  revalidatePath("/company-research");

  return {
    ok: true as const,
    messages: [userMessage, assistantMessage]
  };
}
