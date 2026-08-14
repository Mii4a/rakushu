import { describe, expect, test } from "vitest";

import { buildAiInterviewUiState } from "@/lib/ai-interview/persistence";

describe("buildAiInterviewUiState", () => {
  test("returns an empty initial state when there are no saved sessions", () => {
    const state = buildAiInterviewUiState([]);

    expect(state.savedSessions).toEqual([]);
    expect(state.currentSessionId).toBeNull();
    expect(state.initialQuestionId).toBeNull();
    expect(state.savedAnswers).toEqual([]);
    expect(state.latestAnswer).toBeNull();
  });

  test("hydrates the latest session and its answers while keeping session-level history", () => {
    const state = buildAiInterviewUiState([
      {
        id: "session-older",
        settingSetName: "旧設定",
        interviewType: "first",
        targetCompany: "らくしゅう株式会社",
        targetRole: "営業職",
        scenarioType: "new-grad",
        startedAt: new Date("2026-06-14T00:00:00.000Z"),
        updatedAt: new Date("2026-06-14T01:00:00.000Z"),
        generatedQuestions: [],
        categoryFeedbacks: [],
        answers: [
          {
            id: "older-answer",
            questionId: "gakuchika",
            prompt: "学生時代に力を入れたことを教えてください。",
            answerText: "旧回答",
            score: 3.8,
            strengths: ["旧良かった点"],
            improvements: ["旧改善点"],
            followUps: ["旧深掘り"],
            createdAt: new Date("2026-06-14T00:10:00.000Z")
          }
        ]
      },
      {
        id: "session-latest",
        settingSetName: "最新設定",
        interviewType: "second",
        targetCompany: "らくしゅう株式会社",
        targetRole: "営業職",
        scenarioType: "career",
        startedAt: new Date("2026-06-15T00:00:00.000Z"),
        updatedAt: new Date("2026-06-15T02:00:00.000Z"),
        generatedQuestions: [
          {
            id: "generated-1",
            categoryId: "selfIntro",
            questionId: "career-selfIntro-2",
            questionNumber: 2,
            prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？",
            createdAt: new Date("2026-06-15T00:11:00.000Z")
          }
        ],
        categoryFeedbacks: [],
        answers: [
          {
            id: "answer-1",
            questionId: "career-selfIntro-1",
            prompt: "自己紹介してください。",
            answerText: "1問目回答",
            score: 4.1,
            strengths: ["1問目良かった点"],
            improvements: ["1問目改善点"],
            followUps: ["1問目深掘り"],
            createdAt: new Date("2026-06-15T00:10:00.000Z")
          },
          {
            id: "answer-2",
            questionId: "career-selfIntro-2",
            prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？",
            answerText: "2問目回答",
            score: 4.2,
            strengths: ["2問目良かった点"],
            improvements: ["2問目改善点"],
            followUps: ["2問目深掘り"],
            createdAt: new Date("2026-06-15T00:20:00.000Z")
          }
        ]
      }
    ]);

    expect(state.savedSessions.map((item) => item.id)).toEqual(["session-latest", "session-older"]);
    expect(state.savedSessions[0]).toMatchObject({
      id: "session-latest",
      savedAnswerCount: 2,
      latestAnswer: { id: "answer-2" }
    });
    expect(state.savedSessions[0]?.generatedQuestions[0]).toMatchObject({
      questionId: "career-selfIntro-2"
    });
    expect(state.savedSessions[0]?.answers.map((answer) => answer.id)).toEqual(["answer-2", "answer-1"]);
    expect(state.savedSessions[0]?.averageScore).toBeCloseTo(4.15, 5);
    expect(state.currentSessionId).toBe("session-latest");
    expect(state.savedAnswers.map((item) => item.id)).toEqual(["answer-2", "answer-1"]);
    expect(state.initialQuestionId).toBe("career-previousExperience-1");
    expect(state.initialAnswerDraft).toBe("");
    expect(state.latestAnswer?.id).toBe("answer-2");
    expect(state.initialFeedbackVisible).toBe(false);
  });
});
