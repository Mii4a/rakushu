import { desc, eq, inArray } from "drizzle-orm";

import { AiInterviewMockExperience } from "@/components/ai-interview/ai-interview-mock-experience";
import { buildAiInterviewUiState } from "@/lib/ai-interview/persistence";
import {
  type AiInterviewInterviewType,
  type AiInterviewScenarioType,
  AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS,
  AI_INTERVIEW_SCENARIO_TYPE_OPTIONS,
  DEFAULT_AI_INTERVIEW_SETUP_DRAFT
} from "@/lib/ai-interview/setup-scenarios";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import {
  aiInterviewCategoryFeedbacks,
  aiInterviewGeneratedQuestions,
  aiInterviewSessionAnswers,
  aiInterviewSessions
} from "@/lib/db/schema";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

function normalizeInterviewType(value: string | null | undefined): AiInterviewInterviewType {
  if (value && AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS.includes(value as AiInterviewInterviewType)) {
    return value as AiInterviewInterviewType;
  }
  if (value === "個人面接（深掘り質問）" || value === "2 次面接") return "second";
  if (value === "面接（3 次以降）") return "later";
  if (value === "最終面接") return "final";
  return DEFAULT_AI_INTERVIEW_SETUP_DRAFT.interviewType;
}

function normalizeScenarioType(value: string | null | undefined): AiInterviewScenarioType {
  if (value && AI_INTERVIEW_SCENARIO_TYPE_OPTIONS.includes(value as AiInterviewScenarioType)) {
    return value as AiInterviewScenarioType;
  }

  return AI_INTERVIEW_SCENARIO_TYPE_OPTIONS.find((option) => option === value) ?? DEFAULT_AI_INTERVIEW_SETUP_DRAFT.scenarioType;
}

function isMissingDynamicAiInterviewTable(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const causeMessage =
    typeof error === "object" && error !== null && "cause" in error
      ? String((error as { cause?: unknown }).cause)
      : "";
  const combinedMessage = `${errorMessage}\n${causeMessage}`;

  return (
    combinedMessage.includes("ai_interview_generated_questions") ||
    combinedMessage.includes("ai_interview_category_feedbacks")
  );
}

async function loadDynamicSessionArtifacts(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return {
      savedGeneratedQuestions: [],
      savedCategoryFeedbacks: []
    };
  }

  try {
    const [savedGeneratedQuestions, savedCategoryFeedbacks] = await Promise.all([
      db
        .select()
        .from(aiInterviewGeneratedQuestions)
        .where(inArray(aiInterviewGeneratedQuestions.sessionId, sessionIds))
        .orderBy(desc(aiInterviewGeneratedQuestions.questionNumber)),
      db
        .select()
        .from(aiInterviewCategoryFeedbacks)
        .where(inArray(aiInterviewCategoryFeedbacks.sessionId, sessionIds))
        .orderBy(desc(aiInterviewCategoryFeedbacks.startQuestionNumber))
    ]);

    return {
      savedGeneratedQuestions,
      savedCategoryFeedbacks
    };
  } catch (error) {
    if (isMissingDynamicAiInterviewTable(error)) {
      return {
        savedGeneratedQuestions: [],
        savedCategoryFeedbacks: []
      };
    }

    throw error;
  }
}

export default async function AiInterviewPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();

  const savedSessions = await db
    .select()
    .from(aiInterviewSessions)
    .where(eq(aiInterviewSessions.userId, user.id))
    .orderBy(desc(aiInterviewSessions.updatedAt))
    .limit(5);

  const sessionIds = savedSessions.map((item) => item.id);
  const savedAnswers = sessionIds.length
    ? await db
        .select()
        .from(aiInterviewSessionAnswers)
        .where(inArray(aiInterviewSessionAnswers.sessionId, sessionIds))
        .orderBy(desc(aiInterviewSessionAnswers.createdAt))
    : [];
  const { savedGeneratedQuestions, savedCategoryFeedbacks } = await loadDynamicSessionArtifacts(sessionIds);

  const answersBySessionId = new Map<string, typeof savedAnswers>();
  for (const answer of savedAnswers) {
    const current = answersBySessionId.get(answer.sessionId) ?? [];
    current.push(answer);
    answersBySessionId.set(answer.sessionId, current);
  }

  const generatedQuestionsBySessionId = new Map<string, typeof savedGeneratedQuestions>();
  for (const generatedQuestion of savedGeneratedQuestions) {
    const current = generatedQuestionsBySessionId.get(generatedQuestion.sessionId) ?? [];
    current.push(generatedQuestion);
    generatedQuestionsBySessionId.set(generatedQuestion.sessionId, current);
  }

  const categoryFeedbacksBySessionId = new Map<string, typeof savedCategoryFeedbacks>();
  for (const categoryFeedback of savedCategoryFeedbacks) {
    const current = categoryFeedbacksBySessionId.get(categoryFeedback.sessionId) ?? [];
    current.push(categoryFeedback);
    categoryFeedbacksBySessionId.set(categoryFeedback.sessionId, current);
  }

  const aiInterviewState = buildAiInterviewUiState(
    savedSessions.map((sessionRow) => ({
      id: sessionRow.id,
      settingSetName: sessionRow.settingSetName ?? sessionRow.questionSet ?? DEFAULT_AI_INTERVIEW_SETUP_DRAFT.settingSetName,
      interviewType: normalizeInterviewType(sessionRow.interviewType),
      targetCompany: sessionRow.targetCompany ?? DEFAULT_AI_INTERVIEW_SETUP_DRAFT.targetCompany,
      targetRole: sessionRow.targetRole ?? DEFAULT_AI_INTERVIEW_SETUP_DRAFT.targetRole,
      scenarioType: normalizeScenarioType(sessionRow.scenarioType),
      startedAt: sessionRow.startedAt,
      updatedAt: sessionRow.updatedAt,
      generatedQuestions: (generatedQuestionsBySessionId.get(sessionRow.id) ?? []).map((generatedQuestionRow) => ({
        id: generatedQuestionRow.id,
        categoryId: generatedQuestionRow.categoryId,
        questionId: generatedQuestionRow.questionId,
        questionNumber: generatedQuestionRow.questionNumber,
        prompt: generatedQuestionRow.prompt,
        createdAt: generatedQuestionRow.createdAt
      })),
      categoryFeedbacks: (categoryFeedbacksBySessionId.get(sessionRow.id) ?? []).map((categoryFeedbackRow) => ({
        id: categoryFeedbackRow.id,
        categoryId: categoryFeedbackRow.categoryId,
        startQuestionNumber: categoryFeedbackRow.startQuestionNumber,
        endQuestionNumber: categoryFeedbackRow.endQuestionNumber,
        overallScore: categoryFeedbackRow.overallScore / 10,
        summary: categoryFeedbackRow.summaryText,
        strengths: JSON.parse(categoryFeedbackRow.strengthsJson) as string[],
        improvements: JSON.parse(categoryFeedbackRow.improvementsJson) as string[],
        nextFocus: categoryFeedbackRow.nextFocusText,
        nextQuestions: JSON.parse(categoryFeedbackRow.nextQuestionsJson) as string[],
        createdAt: categoryFeedbackRow.createdAt
      })),
      answers: (answersBySessionId.get(sessionRow.id) ?? []).map((answerRow) => ({
        id: answerRow.id,
        questionId: answerRow.questionId,
        prompt: answerRow.prompt,
        answerText: answerRow.answerText,
        score: answerRow.score / 10,
        strengths: JSON.parse(answerRow.strengthsJson) as string[],
        improvements: JSON.parse(answerRow.improvementsJson) as string[],
        followUps: JSON.parse(answerRow.followUpsJson) as string[],
        createdAt: answerRow.createdAt
      }))
    }))
  );

  return (
    <AiInterviewMockExperience
      initialSavedSessions={aiInterviewState.savedSessions}
      initialCurrentSessionId={aiInterviewState.currentSessionId}
      initialQuestionId={aiInterviewState.initialQuestionId}
      initialFeedbackVisible={aiInterviewState.initialFeedbackVisible}
    />
  );
}
