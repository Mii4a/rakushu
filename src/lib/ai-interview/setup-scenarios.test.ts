import { describe, expect, test } from "vitest";

import {
  AI_INTERVIEW_SCENARIO_DEFINITIONS,
  DEFAULT_AI_INTERVIEW_SETUP_DRAFT,
  buildAiInterviewScenarioDefinition,
  getAiInterviewCategoryDefinition,
  getAiInterviewScenarioCategories
} from "@/lib/ai-interview/setup-scenarios";

describe("ai interview setup scenarios", () => {
  test("builds the new-grad scenario in the prompt-defined order with correct totals", () => {
    const scenario = buildAiInterviewScenarioDefinition("new-grad");

    expect(scenario.label).toBe("新卒・学生面接");
    expect(scenario.categories.map((category) => category.label)).toEqual([
      "自己紹介",
      "ガクチカ",
      "学業/研究での取り組み",
      "就活の軸",
      "自己PR",
      "志望動機",
      "キャリアプラン",
      "逆質問/最後の確認"
    ]);
    expect(scenario.totalDurationMinutes).toBe(44);
    expect(scenario.totalQuestionCount).toBe(22);
  });

  test("builds the other prompt-defined scenarios with correct total minutes", () => {
    expect(buildAiInterviewScenarioDefinition("graduated").totalDurationMinutes).toBe(52);
    expect(buildAiInterviewScenarioDefinition("second-new-grad").totalDurationMinutes).toBe(60);
    expect(buildAiInterviewScenarioDefinition("career").totalDurationMinutes).toBe(52);
  });

  test("exposes category metadata for the scenario step cards", () => {
    const categories = getAiInterviewScenarioCategories("second-new-grad");

    expect(categories[1]).toMatchObject({
      label: "前職での経験",
      durationMinutes: 8,
      questionCount: 4,
      sampleQuestion: "前職ではどのような業務を担当していましたか"
    });
  });

  test("provides a stable default setup draft and category lookup", () => {
    expect(DEFAULT_AI_INTERVIEW_SETUP_DRAFT).toMatchObject({
      settingSetName: "基本セット",
      setupMode: "new",
      interviewType: "first",
      targetCompany: "らくしゅう株式会社",
      targetRole: "営業職",
      scenarioType: "new-grad"
    });

    expect(getAiInterviewCategoryDefinition("reverseQuestions")?.label).toBe("逆質問/最後の確認");
    expect(getAiInterviewCategoryDefinition("missing-category")).toBeNull();
  });

  test("exports four scenario definitions for the setup modal tabs", () => {
    expect(AI_INTERVIEW_SCENARIO_DEFINITIONS.map((scenario) => scenario.label)).toEqual([
      "新卒・学生面接",
      "既卒面接",
      "第二新卒面接",
      "転職面接"
    ]);
  });
});
