"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { submitConfirmedInterviewAnswer } from "@/lib/ai-interview/submit-confirmed-answer";

const saveAiInterviewAttemptSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  questionId: z.string().trim().min(1, "質問IDが不正です"),
  answerText: z.string().trim().min(1, "回答を入力してください").max(4000, "回答が長すぎます")
});

export async function saveAiInterviewAttemptAction(input: { sessionId?: string; questionId: string; answerText: string }) {
  const user = await requireUser();
  const parsed = saveAiInterviewAttemptSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "面接回答の保存に失敗しました"
    };
  }

  try {
    const response = await submitConfirmedInterviewAnswer({
      userId: user.id,
      sessionId: parsed.data.sessionId,
      questionId: parsed.data.questionId,
      confirmedText: parsed.data.answerText,
      sourceKind: "text"
    });

    revalidatePath("/ai-interview");
    return response;
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "面接回答の保存に失敗しました"
    };
  }
}
