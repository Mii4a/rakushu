import { findAiInterviewQuestionById } from "@/lib/ai-interview/scenario-questions";

export function buildAiInterviewMockFeedback(questionId: string) {
  const question = findAiInterviewQuestionById(questionId);
  if (!question) {
    return null;
  }

  return {
    question,
    score: question.score,
    strengths: question.strengths,
    improvements: question.improvements,
    followUps: question.followUps
  };
}
