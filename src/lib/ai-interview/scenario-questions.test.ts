import { describe, expect, test } from "vitest";

import { buildAiInterviewScenarioQuestions, findAiInterviewQuestionById } from "@/lib/ai-interview/scenario-questions";

describe("ai interview scenario questions", () => {
  test("builds a question list whose length matches the selected scenario total", () => {
    expect(buildAiInterviewScenarioQuestions("new-grad")).toHaveLength(22);
    expect(buildAiInterviewScenarioQuestions("graduated")).toHaveLength(26);
    expect(buildAiInterviewScenarioQuestions("second-new-grad")).toHaveLength(28);
    expect(buildAiInterviewScenarioQuestions("career")).toHaveLength(26);
  });

  test("interleaves fixed prompts and AI-generated slots inside each category", () => {
    const questions = buildAiInterviewScenarioQuestions("new-grad");

    expect(questions.slice(0, 6).map((question) => ({ id: question.id, source: question.source, prompt: question.prompt }))).toEqual([
      {
        id: "new-grad-selfIntro-1",
        source: "fixed",
        prompt: "自己紹介してください"
      },
      {
        id: "new-grad-selfIntro-2",
        source: "ai_generated",
        prompt: "自己紹介について、先ほどの回答をもう少し詳しく教えてください。"
      },
      {
        id: "new-grad-studentEffort-1",
        source: "fixed",
        prompt: "学生時代に力を入れたことを教えてください"
      },
      {
        id: "new-grad-studentEffort-2",
        source: "ai_generated",
        prompt: "ガクチカについて、先ほどの回答をもう少し詳しく教えてください。"
      },
      {
        id: "new-grad-academicResearch-1",
        source: "fixed",
        prompt: "学業や研究で力を入れて取り組んだことを教えてください"
      },
      {
        id: "new-grad-academicResearch-2",
        source: "ai_generated",
        prompt: "学業/研究での取り組みについて、先ほどの回答をもう少し詳しく教えてください。"
      }
    ]);
  });

  test("overrides AI-generated slot prompts with persisted session prompts", () => {
    const questions = buildAiInterviewScenarioQuestions("new-grad", {
      generatedPromptsByQuestionId: {
        "new-grad-selfIntro-2": "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？"
      }
    });

    expect(questions[1]).toMatchObject({
      id: "new-grad-selfIntro-2",
      source: "ai_generated",
      prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？"
    });
  });

  test("creates globally unique question ids and lets feedback look them up", () => {
    const questions = buildAiInterviewScenarioQuestions("new-grad");
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    expect(findAiInterviewQuestionById("career-selfIntro-1")?.prompt).toContain("自己紹介");
  });
});
