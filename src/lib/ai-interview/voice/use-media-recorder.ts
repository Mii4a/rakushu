import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AI_INTERVIEW_MAX_RECORDING_DURATION_MS } from "@/lib/ai-interview/voice-validation";

export type RecordedAiInterviewAudio = {
  blob: Blob;
  durationMs: number;
  mimeType: string;
};

export type AiInterviewRecorderStopReason = "manual" | "max_duration";

export function useAiInterviewMediaRecorder(preferredMimeType: string | null) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAiInterviewAudio | null>(null);
  const [lastStopReason, setLastStopReason] = useState<AiInterviewRecorderStopReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 150);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(async (reason: AiInterviewRecorderStopReason = "manual") => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return null;

    setLastStopReason(reason);

    return await new Promise<RecordedAiInterviewAudio | null>((resolve) => {
      const finalize = () => {
        const startedAt = startedAtRef.current ?? Date.now();
        const mimeType = mediaRecorder.mimeType || preferredMimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const nextRecordedAudio = {
          blob,
          durationMs: Math.min(Date.now() - startedAt, AI_INTERVIEW_MAX_RECORDING_DURATION_MS),
          mimeType
        } satisfies RecordedAiInterviewAudio;
        setRecordedAudio(nextRecordedAudio);
        chunksRef.current = [];
        startedAtRef.current = null;
        setIsRecording(false);
        cleanupStream();
        resolve(nextRecordedAudio);
      };

      if (mediaRecorder.state === "inactive") {
        finalize();
        return;
      }

      mediaRecorder.addEventListener("stop", finalize, { once: true });
      mediaRecorder.stop();
    });
  }, [cleanupStream, preferredMimeType]);

  const start = useCallback(async () => {
    if (!preferredMimeType) {
      setError("このブラウザでは音声録音に対応していません");
      return null;
    }

    try {
      setError(null);
      setRecordedAudio(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission("granted");

      const mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setIsRecording(true);
      mediaRecorder.start();
      stopTimerRef.current = window.setTimeout(() => {
        void stop("max_duration");
      }, AI_INTERVIEW_MAX_RECORDING_DURATION_MS);

      return stream;
    } catch {
      setPermission("denied");
      setError("マイクの利用が許可されていません");
      cleanupStream();
      return null;
    }
  }, [cleanupStream, preferredMimeType, stop]);

  const reset = useCallback(() => {
    setElapsedMs(0);
    setRecordedAudio(null);
    setLastStopReason(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  useEffect(() => cleanupStream, [cleanupStream]);

  return useMemo(
    () => ({
      permission,
      isRecording,
      elapsedMs,
      recordedAudio,
      lastStopReason,
      error,
      start,
      stop,
      reset,
      streamRef
    }),
    [elapsedMs, error, isRecording, lastStopReason, permission, recordedAudio, reset, start, stop]
  );
}
