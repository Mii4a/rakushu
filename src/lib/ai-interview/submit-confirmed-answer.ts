import { and, asc, eq } from "drizzle-orm";

import { buildAiInterviewCategoryFeedback } from "@/lib/ai-interview/ai-category-feedback";
import { buildAiInterviewFollowUpQuestion } from "@/lib/ai-interview/ai-follow-up";
import { DEFAULT_AI_INTERVIEW_SETUP_DRAFT, getAiInterviewCategoryDefinition } from "@/lib/ai-interview/setup-scenarios";
import type { AiInterviewScenarioType } from "@/lib/ai-interview/setup-scenarios";
import { buildAiInterviewMockFeedback } from "@/lib/ai-interview/mock-feedback";
import { buildAiInterviewScenarioDefinition } from "@/lib/ai-interview/setup-scenarios";
import { buildAiInterviewScenarioQuestions, findAiInterviewQuestionById } from "@/lib/ai-interview/scenario-questions";
import { db } from "@/lib/db/client";
import {
  aiInterviewCategoryFeedbacks,
  aiInterviewConfirmedAnswers,
  aiInterviewGeneratedQuestions,
  aiInterviewRecordingSessions,
  aiInterviewSessionAnswers,
  aiInterviewSessions
} from "@/lib/db/schema";

export type SubmitConfirmedInterviewAnswerInput = {
  userId: string;
  sessionId?: string;
  questionId: string;
  confirmedText: string;
  sourceKind: "text" | "voice_transcript";
  recordingSessionId?: string;
  rawTranscriptTextSnapshot?: string | null;
};

async function ensureOwnedAiInterviewSession(userId: string, sessionId?: string) {
  if (sessionId) {
    const existingSession = (
      await db
        .select()
        .from(aiInterviewSessions)
        .where(and(eq(aiInterviewSessions.id, sessionId), eq(aiInterviewSessions.userId, userId)))
        .limit(1)
    )[0];

    if (!existingSession) {
      throw new Error("面接セッションが見つかりませんでした");
    }

    return existingSession;
  }

  const now = new Date();
  const newSessionId = crypto.randomUUID();

  await db.insert(aiInterviewSessions).values({
    id: newSessionId,
    userId,
    settingSetName: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.settingSetName,
    interviewType: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.interviewType,
    targetCompany: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.targetCompany,
    targetRole: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.targetRole,
    scenarioType: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.scenarioType,
    questionSet: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.settingSetName,
    startedAt: now,
    updatedAt: now
  });

  return {
    id: newSessionId,
    userId,
    settingSetName: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.settingSetName,
    interviewType: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.interviewType,
    targetCompany: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.targetCompany,
    targetRole: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.targetRole,
    scenarioType: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.scenarioType,
    questionSet: DEFAULT_AI_INTERVIEW_SETUP_DRAFT.settingSetName,
    startedAt: now,
    updatedAt: now
  };
}

async function loadSessionContext(sessionId: string) {
  const [savedAnswers, generatedQuestions] = await Promise.all([
    db
      .select()
      .from(aiInterviewSessionAnswers)
      .where(eq(aiInterviewSessionAnswers.sessionId, sessionId))
      .orderBy(asc(aiInterviewSessionAnswers.createdAt)),
    db
      .select()
      .from(aiInterviewGeneratedQuestions)
      .where(eq(aiInterviewGeneratedQuestions.sessionId, sessionId))
      .orderBy(asc(aiInterviewGeneratedQuestions.questionNumber))
  ]);

  return {
    savedAnswers: [...savedAnswers],
    generatedPromptsByQuestionId: Object.fromEntries([...generatedQuestions].map((item) => [item.questionId, item.prompt]))
  };
}

function getCategoryQuestionBounds(scenarioType: Parameters<typeof buildAiInterviewScenarioDefinition>[0], categoryId: string) {
  const scenarioDefinition = buildAiInterviewScenarioDefinition(scenarioType);
  let startQuestionNumber = 1;

  for (const category of scenarioDefinition.categories) {
    const endQuestionNumber = startQuestionNumber + category.questionCount - 1;
    if (category.id === categoryId) {
      return { category, startQuestionNumber, endQuestionNumber };
    }
    startQuestionNumber = endQuestionNumber + 1;
  }

  return null;
}

export async function submitConfirmedInterviewAnswer(input: SubmitConfirmedInterviewAnswerInput) {
  const normalizedText = input.confirmedText.trim();
  if (!normalizedText) {
    throw new Error("回答を入力してください");
  }

  const session = await ensureOwnedAiInterviewSession(input.userId, input.sessionId);
  const scenarioType = session.scenarioType as AiInterviewScenarioType;
  const { savedAnswers, generatedPromptsByQuestionId } = await loadSessionContext(session.id);
  const scenarioQuestions = buildAiInterviewScenarioQuestions(scenarioType, { generatedPromptsByQuestionId });
  const question = scenarioQuestions.find((item) => item.id === input.questionId) ?? findAiInterviewQuestionById(input.questionId, { generatedPromptsByQuestionId });

  if (!question) {
    throw new Error("質問が見つかりませんでした");
  }

  const feedback = buildAiInterviewMockFeedback(input.questionId) ?? {
    question,
    score: question.score,
    strengths: question.strengths,
    improvements: question.improvements,
    followUps: question.followUps
  };

  const now = new Date();
  const confirmedAnswerId = crypto.randomUUID();
  const finalAnswerId = crypto.randomUUID();

  await db.insert(aiInterviewConfirmedAnswers).values({
    id: confirmedAnswerId,
    userId: input.userId,
    sessionId: session.id,
    recordingSessionId: input.recordingSessionId,
    questionId: question.id,
    sourceKind: input.sourceKind,
    rawTranscriptTextSnapshot: input.rawTranscriptTextSnapshot ?? null,
    confirmedText: normalizedText,
    confirmedAt: now,
    createdAt: now,
    updatedAt: now
  });

  await db.insert(aiInterviewSessionAnswers).values({
    id: finalAnswerId,
    sessionId: session.id,
    confirmedAnswerId,
    recordingSessionId: input.recordingSessionId,
    answerSourceKind: input.sourceKind,
    questionId: question.id,
    prompt: question.prompt,
    answerText: normalizedText,
    score: Math.round(feedback.score * 10),
    strengthsJson: JSON.stringify(feedback.strengths),
    improvementsJson: JSON.stringify(feedback.improvements),
    followUpsJson: JSON.stringify(feedback.followUps),
    createdAt: now,
    updatedAt: now
  });

  const allAnswersAfterSave = [
    ...savedAnswers,
    {
      id: finalAnswerId,
      sessionId: session.id,
      questionId: question.id,
      prompt: question.prompt,
      answerText: normalizedText,
      score: Math.round(feedback.score * 10),
      strengthsJson: JSON.stringify(feedback.strengths),
      improvementsJson: JSON.stringify(feedback.improvements),
      followUpsJson: JSON.stringify(feedback.followUps),
      createdAt: now,
      updatedAt: now
    }
  ];

  let nextQuestion: {
    questionId: string;
    categoryId: string;
    prompt: string;
    source: "fixed" | "ai_generated";
  } | null = null;
  let completedCategoryFeedback: {
    categoryId: string;
    overallScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    nextFocus: string;
    nextQuestions: string[];
  } | null = null;

  const categoryBounds = getCategoryQuestionBounds(scenarioType, question.categoryId);
  const currentCategoryAnswerCount = allAnswersAfterSave.filter((answer) => {
    const answerQuestion = scenarioQuestions.find((item) => item.id === answer.questionId);
    return answerQuestion?.categoryId === question.categoryId;
  }).length;

  if (categoryBounds && currentCategoryAnswerCount >= categoryBounds.category.questionCount) {
    const categoryAnswers = allAnswersAfterSave
      .filter((answer) => {
        const answerQuestion = scenarioQuestions.find((item) => item.id === answer.questionId);
        return answerQuestion?.categoryId === question.categoryId;
      })
      .map((answer) => ({ prompt: answer.prompt, answerText: answer.answerText }));

    const categoryFeedback = await buildAiInterviewCategoryFeedback({
      category: categoryBounds.category,
      companyName: session.targetCompany,
      targetRole: session.targetRole,
      answers: categoryAnswers
    });

    await db.insert(aiInterviewCategoryFeedbacks).values({
      id: crypto.randomUUID(),
      sessionId: session.id,
      categoryId: question.categoryId,
      startQuestionNumber: categoryBounds.startQuestionNumber,
      endQuestionNumber: categoryBounds.endQuestionNumber,
      overallScore: Math.round(categoryFeedback.overallScore * 10),
      summaryText: categoryFeedback.summary,
      strengthsJson: JSON.stringify(categoryFeedback.strengths),
      improvementsJson: JSON.stringify(categoryFeedback.improvements),
      nextFocusText: categoryFeedback.nextFocus,
      nextQuestionsJson: JSON.stringify(categoryFeedback.nextQuestions),
      createdAt: now,
      updatedAt: now
    });

    completedCategoryFeedback = {
      categoryId: question.categoryId,
      overallScore: categoryFeedback.overallScore,
      summary: categoryFeedback.summary,
      strengths: categoryFeedback.strengths,
      improvements: categoryFeedback.improvements,
      nextFocus: categoryFeedback.nextFocus,
      nextQuestions: categoryFeedback.nextQuestions
    };
  } else {
    const nextQuestionSlot = scenarioQuestions[question.questionNumber];
    if (nextQuestionSlot && nextQuestionSlot.categoryId === question.categoryId && nextQuestionSlot.source === "ai_generated") {
      const categoryDefinition = getAiInterviewCategoryDefinition(question.categoryId);
      if (!categoryDefinition) {
        throw new Error("カテゴリ定義が見つかりませんでした");
      }

      const categoryAnswers = allAnswersAfterSave
        .filter((answer) => {
          const answerQuestion = scenarioQuestions.find((item) => item.id === answer.questionId);
          return answerQuestion?.categoryId === question.categoryId;
        })
        .map((answer) => ({ prompt: answer.prompt, answerText: answer.answerText }));

      const followUpQuestion = await buildAiInterviewFollowUpQuestion({
        category: categoryDefinition,
        companyName: session.targetCompany,
        targetRole: session.targetRole,
        existingAnswers: categoryAnswers
      });

      await db.insert(aiInterviewGeneratedQuestions).values({
        id: crypto.randomUUID(),
        sessionId: session.id,
        categoryId: question.categoryId,
        questionId: nextQuestionSlot.id,
        questionNumber: nextQuestionSlot.questionNumber,
        prompt: followUpQuestion.prompt,
        basedOnAnswerId: finalAnswerId,
        createdAt: now,
        updatedAt: now
      });

      nextQuestion = {
        questionId: nextQuestionSlot.id,
        categoryId: question.categoryId,
        prompt: followUpQuestion.prompt,
        source: "ai_generated"
      };
    }
  }

  await db.update(aiInterviewSessions).set({ updatedAt: now }).where(eq(aiInterviewSessions.id, session.id));

  if (input.recordingSessionId) {
    await db
      .update(aiInterviewRecordingSessions)
      .set({
        sessionId: session.id,
        status: "feedback_ready",
        updatedAt: now
      })
      .where(and(eq(aiInterviewRecordingSessions.id, input.recordingSessionId), eq(aiInterviewRecordingSessions.userId, input.userId)));
  }

  return {
    ok: true as const,
    savedAttempt: {
      id: finalAnswerId,
      sessionId: session.id,
      questionId: question.id,
      prompt: question.prompt,
      answerText: normalizedText,
      score: feedback.score,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      followUps: feedback.followUps,
      createdAt: now,
      answerSourceKind: input.sourceKind,
      confirmedAnswerId,
      recordingSessionId: input.recordingSessionId ?? null
    },
    nextQuestion,
    completedCategoryFeedback
  };
}
