import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUserInApi } from "@/lib/auth/require-user-api";
import { db } from "@/lib/db/client";
import {
  aiInterviewRecordingSessions,
  aiInterviewTranscriptions,
  aiInterviewTranscriptionSegments
} from "@/lib/db/schema";

export async function GET(_: Request, context: { params: Promise<{ recordingSessionId: string }> }) {
  const user = await requireUserInApi();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordingSessionId } = await context.params;
  const recording = (
    await db
      .select()
      .from(aiInterviewRecordingSessions)
      .where(and(eq(aiInterviewRecordingSessions.id, recordingSessionId), eq(aiInterviewRecordingSessions.userId, user.id)))
      .limit(1)
  )[0];

  if (!recording) {
    return NextResponse.json({ error: "録音セッションが見つかりませんでした" }, { status: 404 });
  }

  const transcription = (
    await db
      .select()
      .from(aiInterviewTranscriptions)
      .where(eq(aiInterviewTranscriptions.recordingSessionId, recording.id))
      .limit(1)
  )[0];

  const segments = transcription
    ? await db
        .select()
        .from(aiInterviewTranscriptionSegments)
        .where(eq(aiInterviewTranscriptionSegments.transcriptionId, transcription.id))
        .orderBy(asc(aiInterviewTranscriptionSegments.segmentIndex))
    : [];

  return NextResponse.json({
    id: recording.id,
    sessionId: recording.sessionId,
    questionId: recording.questionId,
    status: recording.status,
    mimeType: recording.mimeType,
    durationMs: recording.durationMs,
    byteSize: recording.byteSize,
    audioDeleteState: recording.audioDeleteState,
    lastErrorCode: recording.lastErrorCode,
    lastErrorSummary: recording.lastErrorSummary,
    transcript:
      transcription?.rawTranscriptText && recording.status !== "failed"
        ? {
            text: transcription.rawTranscriptText,
            normalizedText: transcription.normalizedTranscriptText,
            status: transcription.status,
            segments: segments.map((segment) => ({
              id: segment.id,
              startMs: segment.startMs,
              endMs: segment.endMs,
              text: segment.text
            }))
          }
        : null
  });
}
