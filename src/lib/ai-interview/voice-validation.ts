import { z } from "zod";

import { isAllowedAiInterviewAudioMimeType } from "@/lib/ai-interview/voice-mime";

export const AI_INTERVIEW_MAX_RECORDING_DURATION_MS = 2 * 60 * 1000;
export const AI_INTERVIEW_MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const AI_INTERVIEW_MIN_CONFIRMED_TEXT_LENGTH = 1;
export const AI_INTERVIEW_MAX_CONFIRMED_TEXT_LENGTH = 4000;

export const aiInterviewVoiceStartSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  questionId: z.string().trim().min(1, "質問IDが不正です"),
  mimeType: z
    .string()
    .trim()
    .refine((value) => isAllowedAiInterviewAudioMimeType(value), "対応していない録音形式です"),
  durationMs: z.number().int().positive("録音時間が不正です").max(AI_INTERVIEW_MAX_RECORDING_DURATION_MS, "録音は2分以内にしてください"),
  byteSize: z.number().int().positive("音声サイズが不正です").max(AI_INTERVIEW_MAX_AUDIO_BYTES, "音声サイズが大きすぎます"),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: "録音前に同意が必要です" })
  })
});

export const aiInterviewVoiceConfirmSchema = z.object({
  recordingSessionId: z.string().trim().min(1, "録音セッションIDが不正です"),
  confirmedText: z
    .string()
    .trim()
    .min(AI_INTERVIEW_MIN_CONFIRMED_TEXT_LENGTH, "文字起こし結果を確認してから保存してください")
    .max(AI_INTERVIEW_MAX_CONFIRMED_TEXT_LENGTH, "回答が長すぎます")
});

export function buildAiInterviewVoiceUploadFileName(mimeType: string) {
  if (mimeType.includes("ogg")) return "answer.ogg";
  if (mimeType.includes("mp4")) return "answer.m4a";
  return "answer.webm";
}
