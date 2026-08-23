import type { CompanyResearchChatMessage } from "./types";

export const MAX_COMPANY_RESEARCH_CHAT_QUESTIONS = 3;
export const MAX_COMPANY_RESEARCH_QUESTION_LENGTH = 200;

export function countCompanyResearchUserQuestions(messages: readonly CompanyResearchChatMessage[]): number {
  return messages.reduce((count, message) => count + (message.role === "user" ? 1 : 0), 0);
}