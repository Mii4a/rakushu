import type { AiInterviewCategoryDefinition } from "@/lib/ai-interview/setup-scenarios";

import { requestAiInterviewJson } from "@/lib/ai-interview/ai-openai-json";

export type AiInterviewFollowUpInput = {
  category: AiInterviewCategoryDefinition;
  companyName: string;
  targetRole: string;
  existingAnswers: Array<{
    prompt: string;
    answerText: string;
  }>;
};

export type AiInterviewFollowUpOutput = {
  prompt: string;
};

function buildFallbackFollowUpQuestion(input: AiInterviewFollowUpInput): AiInterviewFollowUpOutput {
  const lastAnswer = input.existingAnswers[input.existingAnswers.length - 1];
  if (lastAnswer?.prompt.includes("自己紹介")) {
    return { prompt: "自己紹介の中で、周囲からどんな役割を期待されることが多いですか？" };
  }

  return {
    prompt: `${input.category.label}について、先ほどの回答の中で特に具体化できる場面を1つ選んで詳しく教えてください。`
  };
}

export async function buildAiInterviewFollowUpQuestion(input: AiInterviewFollowUpInput): Promise<AiInterviewFollowUpOutput> {
  try {
    return await requestAiInterviewJson<AiInterviewFollowUpOutput>({
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
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: {
            type: "string"
          }
        },
        required: ["prompt"]
      }
    });
  } catch {
    return buildFallbackFollowUpQuestion(input);
  }
}
