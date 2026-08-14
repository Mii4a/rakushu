import { describe, expect, test } from "vitest";

import {
  aiInterviewVoiceConfirmSchema,
  aiInterviewVoiceStartSchema,
  AI_INTERVIEW_MAX_AUDIO_BYTES,
  AI_INTERVIEW_MAX_RECORDING_DURATION_MS,
  buildAiInterviewVoiceUploadFileName
} from "@/lib/ai-interview/voice-validation";

describe("ai interview voice validation", () => {
  test("accepts supported mime type and consent", () => {
    const parsed = aiInterviewVoiceStartSchema.safeParse({
      questionId: "gakuchika",
      mimeType: "audio/webm;codecs=opus",
      durationMs: AI_INTERVIEW_MAX_RECORDING_DURATION_MS,
      byteSize: AI_INTERVIEW_MAX_AUDIO_BYTES,
      consentAccepted: true
    });

    expect(parsed.success).toBe(true);
  });

  test("rejects unsupported mime type and oversized recording", () => {
    const parsed = aiInterviewVoiceStartSchema.safeParse({
      questionId: "gakuchika",
      mimeType: "audio/wav",
      durationMs: AI_INTERVIEW_MAX_RECORDING_DURATION_MS + 1,
      byteSize: AI_INTERVIEW_MAX_AUDIO_BYTES + 1,
      consentAccepted: true
    });

    expect(parsed.success).toBe(false);
  });

  test("requires confirmed text before final feedback submission", () => {
    expect(
      aiInterviewVoiceConfirmSchema.safeParse({
        recordingSessionId: "rec-1",
        confirmedText: "   "
      }).success
    ).toBe(false);
  });

  test("builds stable upload filenames from mime type", () => {
    expect(buildAiInterviewVoiceUploadFileName("audio/webm;codecs=opus")).toBe("answer.webm");
    expect(buildAiInterviewVoiceUploadFileName("audio/ogg;codecs=opus")).toBe("answer.ogg");
    expect(buildAiInterviewVoiceUploadFileName("audio/mp4")).toBe("answer.m4a");
  });
});
