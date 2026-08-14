import { AI_INTERVIEW_PREFERRED_AUDIO_MIME_TYPES } from "@/lib/ai-interview/voice-mime";

export function getSupportedAiInterviewMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }

  return AI_INTERVIEW_PREFERRED_AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}
