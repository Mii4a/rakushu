import { serverEnv } from "@/lib/env/server";

export type StartAiInterviewTranscriptionInput = {
  recordingSessionId: string;
  questionId: string;
  mimeType: string;
  durationMs: number;
  byteSize: number;
  audioFile: File;
};

export type StartAiInterviewTranscriptionResult = {
  ok: true;
  tempObjectKey: string | null;
} | {
  ok: false;
  errorCode: string;
  message: string;
};

export function isAiInterviewTranscriberConfigured() {
  return Boolean(serverEnv.AI_INTERVIEW_TRANSCRIBER_URL && serverEnv.AI_INTERVIEW_TRANSCRIBER_SECRET && serverEnv.AI_INTERVIEW_CALLBACK_SECRET);
}

function isLocalTranscriberUrl(url: string) {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

function getTranscriberConnectionErrorMessage(url: string) {
  return isLocalTranscriberUrl(url)
    ? "ローカル文字起こしサーバーに接続できませんでした。文字起こしサーバーが起動しているか確認してください"
    : "文字起こしサーバーに接続できませんでした";
}

export async function startAiInterviewTranscription(
  input: StartAiInterviewTranscriptionInput
): Promise<StartAiInterviewTranscriptionResult> {
  if (!serverEnv.AI_INTERVIEW_TRANSCRIBER_URL || !serverEnv.AI_INTERVIEW_TRANSCRIBER_SECRET || !serverEnv.AI_INTERVIEW_CALLBACK_SECRET) {
    return {
      ok: false,
      errorCode: "transcriber_not_configured",
      message: "音声文字起こしの設定がまだ完了していません"
    };
  }

  const formData = new FormData();
  formData.set("recordingSessionId", input.recordingSessionId);
  formData.set("questionId", input.questionId);
  formData.set("mimeType", input.mimeType);
  formData.set("durationMs", String(input.durationMs));
  formData.set("byteSize", String(input.byteSize));
  formData.set("callbackUrl", `${serverEnv.NEXT_PUBLIC_APP_URL}/api/internal/ai-interview/transcriptions/callback`);
  formData.set("callbackSecret", serverEnv.AI_INTERVIEW_CALLBACK_SECRET);
  formData.set("audio", input.audioFile);

  const transcriberUrl = serverEnv.AI_INTERVIEW_TRANSCRIBER_URL;
  const endpoint = `${transcriberUrl}/transcriptions`;
  const send = async (secret: string) => {
    try {
      return await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`
        },
        body: formData,
        cache: "no-store"
      });
    } catch {
      return null;
    }
  };

  let response = await send(serverEnv.AI_INTERVIEW_TRANSCRIBER_SECRET);

  if (!response) {
    return {
      ok: false,
      errorCode: "transcriber_unreachable",
      message: getTranscriberConnectionErrorMessage(transcriberUrl)
    };
  }

  if (
    response.status === 401 &&
    isLocalTranscriberUrl(transcriberUrl) &&
    serverEnv.AI_INTERVIEW_TRANSCRIBER_SECRET !== "dev-secret"
  ) {
    response = await send("dev-secret");
    if (!response) {
      return {
        ok: false,
        errorCode: "transcriber_unreachable",
        message: getTranscriberConnectionErrorMessage(transcriberUrl)
      };
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    return {
      ok: false,
      errorCode: `transcriber_http_${response.status}`,
      message: payload?.error ?? payload?.message ?? "音声の送信に失敗しました"
    };
  }

  const payload = (await response.json().catch(() => ({}))) as { tempObjectKey?: string | null };
  return {
    ok: true,
    tempObjectKey: payload.tempObjectKey ?? null
  };
}
