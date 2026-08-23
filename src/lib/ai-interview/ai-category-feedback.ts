import type { AiInterviewCategoryDefinition } from "@/lib/ai-interview/setup-scenarios";

import { recordLocalAiFallback, requestStructuredAi, StructuredAiRequestError } from "@/lib/ai/openai-responses";
import { resolveAiModelPolicy } from "@/lib/ai/model-policy";
import type { AiUsageErrorCode } from "@/lib/ai/usage-recorder";

export type AiInterviewCategoryFeedbackInput = {
  userId: string;
  sessionId: string;
  category: AiInterviewCategoryDefinition;
  companyName: string;
  targetRole: string;
  answers: Array<{
    prompt: string;
    answerText: string;
  }>;
};

export type AiInterviewCategoryFeedbackOutput = {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextFocus: string;
  nextQuestions: string[];
};

function buildFallbackCategoryFeedback(input: AiInterviewCategoryFeedbackInput): AiInterviewCategoryFeedbackOutput {
  return {
    overallScore: 4.0,
    summary: `${input.category.label}として要点は伝わっています。次は具体性を足すと評価が安定します。`,
    strengths: [`${input.category.label}の主題から大きく逸れずに回答できています`],
    improvements: ["数字・役割・結果のどれかを一段具体化する"],
    nextFocus: "結論のあとに具体例を一言で足す",
    nextQuestions: [`${input.category.label}について、成果が伝わる具体例を1つ追加するとしたら何ですか？`]
  };
}

function trimSingleLine(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\r\n]/.test(trimmed)) {
    throw new Error("invalid string");
  }
  return trimmed;
}

function parseCategoryFeedback(value: unknown): AiInterviewCategoryFeedbackOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid payload");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("invalid payload");

  const keys = Object.keys(value as Record<string, unknown>);
  const allowedKeys = ["overallScore", "summary", "strengths", "improvements", "nextFocus", "nextQuestions"];
  if (keys.some((key) => !allowedKeys.includes(key))) {
    throw new Error("invalid payload");
  }
  for (const key of allowedKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error("invalid payload");
  }

  const payload = value as Record<string, unknown>;
  const overallScore = payload.overallScore;
  if (typeof overallScore !== "number" || !Number.isFinite(overallScore) || overallScore < 1 || overallScore > 5 || Math.abs(overallScore * 10 - Math.round(overallScore * 10)) > 1e-9) {
    throw new Error("invalid payload");
  }

  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  if (!summary || summary.length > 400) throw new Error("invalid payload");

  const parseItems = (items: unknown) => {
    if (!Array.isArray(items) || items.length < 1 || items.length > 3) throw new Error("invalid payload");
    return items.map((item) => {
      if (typeof item !== "string") throw new Error("invalid payload");
      return trimSingleLine(item, 200);
    });
  };

  const strengths = parseItems(payload.strengths);
  const improvements = parseItems(payload.improvements);
  const nextFocus = trimSingleLine(typeof payload.nextFocus === "string" ? payload.nextFocus : "", 200);
  const nextQuestions = parseItems(payload.nextQuestions);

  return { overallScore, summary, strengths, improvements, nextFocus, nextQuestions };
}

async function recordFallback(input: AiInterviewCategoryFeedbackInput, model: string, errorCode: AiUsageErrorCode) {
  try {
    await recordLocalAiFallback({
      userId: input.userId,
      actionKey: "interview_category_feedback_generate",
      sourceTable: "ai_interview_sessions",
      sourceId: input.sessionId,
      model,
      errorCode
    });
  } catch {
    // fail-open
  }
}

export async function buildAiInterviewCategoryFeedback(input: AiInterviewCategoryFeedbackInput): Promise<AiInterviewCategoryFeedbackOutput> {
  try {
    const result = await requestStructuredAi<AiInterviewCategoryFeedbackOutput>({
      userId: input.userId,
      actionKey: "interview_category_feedback_generate",
      sourceTable: "ai_interview_sessions",
      sourceId: input.sessionId,
      systemPrompt:
        "あなたは就活面接のフィードバック担当です。カテゴリ単位の総評を日本語で返します。厳しすぎず甘すぎず、次に直せる行動まで落とし込んでください。overallScore は 1.0 から 5.0 の小数1桁以内にしてください。strengths / improvements / nextQuestions は 1〜3件で、短い箇条書き向け文にしてください。",
      userPrompt: [
        `対象企業: ${input.companyName}`,
        `想定職種: ${input.targetRole}`,
        `カテゴリ: ${input.category.label}`,
        "カテゴリ内の回答一覧:",
        ...input.answers.map((answer, index) => `Q${index + 1}: ${answer.prompt}\nA${index + 1}: ${answer.answerText}`),
        "このカテゴリ全体のフィードバックを返してください。"
      ].join("\n\n"),
      schemaName: "ai_interview_category_feedback",
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["overallScore", "summary", "strengths", "improvements", "nextFocus", "nextQuestions"],
        properties: {
          overallScore: { type: "number", minimum: 1, maximum: 5, multipleOf: 0.1 },
          summary: { type: "string", minLength: 1, maxLength: 400 },
          strengths: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 200 } },
          improvements: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 200 } },
          nextFocus: { type: "string", minLength: 1, maxLength: 200 },
          nextQuestions: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 200 } }
        }
      },
      parse(value) {
        return parseCategoryFeedback(value);
      }
    });
    return result.data;
  } catch (error) {
    const fallback = buildFallbackCategoryFeedback(input);
    const errorCode: AiUsageErrorCode = error instanceof StructuredAiRequestError ? error.code : "unknown_error";
    const model = error instanceof StructuredAiRequestError ? error.model : resolveAiModelPolicy("interview_category_feedback_generate").model;
    await recordFallback(input, model, errorCode);
    return fallback;
  }
}
