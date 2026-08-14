import { beforeEach, describe, expect, it, vi } from "vitest";

const serverEnvMock = {
  AI_INTERVIEW_TRANSCRIBER_URL: "http://127.0.0.1:18080",
  AI_INTERVIEW_TRANSCRIBER_SECRET: "secret",
  AI_INTERVIEW_CALLBACK_SECRET: "callback-secret",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000"
};

vi.mock("@/lib/env/server", () => ({
  serverEnv: serverEnvMock
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("startAiInterviewTranscription", () => {
  it("returns a clear local-server message when the transcriber is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { startAiInterviewTranscription } = await import("./transcriber-client");

    const result = await startAiInterviewTranscription({
      recordingSessionId: "rec-1",
      questionId: "q-1",
      mimeType: "audio/webm;codecs=opus",
      durationMs: 4500,
      byteSize: 128,
      audioFile: new File([new Uint8Array([1, 2, 3])], "answer.webm", { type: "audio/webm;codecs=opus" })
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "transcriber_unreachable",
      message: "ローカル文字起こしサーバーに接続できませんでした。文字起こしサーバーが起動しているか確認してください"
    });
  });

  it("surfaces a server-provided error message for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "transcriber offline" })
      })
    );
    const { startAiInterviewTranscription } = await import("./transcriber-client");

    const result = await startAiInterviewTranscription({
      recordingSessionId: "rec-1",
      questionId: "q-1",
      mimeType: "audio/webm;codecs=opus",
      durationMs: 4500,
      byteSize: 128,
      audioFile: new File([new Uint8Array([1, 2, 3])], "answer.webm", { type: "audio/webm;codecs=opus" })
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "transcriber_http_503",
      message: "transcriber offline"
    });
  });
});
