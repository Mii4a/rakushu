import { timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db/client";
import {
  aiInterviewAudioDeletionLogs,
  aiInterviewRecordingSessions,
  aiInterviewTranscriptions,
  aiInterviewTranscriptionSegments
} from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server";

const callbackSchema = z.object({
  recordingSessionId: z.string().min(1),
  status: z.enum(["succeeded", "failed"]),
  modelName: z.string().min(1),
  languageCode: z.string().default("ja"),
  rawTranscriptText: z.string().optional(),
  normalizedTranscriptText: z.string().optional(),
  tempObjectKey: z.string().optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  finishedAt: z.string().datetime({ offset: true }).optional(),
  deleteOutcome: z.enum(["deleted", "not_found", "failed"]).optional(),
  deleteActor: z.enum(["transcriber_finally", "scheduled_cleanup", "manual_repair"]).optional(),
  deleteDetailCode: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  segments: z
    .array(
      z.object({
        startMs: z.number(),
        endMs: z.number(),
        text: z.string(),
        avgLogprob: z.number().optional(),
        noSpeechProb: z.number().optional()
      })
    )
    .default([])
});

function hasValidCallbackSecret(headers: Headers) {
  if (!serverEnv.AI_INTERVIEW_CALLBACK_SECRET) {
    return false;
  }

  const provided = headers.get("x-ai-interview-callback-secret") ?? "";
  const expected = serverEnv.AI_INTERVIEW_CALLBACK_SECRET;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(providedBytes, expectedBytes);
}

export async function POST(request: Request) {
  if (!hasValidCallbackSecret(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = callbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid callback payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const recording = (
    await db
      .select()
      .from(aiInterviewRecordingSessions)
      .where(eq(aiInterviewRecordingSessions.id, payload.recordingSessionId))
      .limit(1)
  )[0];

  if (!recording) {
    return NextResponse.json({ error: "Recording session not found" }, { status: 404 });
  }

  const now = new Date();
  const transcription = (
    await db
      .select()
      .from(aiInterviewTranscriptions)
      .where(eq(aiInterviewTranscriptions.recordingSessionId, recording.id))
      .limit(1)
  )[0];

  const transcriptionId = transcription?.id ?? crypto.randomUUID();

  if (transcription) {
    await db
      .update(aiInterviewTranscriptions)
      .set({
        provider: "faster-whisper",
        modelName: payload.modelName,
        languageCode: payload.languageCode,
        rawTranscriptText: payload.rawTranscriptText ?? null,
        normalizedTranscriptText: payload.normalizedTranscriptText ?? null,
        status: payload.status === "succeeded" ? "succeeded" : "failed",
        startedAt: payload.startedAt ? new Date(payload.startedAt) : transcription.startedAt,
        finishedAt: payload.finishedAt ? new Date(payload.finishedAt) : now,
        updatedAt: now
      })
      .where(eq(aiInterviewTranscriptions.id, transcriptionId));
  } else {
    await db.insert(aiInterviewTranscriptions).values({
      id: transcriptionId,
      recordingSessionId: recording.id,
      provider: "faster-whisper",
      modelName: payload.modelName,
      languageCode: payload.languageCode,
      rawTranscriptText: payload.rawTranscriptText ?? null,
      normalizedTranscriptText: payload.normalizedTranscriptText ?? null,
      status: payload.status === "succeeded" ? "succeeded" : "failed",
      startedAt: payload.startedAt ? new Date(payload.startedAt) : now,
      finishedAt: payload.finishedAt ? new Date(payload.finishedAt) : now,
      createdAt: now,
      updatedAt: now
    });
  }

  await db.delete(aiInterviewTranscriptionSegments).where(eq(aiInterviewTranscriptionSegments.transcriptionId, transcriptionId));

  if (payload.segments.length > 0) {
    await db.insert(aiInterviewTranscriptionSegments).values(
      payload.segments.map((segment, index) => ({
        id: `${transcriptionId}:${index}`,
        transcriptionId,
        segmentIndex: index,
        startMs: Math.round(segment.startMs),
        endMs: Math.round(segment.endMs),
        text: segment.text,
        avgLogprob: typeof segment.avgLogprob === "number" ? String(segment.avgLogprob) : null,
        noSpeechProb: typeof segment.noSpeechProb === "number" ? String(segment.noSpeechProb) : null,
        createdAt: now
      }))
    );
  }

  if (payload.deleteOutcome) {
    await db.insert(aiInterviewAudioDeletionLogs).values({
      id: crypto.randomUUID(),
      recordingSessionId: recording.id,
      attemptedAt: payload.finishedAt ? new Date(payload.finishedAt) : now,
      actor: payload.deleteActor ?? "transcriber_finally",
      outcome: payload.deleteOutcome,
      detailCode: payload.deleteDetailCode ?? null,
      createdAt: now
    });
  }

  await db
    .update(aiInterviewRecordingSessions)
    .set({
      status: payload.status === "succeeded" ? "awaiting_confirmation" : "failed",
      tempObjectKey: payload.tempObjectKey ?? recording.tempObjectKey,
      audioDeleteState:
        payload.deleteOutcome === "deleted"
          ? "deleted"
          : payload.deleteOutcome === "not_found"
            ? "not_found"
            : payload.deleteOutcome === "failed"
              ? "delete_failed"
              : recording.audioDeleteState,
      audioDeletedAt: payload.deleteOutcome ? now : recording.audioDeletedAt,
      lastErrorCode: payload.status === "failed" ? payload.errorCode ?? "transcription_failed" : null,
      lastErrorSummary: payload.status === "failed" ? payload.errorMessage ?? "文字起こしに失敗しました" : null,
      updatedAt: now
    })
    .where(and(eq(aiInterviewRecordingSessions.id, recording.id), eq(aiInterviewRecordingSessions.userId, recording.userId)));

  return NextResponse.json({ ok: true });
}
