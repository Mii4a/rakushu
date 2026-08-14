import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserMock = vi.fn();
const submitConfirmedInterviewAnswerMock = vi.fn();

const dbMock = {
  selectQueue: [] as unknown[][],
  updates: [] as unknown[],
  select() {
    return {
      from: () => ({
        where: () => ({
          limit: async () => this.selectQueue.shift() ?? []
        })
      })
    };
  },
  update(table: unknown) {
    return {
      set: (value: unknown) => ({
        where: async () => {
          this.updates.push({ table, value });
        }
      })
    };
  }
};

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock
}));

vi.mock("@/lib/ai-interview/submit-confirmed-answer", () => ({
  submitConfirmedInterviewAnswer: submitConfirmedInterviewAnswerMock
}));

vi.mock("@/lib/db/client", () => ({
  db: dbMock
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  dbMock.selectQueue = [];
  dbMock.updates = [];
  requireUserMock.mockResolvedValue({ id: "user-1" });
  submitConfirmedInterviewAnswerMock.mockResolvedValue({
    ok: true,
    savedAttempt: {
      id: "answer-1",
      sessionId: "session-1",
      questionId: "gakuchika",
      prompt: "学生時代に力を入れたことを教えてください。",
      answerText: "編集済みテキスト",
      score: 4.2,
      strengths: ["結論が先"],
      improvements: ["数字を足す"],
      followUps: ["再現性は？"],
      createdAt: new Date("2026-06-15T00:00:00.000Z")
    }
  });
});

describe("confirmAiInterviewVoiceAnswerAction", () => {
  it(
    "rejects when transcription text is not ready yet",
    async () => {
      dbMock.selectQueue.push(
        [
          {
            id: "rec-1",
            userId: "user-1",
            sessionId: "session-1",
            questionId: "gakuchika"
          }
        ],
        []
      );

      const { confirmAiInterviewVoiceAnswerAction } = await import("./ai-interview-voice-actions");
      const response = await confirmAiInterviewVoiceAnswerAction({
        currentSessionId: "session-1",
        recordingSessionId: "rec-1",
        confirmedText: "編集済みテキスト"
      });

      expect(response).toEqual({ ok: false, message: "文字起こし結果がまだ準備できていません" });
      expect(submitConfirmedInterviewAnswerMock).not.toHaveBeenCalled();
    },
    10000
  );

  it("uses the edited confirmed text instead of the raw transcript text", async () => {
    dbMock.selectQueue.push(
      [
        {
          id: "rec-1",
          userId: "user-1",
          sessionId: "session-1",
          questionId: "gakuchika"
        }
      ],
      [
        {
          recordingSessionId: "rec-1",
          rawTranscriptText: "生の文字起こし"
        }
      ]
    );

    const { confirmAiInterviewVoiceAnswerAction } = await import("./ai-interview-voice-actions");
    const response = await confirmAiInterviewVoiceAnswerAction({
      currentSessionId: "session-1",
      recordingSessionId: "rec-1",
      confirmedText: "編集済みテキスト"
    });

    expect(response.ok).toBe(true);
    expect(submitConfirmedInterviewAnswerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmedText: "編集済みテキスト",
        rawTranscriptTextSnapshot: "生の文字起こし",
        recordingSessionId: "rec-1",
        sourceKind: "voice_transcript"
      })
    );
    expect(dbMock.updates[0]).toMatchObject({ value: expect.objectContaining({ status: "feedback_generating" }) });
  });
});
