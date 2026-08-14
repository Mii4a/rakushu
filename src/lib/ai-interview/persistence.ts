import type { AiInterviewInterviewType, AiInterviewScenarioType } from "@/lib/ai-interview/setup-scenarios";
import { buildAiInterviewScenarioQuestions } from "@/lib/ai-interview/scenario-questions";

export type StoredAiInterviewAnswer = {
  id: string;
  questionId: string;
  prompt: string;
  answerText: string;
  score: number;
  strengths: string[];
  improvements: string[];
  followUps: string[];
  createdAt: Date;
};

export type StoredAiInterviewGeneratedQuestion = {
  id: string;
  categoryId: string;
  questionId: string;
  questionNumber: number;
  prompt: string;
  createdAt: Date;
};

export type StoredAiInterviewCategoryFeedback = {
  id: string;
  categoryId: string;
  startQuestionNumber: number;
  endQuestionNumber: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextFocus: string;
  nextQuestions: string[];
  createdAt: Date;
};

export type StoredAiInterviewSession = {
  id: string;
  settingSetName: string;
  interviewType: AiInterviewInterviewType;
  targetCompany: string;
  targetRole: string;
  scenarioType: AiInterviewScenarioType;
  startedAt: Date;
  updatedAt: Date;
  answers: StoredAiInterviewAnswer[];
  generatedQuestions: StoredAiInterviewGeneratedQuestion[];
  categoryFeedbacks: StoredAiInterviewCategoryFeedback[];
};

export type SavedAiInterviewSessionSummary = {
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
  latestAnswer: StoredAiInterviewAnswer | null;
  answers: StoredAiInterviewAnswer[];
  generatedQuestions: StoredAiInterviewGeneratedQuestion[];
  categoryFeedbacks: StoredAiInterviewCategoryFeedback[];
};

export function buildAiInterviewUiState(sessions: StoredAiInterviewSession[]): {
  savedSessions: SavedAiInterviewSessionSummary[];
  currentSessionId: string | null;
  savedAnswers: Array<{ id: string; prompt: string; score: number; questionId: string }>;
  initialQuestionId: string | null;
  initialAnswerDraft: string;
  initialFeedbackVisible: boolean;
  latestAnswer: StoredAiInterviewAnswer | null;
} {
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const savedSessions = sortedSessions.map((session) => {
    const answers = [...session.answers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latestAnswer = answers[0] ?? null;
    const averageScore = answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length : null;

    return {
      id: session.id,
      settingSetName: session.settingSetName,
      interviewType: session.interviewType,
      targetCompany: session.targetCompany,
      targetRole: session.targetRole,
      scenarioType: session.scenarioType,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      savedAnswerCount: answers.length,
      averageScore,
      latestAnswer,
      answers,
      generatedQuestions: [...session.generatedQuestions].sort((a, b) => a.questionNumber - b.questionNumber),
      categoryFeedbacks: [...session.categoryFeedbacks].sort((a, b) => a.startQuestionNumber - b.startQuestionNumber)
    } satisfies SavedAiInterviewSessionSummary;
  });

  const currentSession = savedSessions[0] ?? null;
  const latestAnswer = currentSession?.latestAnswer ?? null;
  const currentSessionQuestionIds = currentSession
    ? buildAiInterviewScenarioQuestions(currentSession.scenarioType, {
        generatedPromptsByQuestionId: Object.fromEntries(currentSession.generatedQuestions.map((item) => [item.questionId, item.prompt]))
      }).map((question) => question.id)
    : [];
  const nextQuestionId = currentSession
    ? currentSessionQuestionIds[Math.min(currentSession.savedAnswerCount, Math.max(currentSessionQuestionIds.length - 1, 0))] ?? null
    : null;

  return {
    savedSessions,
    currentSessionId: currentSession?.id ?? null,
    savedAnswers: (currentSession?.answers ?? []).map((answer) => ({
      id: answer.id,
      prompt: answer.prompt,
      score: answer.score,
      questionId: answer.questionId
    })),
    initialQuestionId: currentSession
      ? currentSession.savedAnswerCount >= currentSessionQuestionIds.length
        ? currentSession.answers[currentSessionQuestionIds.length - 1]?.questionId ?? null
        : nextQuestionId
      : null,
    initialAnswerDraft: "",
    initialFeedbackVisible: false,
    latestAnswer
  };
}
