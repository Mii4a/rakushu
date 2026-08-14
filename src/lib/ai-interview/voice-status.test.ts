import { describe, expect, test } from "vitest";

import {
  canTransitionAiInterviewRecordingStatus,
  isAiInterviewTerminalRecordingStatus,
  isAiInterviewTranscriptReadyStatus
} from "@/lib/ai-interview/voice-status";

describe("ai interview voice status", () => {
  test("allows only declared recording transitions", () => {
    expect(canTransitionAiInterviewRecordingStatus("queued", "uploaded")).toBe(true);
    expect(canTransitionAiInterviewRecordingStatus("uploaded", "transcribing")).toBe(true);
    expect(canTransitionAiInterviewRecordingStatus("transcribing", "awaiting_confirmation")).toBe(true);
    expect(canTransitionAiInterviewRecordingStatus("awaiting_confirmation", "confirmed")).toBe(true);
    expect(canTransitionAiInterviewRecordingStatus("confirmed", "feedback_generating")).toBe(true);
    expect(canTransitionAiInterviewRecordingStatus("feedback_generating", "feedback_ready")).toBe(true);

    expect(canTransitionAiInterviewRecordingStatus("queued", "feedback_ready")).toBe(false);
    expect(canTransitionAiInterviewRecordingStatus("feedback_ready", "queued")).toBe(false);
    expect(canTransitionAiInterviewRecordingStatus("failed", "queued")).toBe(false);
  });

  test("knows transcript-ready and terminal statuses", () => {
    expect(isAiInterviewTranscriptReadyStatus("awaiting_confirmation")).toBe(true);
    expect(isAiInterviewTranscriptReadyStatus("feedback_ready")).toBe(true);
    expect(isAiInterviewTranscriptReadyStatus("queued")).toBe(false);

    expect(isAiInterviewTerminalRecordingStatus("feedback_ready")).toBe(true);
    expect(isAiInterviewTerminalRecordingStatus("failed")).toBe(true);
    expect(isAiInterviewTerminalRecordingStatus("awaiting_confirmation")).toBe(false);
  });
});
