export const AI_INTERVIEW_PREFERRED_AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus"
] as const;

export function isAllowedAiInterviewAudioMimeType(value: string) {
  return AI_INTERVIEW_PREFERRED_AUDIO_MIME_TYPES.includes(value as (typeof AI_INTERVIEW_PREFERRED_AUDIO_MIME_TYPES)[number]);
}
