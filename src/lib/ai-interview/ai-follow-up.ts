import type { AiInterviewCategoryDefinition } from "@/lib/ai-interview/setup-scenarios";
import { recordLocalAiFallback, requestStructuredAi, StructuredAiRequestError } from "@/lib/ai/openai-responses";
import { resolveAiModelPolicy } from "@/lib/ai/model-policy";
import type { AiUsageErrorCode } from "@/lib/ai/usage-recorder";

export type AiInterviewFollowUpInput = {
  category: AiInterviewCategoryDefinition;
  companyName: string;
  targetRole: string;
  userId: string;
  sessionId: string;
  existingAnswers: Array<{
    prompt: string;
    answerText: string;
  }>;
};

export type AiInterviewFollowUpOutput = {
  prompt: string;
};

function validateFollowUpPrompt(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid prompt");
  const prompt = value.trim();
  if (!prompt || prompt.length > 70 || /[\r\n]/.test(prompt) || !(prompt.endsWith("？") || prompt.endsWith("?"))) {
    throw new Error("invalid prompt");
  }
  return prompt;
}

function buildFallbackFollowUpQuestion(input: AiInterviewFollowUpInput): AiInterviewFollowUpOutput {
  const lastAnswer = input.existingAnswers[input.existingAnswers.length - 1];
  if (lastAnswer?.prompt.includes("自己紹介")) {
    return { prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" };
  }

  return {
    prompt: `${input.category.label}について、先ほどの回答の中で特に具体化できる場面を1つ選んで詳しく教えてください。`
  };
}

function resolveFallbackErrorCode(error: unknown): AiUsageErrorCode {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (
      code === "http_400" ||
      code === "http_401" ||
      code === "http_403" ||
      code === "http_429" ||
      code === "http_5xx" ||
      code === "timeout" ||
      code === "network_error" ||
      code === "invalid_json" ||
      code === "empty_output" ||
      code === "schema_validation_failed" ||
      code === "unknown_error"
    ) {
      return code;
    }
  }
  return "unknown_error";
}

async function recordFallback(input: AiInterviewFollowUpInput, model: string, errorCode: AiUsageErrorCode) {
  try {
    await recordLocalAiFallback({
      userId: input.userId,
      actionKey: "interview_follow_up_generate",
      sourceTable: "ai_interview_sessions",
      sourceId: input.sessionId,
      model,
      errorCode
    });
  } catch {
    // fail-open
  }
}

export async function buildAiInterviewFollowUpQuestion(input: AiInterviewFollowUpInput): Promise<AiInterviewFollowUpOutput> {
  try {
    const result = await requestStructuredAi<AiInterviewFollowUpOutput>({
      userId: input.userId,
      actionKey: "interview_follow_up_generate",
      sourceTable: "ai_interview_sessions",
      sourceId: input.sessionId,
      systemPrompt:
        "あなたは新卒・転職面接の面接官です。カテゴリ内の深掘り質問を1問だけ作ります。質問文は自然な日本語で、1文、70文字以内、次に聞く1問だけを返してください。既に聞いたことの言い換えを避け、候補者の直前回答を具体化する方向で深掘りしてください。",
      userPrompt: [
        `対象企業: ${input.companyName}`,
        `想定職種: ${input.targetRole}`,
        `カテゴリ: ${input.category.label}`,
        "これまでのカテゴリ内回答:",
        ...input.existingAnswers.map((answer, index) => `Q${index + 1}: ${answer.prompt}\nA${index + 1}: ${answer.answerText}`),
        "次に聞く深掘り質問を1問だけ返してください。"
      ].join("\n\n"),
      schemaName: "ai_interview_follow_up_question",
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["prompt"],
        properties: {
          prompt: {
            type: "string",
            minLength: 1,
            maxLength: 70
          }
        }
      },
      parse(value) {
        const data = value && typeof value === "object" ? value as { prompt?: unknown } : null;
        return { prompt: validateFollowUpPrompt(data?.prompt) };
      }
    });
    return result.data;
  } catch (error) {
    const fallback = buildFallbackFollowUpQuestion(input);
    const errorCode = error instanceof StructuredAiRequestError ? error.code : resolveFallbackErrorCode(error);
    const model = error instanceof StructuredAiRequestError ? error.model : resolveAiModelPolicy("interview_follow_up_generate").model;
    await recordFallback(input, model, errorCode);
    return fallback;
  }
}
