import { z } from "zod";

import type { CompanyResearchChatMessage } from "./types";

export const MAX_COMPANY_RESEARCH_CHAT_QUESTIONS = 3;
export const MAX_COMPANY_RESEARCH_QUESTION_LENGTH = 200;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_ID_LENGTH = 120;
const MAX_MESSAGE_CONTENT_LENGTH = 4000;
const MAX_CITATIONS = 20;
const MAX_CITATION_SOURCE_ID_LENGTH = 120;
const MAX_CITATION_LABEL_LENGTH = 100;

const citationSchema = z.object({
  sourceId: z.string().trim().min(1).max(MAX_CITATION_SOURCE_ID_LENGTH),
  label: z.string().trim().min(1).max(MAX_CITATION_LABEL_LENGTH)
}).strict();

const userMessageSchema = z.object({
  id: z.string().trim().min(1).max(MAX_MESSAGE_ID_LENGTH),
  role: z.literal("user"),
  content: z.string().min(1).max(200).refine((value) => value.trim().length > 0, { message: "content must not be blank" }),
  createdAt: z.string().trim().min(1),
  citations: z.array(citationSchema).max(MAX_CITATIONS).optional()
}).strict();

const assistantMessageSchema = z.object({
  id: z.string().trim().min(1).max(MAX_MESSAGE_ID_LENGTH),
  role: z.literal("assistant"),
  content: z.string().min(1).max(MAX_MESSAGE_CONTENT_LENGTH).refine((value) => value.trim().length > 0, { message: "content must not be blank" }),
  createdAt: z.string().trim().min(1),
  citations: z.array(citationSchema).max(MAX_CITATIONS).optional()
}).strict();

function safePlainObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  try {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function safeArray(value: unknown): unknown[] | null {
  try {
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function parsePersistedCitation(value: unknown): { sourceId: string; label: string } | null {
  const plain = safePlainObject(value);
  if (!plain) return null;
  const parsed = citationSchema.safeParse({ sourceId: plain.sourceId, label: plain.label });
  if (!parsed.success) return null;
  return { sourceId: parsed.data.sourceId, label: parsed.data.label };
}

function parsePersistedMessage(value: unknown): CompanyResearchChatMessage | null {
  const plain = safePlainObject(value);
  if (!plain) return null;
  const base = {
    id: plain.id,
    content: plain.content,
    createdAt: plain.createdAt
  };
  const parsed = plain.role === "user" ? userMessageSchema.safeParse({ role: "user", ...base }) : plain.role === "assistant" ? assistantMessageSchema.safeParse({ role: "assistant", ...base }) : null;
  if (!parsed || !parsed.success) return null;
  const citations = safeArray(plain.citations)?.map(parsePersistedCitation).filter((citation): citation is { sourceId: string; label: string } => citation !== null);
  const message: CompanyResearchChatMessage = {
    id: parsed.data.id,
    role: parsed.data.role,
    content: parsed.data.content,
    createdAt: parsed.data.createdAt,
    ...(citations && citations.length > 0 ? { citations } : {})
  };
  return message;
}

export function parsePersistedCompanyResearchChatMessages(value: unknown): CompanyResearchChatMessage[] | null {
  const list = safeArray(value);
  if (!list || list.length > MAX_MESSAGES) return null;
  const messages: CompanyResearchChatMessage[] = [];
  try {
    for (const item of list) {
      const message = parsePersistedMessage(item);
      if (!message) return null;
      messages.push(message);
    }
    return messages;
  } catch {
    return null;
  }
}

export function countCompanyResearchUserQuestions(messages: readonly CompanyResearchChatMessage[]): number {
  return messages.reduce((count, message) => count + (message.role === "user" ? 1 : 0), 0);
}
