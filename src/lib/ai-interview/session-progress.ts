import { type AiInterviewScenarioType, buildAiInterviewScenarioDefinition } from "@/lib/ai-interview/setup-scenarios";

export function getAiInterviewTotalQuestionCount(scenarioType: AiInterviewScenarioType) {
  return buildAiInterviewScenarioDefinition(scenarioType).totalQuestionCount;
}

export function getAiInterviewDisplayQuestionNumber(questionIndex: number, scenarioType: AiInterviewScenarioType) {
  const totalQuestionCount = getAiInterviewTotalQuestionCount(scenarioType);
  if (totalQuestionCount <= 0) return 0;
  return Math.min(Math.max(questionIndex + 1, 1), totalQuestionCount);
}

export function getAiInterviewResumeQuestionNumber(savedAnswerCount: number, scenarioType: AiInterviewScenarioType) {
  const totalQuestionCount = getAiInterviewTotalQuestionCount(scenarioType);
  if (totalQuestionCount <= 0) return 0;
  return Math.min(Math.max(savedAnswerCount + 1, 1), totalQuestionCount);
}

export function getAiInterviewProgressLabel(questionNumber: number, scenarioType: AiInterviewScenarioType) {
  return `質問 ${questionNumber} / ${getAiInterviewTotalQuestionCount(scenarioType)}`;
}

export function getAiInterviewSessionStatus(savedAnswerCount: number, scenarioType: AiInterviewScenarioType) {
  return savedAnswerCount >= getAiInterviewTotalQuestionCount(scenarioType) ? "completed" : "in_progress";
}

export function getAiInterviewProgressPercent(questionNumber: number, scenarioType: AiInterviewScenarioType) {
  const totalQuestionCount = getAiInterviewTotalQuestionCount(scenarioType);
  if (totalQuestionCount <= 0) return 0;
  return Math.round((Math.min(Math.max(questionNumber, 0), totalQuestionCount) / totalQuestionCount) * 100);
}
