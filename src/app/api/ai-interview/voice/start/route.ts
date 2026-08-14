import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUserInApi } from "@/lib/auth/require-user-api";
import { startAiInterviewTranscription } from "@/lib/ai-interview/transcriber-client";
import { findAiInterviewQuestionById } from "@/lib/ai-interview/scenario-questions";
import {
  aiInterviewVoiceStartSchema,
  buildAiInterviewVoiceUploadFileName
} from "@/lib/ai-interview/voice-validation";
import { db } from "@/lib/db/client";
import {
  aiInterviewRecordingConsents,
  aiInterviewRecordingSessions,
  aiInterviewSessions
} from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

const consentText = "録音音声は文字起こしのために一時保存され、処理後に削除されます。AI添削には、あなたが確認した文字テキストだけが使われます。";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const user = await requireUserInApi();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    if (!PLAN_LIMITS[plan].features.aiInterview) {
      return NextResponse.json({ error: "AI面接は Plus プラン以上で利用できます。" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("audio");
    const questionId = String(formData.get("questionId") ?? "");
    const sessionIdRaw = String(formData.get("sessionId") ?? "").trim();
    const mimeType = String(formData.get("mimeType") ?? "");
    const durationMs = Number(formData.get("durationMs") ?? 0);
    const byteSize = Number(formData.get("byteSize") ?? 0);
    const consentAccepted = String(formData.get("consentAccepted") ?? "") === "true";

    const parsed = aiInterviewVoiceStartSchema.safeParse({
      sessionId: sessionIdRaw || undefined,
      questionId,
      mimeType,
      durationMs,
      byteSize,
      consentAccepted
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "録音データが不正です" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "音声ファイルが見つかりませんでした" }, { status: 400 });
    }

    const question = findAiInterviewQuestionById(parsed.data.questionId);
    if (!question) {
      return NextResponse.json({ error: "質問が見つかりませんでした" }, { status: 404 });
    }

    if (parsed.data.sessionId) {
      const existingSession = (
        await db
          .select()
          .from(aiInterviewSessions)
          .where(and(eq(aiInterviewSessions.id, parsed.data.sessionId), eq(aiInterviewSessions.userId, user.id)))
          .limit(1)
      )[0];

      if (!existingSession) {
        return NextResponse.json({ error: "面接セッションが見つかりませんでした" }, { status: 404 });
      }
    }

    const now = new Date();
    const recordingSessionId = crypto.randomUUID();
    const uploadFile = new File([await file.arrayBuffer()], buildAiInterviewVoiceUploadFileName(parsed.data.mimeType), {
      type: parsed.data.mimeType
    });

    await db.insert(aiInterviewRecordingSessions).values({
      id: recordingSessionId,
      userId: user.id,
      sessionId: parsed.data.sessionId,
      questionId: question.id,
      inputMethod: "voice",
      status: "uploaded",
      mimeType: parsed.data.mimeType,
      durationMs: parsed.data.durationMs,
      byteSize: parsed.data.byteSize,
      createdAt: now,
      updatedAt: now
    });

    await db.insert(aiInterviewRecordingConsents).values({
      id: crypto.randomUUID(),
      userId: user.id,
      recordingSessionId,
      policyVersion: serverEnv.AI_INTERVIEW_RECORDING_POLICY_VERSION,
      consentTextHash: sha256(consentText),
      consentedAt: now,
      ipHash: request.headers.get("x-forwarded-for") ? sha256(request.headers.get("x-forwarded-for") ?? "") : null,
      userAgentHash: request.headers.get("user-agent") ? sha256(request.headers.get("user-agent") ?? "") : null,
      createdAt: now
    });

    const transcriber = await startAiInterviewTranscription({
      recordingSessionId,
      questionId: question.id,
      mimeType: parsed.data.mimeType,
      durationMs: parsed.data.durationMs,
      byteSize: parsed.data.byteSize,
      audioFile: uploadFile
    });

    if (!transcriber.ok) {
      await db
        .update(aiInterviewRecordingSessions)
        .set({
          status: "failed",
          lastErrorCode: transcriber.errorCode,
          lastErrorSummary: transcriber.message,
          updatedAt: new Date()
        })
        .where(eq(aiInterviewRecordingSessions.id, recordingSessionId));

      return NextResponse.json({ error: transcriber.message, recordingSessionId }, { status: 503 });
    }

    await db
      .update(aiInterviewRecordingSessions)
      .set({
        status: "queued",
        tempObjectKey: transcriber.tempObjectKey,
        updatedAt: new Date()
      })
      .where(eq(aiInterviewRecordingSessions.id, recordingSessionId));

    return NextResponse.json({
      ok: true,
      recordingSessionId,
      status: "queued"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "録音開始に失敗しました" },
      { status: 500 }
    );
  }
}
