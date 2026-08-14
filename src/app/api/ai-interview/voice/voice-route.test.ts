import { beforeEach, describe, expect, it, vi } from "vitest";

type SelectResultQueue = unknown[][];

type DbMock = {
  selectQueue: SelectResultQueue;
  inserts: unknown[];
  updates: unknown[];
  deletes: unknown[];
  select: () => {
    from: (_table: unknown) => {
      where: (_condition: unknown) => {
        limit: (_count: number) => Promise<unknown[]>;
        orderBy: (_order: unknown) => Promise<unknown[]>;
      };
    };
  };
  insert: (table: unknown) => {
    values: (value: unknown) => Promise<void>;
  };
  update: (table: unknown) => {
    set: (value: unknown) => {
      where: (_condition: unknown) => Promise<void>;
    };
  };
  delete: (table: unknown) => {
    where: (_condition: unknown) => Promise<void>;
  };
};

function createDbMock(): DbMock {
  return {
    selectQueue: [],
    inserts: [],
    updates: [],
    deletes: [],
    select() {
      return {
        from: () => ({
          where: () => ({
            limit: async () => this.selectQueue.shift() ?? [],
            orderBy: async () => this.selectQueue.shift() ?? []
          })
        })
      };
    },
    insert(table) {
      return {
        values: async (value) => {
          this.inserts.push({ table, value });
        }
      };
    },
    update(table) {
      return {
        set: (value) => ({
          where: async () => {
            this.updates.push({ table, value });
          }
        })
      };
    },
    delete(table) {
      return {
        where: async () => {
          this.deletes.push({ table });
        }
      };
    }
  };
}

const requireUserInApiMock = vi.fn();
const getUserPlanMock = vi.fn();
const startAiInterviewTranscriptionMock = vi.fn();
const dbMock = createDbMock();

vi.mock("@/lib/auth/require-user-api", () => ({
  requireUserInApi: requireUserInApiMock
}));

vi.mock("@/lib/subscription", () => ({
  getUserPlan: getUserPlanMock
}));

vi.mock("@/lib/ai-interview/transcriber-client", () => ({
  startAiInterviewTranscription: startAiInterviewTranscriptionMock
}));

vi.mock("@/lib/db/client", () => ({
  db: dbMock
}));

vi.mock("@/lib/env/server", () => ({
  serverEnv: {
    AI_INTERVIEW_RECORDING_POLICY_VERSION: "2026-06-15",
    AI_INTERVIEW_CALLBACK_SECRET: "callback-secret"
  }
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  dbMock.selectQueue = [];
  dbMock.inserts = [];
  dbMock.updates = [];
  dbMock.deletes = [];
  requireUserInApiMock.mockResolvedValue({ id: "user-1" });
  getUserPlanMock.mockResolvedValue("plus");
  startAiInterviewTranscriptionMock.mockResolvedValue({ ok: true, tempObjectKey: "temp-123" });
});

describe("POST /api/ai-interview/voice/start", () => {
  it("returns 401 when the user is not authenticated", async () => {
    requireUserInApiMock.mockResolvedValueOnce(null);
    const { POST } = await import("./start/route");

    const formData = new FormData();
    const request = new Request("http://localhost/api/ai-interview/voice/start", { method: "POST", body: formData });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("creates recording + consent rows and queues the transcriber for a valid upload", async () => {
    const { POST } = await import("./start/route");

    const formData = new FormData();
    formData.set("questionId", "new-grad-selfIntro-1");
    formData.set("mimeType", "audio/webm;codecs=opus");
    formData.set("durationMs", "4500");
    formData.set("byteSize", "128");
    formData.set("consentAccepted", "true");
    formData.set("audio", new File([new Uint8Array([1, 2, 3])], "answer.webm", { type: "audio/webm;codecs=opus" }));

    const request = new Request("http://localhost/api/ai-interview/voice/start", {
      method: "POST",
      body: formData,
      headers: {
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1"
      }
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.recordingSessionId).toEqual(expect.any(String));
    expect(payload.status).toBe("queued");
    expect(dbMock.inserts).toHaveLength(2);
    expect(startAiInterviewTranscriptionMock).toHaveBeenCalledTimes(1);
    expect(dbMock.updates).toHaveLength(1);
    expect(dbMock.updates[0]).toMatchObject({ value: expect.objectContaining({ status: "queued", tempObjectKey: "temp-123" }) });
  });

  it("creates recording + consent rows and queues the transcriber for a generated follow-up question id", async () => {
    const { POST } = await import("./start/route");

    const formData = new FormData();
    formData.set("questionId", "new-grad-selfIntro-2");
    formData.set("mimeType", "audio/webm;codecs=opus");
    formData.set("durationMs", "4500");
    formData.set("byteSize", "128");
    formData.set("consentAccepted", "true");
    formData.set("audio", new File([new Uint8Array([1, 2, 3])], "answer.webm", { type: "audio/webm;codecs=opus" }));

    const response = await POST(new Request("http://localhost/api/ai-interview/voice/start", { method: "POST", body: formData }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(startAiInterviewTranscriptionMock).toHaveBeenCalledTimes(1);
    expect(dbMock.inserts).toHaveLength(2);
  });

  it("marks the recording as failed when the transcriber returns an error", async () => {
    startAiInterviewTranscriptionMock.mockResolvedValueOnce({
      ok: false,
      errorCode: "transcriber_down",
      message: "音声の送信に失敗しました"
    });
    const { POST } = await import("./start/route");

    const formData = new FormData();
    formData.set("questionId", "new-grad-selfIntro-1");
    formData.set("mimeType", "audio/webm;codecs=opus");
    formData.set("durationMs", "4500");
    formData.set("byteSize", "128");
    formData.set("consentAccepted", "true");
    formData.set("audio", new File([new Uint8Array([1, 2, 3])], "answer.webm", { type: "audio/webm;codecs=opus" }));

    const response = await POST(new Request("http://localhost/api/ai-interview/voice/start", { method: "POST", body: formData }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toBe("音声の送信に失敗しました");
    expect(dbMock.updates[0]).toMatchObject({
      value: expect.objectContaining({ status: "failed", lastErrorCode: "transcriber_down" })
    });
  });
});

describe("GET /api/ai-interview/voice/[recordingSessionId]", () => {
  it("returns the owned recording session with transcript data", async () => {
    requireUserInApiMock.mockResolvedValueOnce({ id: "user-1" });
    dbMock.selectQueue.push(
      [
        {
          id: "rec-1",
          sessionId: "session-1",
          questionId: "gakuchika",
          status: "awaiting_confirmation",
          mimeType: "audio/webm;codecs=opus",
          durationMs: 4500,
          byteSize: 128,
          audioDeleteState: "deleted",
          lastErrorCode: null,
          lastErrorSummary: null
        }
      ],
      [
        {
          id: "tx-1",
          recordingSessionId: "rec-1",
          rawTranscriptText: "こんにちは",
          normalizedTranscriptText: "こんにちは",
          status: "succeeded"
        }
      ],
      [
        {
          id: "seg-1",
          startMs: 0,
          endMs: 1200,
          text: "こんにちは"
        }
      ]
    );
    const { GET } = await import("./[recordingSessionId]/route");

    const response = await GET(new Request("http://localhost/api/ai-interview/voice/rec-1"), {
      params: Promise.resolve({ recordingSessionId: "rec-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: "rec-1",
      status: "awaiting_confirmation",
      transcript: {
        text: "こんにちは",
        status: "succeeded",
        segments: [{ id: "seg-1", startMs: 0, endMs: 1200, text: "こんにちは" }]
      }
    });
  });
});

describe("POST /api/internal/ai-interview/transcriptions/callback", () => {
  it("rejects requests with a bad callback secret", async () => {
    const { POST } = await import("../../internal/ai-interview/transcriptions/callback/route");

    const response = await POST(
      new Request("http://localhost/api/internal/ai-interview/transcriptions/callback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ai-interview-callback-secret": "wrong-secret"
        },
        body: JSON.stringify({ recordingSessionId: "rec-1", status: "succeeded", modelName: "large-v3-turbo" })
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("persists transcript + deletion info and updates the recording status on success", async () => {
    dbMock.selectQueue.push(
      [
        {
          id: "rec-1",
          userId: "user-1",
          tempObjectKey: "temp-123",
          audioDeleteState: "pending",
          audioDeletedAt: null
        }
      ],
      []
    );
    const { POST } = await import("../../internal/ai-interview/transcriptions/callback/route");

    const response = await POST(
      new Request("http://localhost/api/internal/ai-interview/transcriptions/callback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ai-interview-callback-secret": "callback-secret"
        },
        body: JSON.stringify({
          recordingSessionId: "rec-1",
          status: "succeeded",
          modelName: "large-v3-turbo",
          languageCode: "ja",
          rawTranscriptText: "こんにちは",
          normalizedTranscriptText: "こんにちは",
          tempObjectKey: "temp-123",
          startedAt: "2026-06-15T13:15:00+00:00",
          finishedAt: "2026-06-15T13:15:02+00:00",
          deleteOutcome: "deleted",
          deleteActor: "transcriber_finally",
          segments: [{ startMs: 0, endMs: 1200, text: "こんにちは", avgLogprob: -0.1, noSpeechProb: 0.01 }]
        })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(dbMock.inserts.length).toBeGreaterThanOrEqual(3);
    expect(dbMock.updates.at(-1)).toMatchObject({
      value: expect.objectContaining({ status: "awaiting_confirmation", audioDeleteState: "deleted", lastErrorCode: null })
    });
  });
});
