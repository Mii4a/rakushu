import type { AiInterviewCategoryDefinition } from "@/lib/ai-interview/setup-scenarios";

import { requestAiInterviewJson } from "@/lib/ai-interview/ai-openai-json";

export type AiInterviewCategoryFeedbackInput = {
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

export async function buildAiInterviewCategoryFeedback(
  input: AiInterviewCategoryFeedbackInput
): Promise<AiInterviewCategoryFeedbackOutput> {
  try {
    return await requestAiInterviewJson<AiInterviewCategoryFeedbackOutput>({
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
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          overallScore: { type: "number" },
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          nextFocus: { type: "string" },
          nextQuestions: { type: "array", items: { type: "string" } }
        },
        required: ["overallScore", "summary", "strengths", "improvements", "nextFocus", "nextQuestions"]
      }
    });
  } catch {
    return buildFallbackCategoryFeedback(input);
  }
}
