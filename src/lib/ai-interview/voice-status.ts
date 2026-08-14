export const AI_INTERVIEW_RECORDING_STATUSES = [
  "queued",
  "uploaded",
  "transcribing",
  "awaiting_confirmation",
  "confirmed",
  "feedback_generating",
  "feedback_ready",
  "failed",
  "expired"
] as const;

export type AiInterviewRecordingStatus = (typeof AI_INTERVIEW_RECORDING_STATUSES)[number];

export const AI_INTERVIEW_TRANSCRIPTION_STATUSES = ["queued", "running", "succeeded", "failed"] as const;

export type AiInterviewTranscriptionStatus = (typeof AI_INTERVIEW_TRANSCRIPTION_STATUSES)[number];

export const AI_INTERVIEW_AUDIO_DELETE_STATES = ["pending", "deleted", "delete_failed", "not_found"] as const;

export type AiInterviewAudioDeleteState = (typeof AI_INTERVIEW_AUDIO_DELETE_STATES)[number];

export const AI_INTERVIEW_AUDIO_DELETE_ACTORS = ["transcriber_finally", "scheduled_cleanup", "manual_repair"] as const;

export type AiInterviewAudioDeleteActor = (typeof AI_INTERVIEW_AUDIO_DELETE_ACTORS)[number];

export const AI_INTERVIEW_AUDIO_DELETE_OUTCOMES = ["deleted", "not_found", "failed"] as const;

export type AiInterviewAudioDeleteOutcome = (typeof AI_INTERVIEW_AUDIO_DELETE_OUTCOMES)[number];

const allowedTransitions = {
  queued: ["uploaded", "transcribing", "failed", "expired"],
  uploaded: ["transcribing", "failed", "expired"],
  transcribing: ["awaiting_confirmation", "failed", "expired"],
  awaiting_confirmation: ["confirmed", "expired", "failed"],
  confirmed: ["feedback_generating", "feedback_ready", "failed"],
  feedback_generating: ["feedback_ready", "failed"],
  feedback_ready: [],
  failed: [],
  expired: []
} satisfies Record<AiInterviewRecordingStatus, readonly AiInterviewRecordingStatus[]>;

export function canTransitionAiInterviewRecordingStatus(
  from: AiInterviewRecordingStatus,
  to: AiInterviewRecordingStatus
): boolean {
  const transitions = allowedTransitions[from] as readonly AiInterviewRecordingStatus[];
  return transitions.includes(to);
}

export function isAiInterviewTerminalRecordingStatus(status: AiInterviewRecordingStatus): boolean {
  return status === "feedback_ready" || status === "failed" || status === "expired";
}

export function isAiInterviewTranscriptReadyStatus(status: AiInterviewRecordingStatus): boolean {
  return status === "awaiting_confirmation" || status === "confirmed" || status === "feedback_generating" || status === "feedback_ready";
}
