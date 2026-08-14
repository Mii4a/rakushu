import { describe, expect, test } from "vitest";

import {
  getAiInterviewDisplayQuestionNumber,
  getAiInterviewProgressLabel,
  getAiInterviewProgressPercent,
  getAiInterviewResumeQuestionNumber,
  getAiInterviewSessionStatus,
  getAiInterviewTotalQuestionCount
} from "@/lib/ai-interview/session-progress";

describe("ai interview session progress helpers", () => {
  test("uses the selected scenario total instead of the fixed mock question length", () => {
    expect(getAiInterviewTotalQuestionCount("new-grad")).toBe(22);
    expect(getAiInterviewTotalQuestionCount("career")).toBe(26);
  });

  test("builds progress labels from the selected scenario total", () => {
    expect(getAiInterviewProgressLabel(2, "new-grad")).toBe("質問 2 / 22");
    expect(getAiInterviewProgressLabel(6, "career")).toBe("質問 6 / 26");
  });

  test("calculates the resume question number from saved answers", () => {
    expect(getAiInterviewResumeQuestionNumber(0, "new-grad")).toBe(1);
    expect(getAiInterviewResumeQuestionNumber(1, "new-grad")).toBe(2);
    expect(getAiInterviewResumeQuestionNumber(25, "career")).toBe(26);
    expect(getAiInterviewResumeQuestionNumber(99, "career")).toBe(26);
  });

  test("clamps displayed question number and percent to the scenario total", () => {
    expect(getAiInterviewDisplayQuestionNumber(1, "new-grad")).toBe(2);
    expect(getAiInterviewDisplayQuestionNumber(99, "new-grad")).toBe(22);
    expect(getAiInterviewProgressPercent(2, "new-grad")).toBe(9);
    expect(getAiInterviewProgressPercent(26, "career")).toBe(100);
  });

  test("marks sessions complete only after the selected scenario total is answered", () => {
    expect(getAiInterviewSessionStatus(9, "new-grad")).toBe("in_progress");
    expect(getAiInterviewSessionStatus(21, "new-grad")).toBe("in_progress");
    expect(getAiInterviewSessionStatus(22, "new-grad")).toBe("completed");
  });
});
