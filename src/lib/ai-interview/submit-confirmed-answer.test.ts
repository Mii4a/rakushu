import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  aiInterviewCategoryFeedbacks,
  aiInterviewConfirmedAnswers,
  aiInterviewGeneratedQuestions,
  aiInterviewRecordingSessions,
  aiInterviewSessionAnswers,
  aiInterviewSessions
} from "@/lib/db/schema";

const buildAiInterviewCategoryFeedbackMock = vi.fn();
const buildAiInterviewFollowUpQuestionMock = vi.fn();

const dbMock = {
  sessions: [] as Array<{
    id: string;
    userId: string;
    scenarioType: string;
    startedAt: Date;
  }>,
  answers: [] as Array<{
    id: string;
    sessionId: string;
    questionId: string;
    prompt: string;
    answerText: string;
    score: number;
    strengthsJson: string;
    improvementsJson: string;
    followUpsJson: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
  generatedQuestions: [] as Array<{
    id: string;
    sessionId: string;
    categoryId: string;
    questionId: string;
    questionNumber: number;
    prompt: string;
    basedOnAnswerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  categoryFeedbacks: [] as Array<{
    id: string;
    sessionId: string;
    categoryId: string;
    startQuestionNumber: number;
    endQuestionNumber: number;
    overallScore: number;
    summaryText: string;
    strengthsJson: string;
    improvementsJson: string;
    nextFocusText: string;
    nextQuestionsJson: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
  confirmedAnswers: [] as Array<{
    id: string;
    userId: string;
    sessionId: string;
    questionId: string;
    confirmedText: string;
    confirmedAt: Date;
  }>,
  recordingUpdates: [] as unknown[],
  sessionUpdates: [] as unknown[],
  reset() {
    dbMock.sessions = [];
    dbMock.answers = [];
    dbMock.generatedQuestions = [];
    dbMock.categoryFeedbacks = [];
    dbMock.confirmedAnswers = [];
    dbMock.recordingUpdates = [];
    dbMock.sessionUpdates = [];
  },
  select() {
    return {
      from(table: unknown) {
        const orderedResult = () => {
          if (table === aiInterviewSessionAnswers) return dbMock.answers;
          if (table === aiInterviewGeneratedQuestions) return dbMock.generatedQuestions;
          if (table === aiInterviewSessions) return dbMock.sessions;
          if (table === aiInterviewCategoryFeedbacks) return dbMock.categoryFeedbacks;
          return [];
        };

        return {
          where() {
            return {
              async limit() {
                return orderedResult();
              },
              async orderBy() {
                return orderedResult();
              }
            };
          },
          async orderBy() {
            return orderedResult();
          }
        };
      }
    };
  },
  insert(table: unknown) {
    return {
      async values(value: unknown) {
        if (table === aiInterviewConfirmedAnswers) dbMock.confirmedAnswers.push(value as (typeof dbMock.confirmedAnswers)[number]);
        if (table === aiInterviewSessionAnswers) dbMock.answers.push(value as (typeof dbMock.answers)[number]);
        if (table === aiInterviewGeneratedQuestions) dbMock.generatedQuestions.push(value as (typeof dbMock.generatedQuestions)[number]);
        if (table === aiInterviewCategoryFeedbacks) dbMock.categoryFeedbacks.push(value as (typeof dbMock.categoryFeedbacks)[number]);
        if (table === aiInterviewSessions) dbMock.sessions.push(value as (typeof dbMock.sessions)[number]);
      }
    };
  },
  update(table: unknown) {
    return {
      set(value: unknown) {
        return {
          async where() {
            if (table === aiInterviewRecordingSessions) dbMock.recordingUpdates.push(value);
            if (table === aiInterviewSessions) dbMock.sessionUpdates.push(value);
          }
        };
      }
    };
  }
};

vi.mock("@/lib/db/client", () => ({
  db: dbMock
}));

vi.mock("@/lib/ai-interview/ai-follow-up", () => ({
  buildAiInterviewFollowUpQuestion: buildAiInterviewFollowUpQuestionMock
}));

vi.mock("@/lib/ai-interview/ai-category-feedback", () => ({
  buildAiInterviewCategoryFeedback: buildAiInterviewCategoryFeedbackMock
}));

describe("submitConfirmedInterviewAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.reset();
    dbMock.sessions.push({
      id: "session-1",
      userId: "user-1",
      scenarioType: "new-grad",
      startedAt: new Date("2026-06-17T00:00:00.000Z")
    });
  });

  it("generates and persists an AI follow-up when the next slot in the category is AI-generated", async () => {
    buildAiInterviewFollowUpQuestionMock.mockResolvedValue({
      prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？"
    });

    const { submitConfirmedInterviewAnswer } = await import("./submit-confirmed-answer");
    const response = await submitConfirmedInterviewAnswer({
      userId: "user-1",
      sessionId: "session-1",
      questionId: "new-grad-selfIntro-1",
      confirmedText: "大学では情報工学を学び、チーム開発を経験しました。",
      sourceKind: "text"
    });

    expect(response.ok).toBe(true);
    expect(buildAiInterviewFollowUpQuestionMock).toHaveBeenCalledTimes(1);
    expect(buildAiInterviewFollowUpQuestionMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", sessionId: "session-1" }));
    expect(buildAiInterviewCategoryFeedbackMock).not.toHaveBeenCalled();
    expect(response.nextQuestion).toMatchObject({
      questionId: "new-grad-selfIntro-2",
      categoryId: "selfIntro",
      prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？"
    });
    expect(dbMock.generatedQuestions).toHaveLength(1);
    expect(dbMock.generatedQuestions[0]).toMatchObject({
      sessionId: "session-1",
      categoryId: "selfIntro",
      questionId: "new-grad-selfIntro-2",
      questionNumber: 2,
      prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？"
    });
  });

  it("persists category feedback when the answered question completes the category", async () => {
    dbMock.generatedQuestions.push({
      id: "gen-1",
      sessionId: "session-1",
      categoryId: "selfIntro",
      questionId: "new-grad-selfIntro-2",
      questionNumber: 2,
      prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？",
      basedOnAnswerId: "answer-1",
      createdAt: new Date("2026-06-17T00:01:00.000Z"),
      updatedAt: new Date("2026-06-17T00:01:00.000Z")
    });
    dbMock.answers.push({
      id: "answer-1",
      sessionId: "session-1",
      questionId: "new-grad-selfIntro-1",
      prompt: "自己紹介してください",
      answerText: "大学では情報工学を学びました。",
      score: 42,
      strengthsJson: JSON.stringify(["結論が先"]),
      improvementsJson: JSON.stringify(["数字を足す"]),
      followUpsJson: JSON.stringify(["役割は？"]),
      createdAt: new Date("2026-06-17T00:00:30.000Z"),
      updatedAt: new Date("2026-06-17T00:00:30.000Z")
    });
    buildAiInterviewCategoryFeedbackMock.mockResolvedValue({
      overallScore: 4.4,
      summary: "自己紹介として要点が整理されており、人物像が伝わります。",
      strengths: ["第一印象が明快"],
      improvements: ["成果の具体性を足す"],
      nextFocus: "結論のあとに一言で強みを補足する",
      nextQuestions: ["学生時代に最も力を入れたことは？"]
    });

    const { submitConfirmedInterviewAnswer } = await import("./submit-confirmed-answer");
    const response = await submitConfirmedInterviewAnswer({
      userId: "user-1",
      sessionId: "session-1",
      questionId: "new-grad-selfIntro-2",
      confirmedText: "リーダー役を任されることが多く、役割整理が得意です。",
      sourceKind: "text"
    });

    expect(response.ok).toBe(true);
    expect(buildAiInterviewFollowUpQuestionMock).not.toHaveBeenCalled();
    expect(buildAiInterviewCategoryFeedbackMock).toHaveBeenCalledTimes(1);
    expect(response.completedCategoryFeedback).toMatchObject({
      categoryId: "selfIntro",
      overallScore: 4.4,
      summary: "自己紹介として要点が整理されており、人物像が伝わります。"
    });
    expect(dbMock.categoryFeedbacks).toHaveLength(1);
    expect(dbMock.categoryFeedbacks[0]).toMatchObject({
      sessionId: "session-1",
      categoryId: "selfIntro",
      startQuestionNumber: 1,
      endQuestionNumber: 2,
      overallScore: 44,
      summaryText: "自己紹介として要点が整理されており、人物像が伝わります。"
    });
  });
});
