"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { submitConfirmedInterviewAnswer } from "@/lib/ai-interview/submit-confirmed-answer";
import { aiInterviewVoiceConfirmSchema } from "@/lib/ai-interview/voice-validation";
import { db } from "@/lib/db/client";
import { aiInterviewRecordingSessions, aiInterviewTranscriptions } from "@/lib/db/schema";

const confirmVoiceAnswerSchema = aiInterviewVoiceConfirmSchema.extend({
  currentSessionId: z.string().trim().min(1).optional()
});

export async function confirmAiInterviewVoiceAnswerAction(input: {
  currentSessionId?: string;
  recordingSessionId: string;
  confirmedText: string;
}) {
  const user = await requireUser();
  const parsed = confirmVoiceAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "文字起こし結果の保存に失敗しました"
    };
  }

  const recording = (
    await db
      .select()
      .from(aiInterviewRecordingSessions)
      .where(and(eq(aiInterviewRecordingSessions.id, parsed.data.recordingSessionId), eq(aiInterviewRecordingSessions.userId, user.id)))
      .limit(1)
  )[0];

  if (!recording) {
    return { ok: false as const, message: "録音セッションが見つかりませんでした" };
  }

  const transcription = (
    await db
      .select()
      .from(aiInterviewTranscriptions)
      .where(eq(aiInterviewTranscriptions.recordingSessionId, recording.id))
      .limit(1)
  )[0];

  if (!transcription?.rawTranscriptText?.trim()) {
    return {
      ok: false as const,
      message: "文字起こし結果がまだ準備できていません"
    };
  }

  await db
    .update(aiInterviewRecordingSessions)
    .set({
      status: "feedback_generating",
      updatedAt: new Date()
    })
    .where(eq(aiInterviewRecordingSessions.id, recording.id));

  try {
    const response = await submitConfirmedInterviewAnswer({
      userId: user.id,
      sessionId: recording.sessionId ?? parsed.data.currentSessionId,
      questionId: recording.questionId,
      confirmedText: parsed.data.confirmedText,
      sourceKind: "voice_transcript",
      recordingSessionId: recording.id,
      rawTranscriptTextSnapshot: transcription.rawTranscriptText
    });

    revalidatePath("/ai-interview");
    return response;
  } catch (error) {
    await db
      .update(aiInterviewRecordingSessions)
      .set({
        status: "failed",
        lastErrorCode: "confirm_failed",
        lastErrorSummary: error instanceof Error ? error.message : "confirm_failed",
        updatedAt: new Date()
      })
      .where(eq(aiInterviewRecordingSessions.id, recording.id));

    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "文字起こし結果の保存に失敗しました"
    };
  }
}
