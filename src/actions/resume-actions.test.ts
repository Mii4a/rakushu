import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockCompanyResearchReport } from "@/lib/company-research/mock-data";
import { PLAN_LIMITS } from "@/lib/plans";

const requireUserMock = vi.fn();
const getUserPlanMock = vi.fn();
const assertAiCreditsAvailableMock = vi.fn();
const consumeAiCreditsMock = vi.fn();
const generateResumeAiProposalMock = vi.fn();
const selectRowsQueue: unknown[][] = [];
const insertCalls: unknown[] = [];
const updateCalls: unknown[] = [];
const generateInputs: unknown[] = [];

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/subscription", () => ({ getUserPlan: getUserPlanMock }));
vi.mock("@/lib/usage/counters", () => ({ assertAiCreditsAvailable: assertAiCreditsAvailableMock, consumeAiCredits: consumeAiCreditsMock }));
vi.mock("@/lib/resume/ai-generator", () => ({
  generateResumeAiProposal: generateResumeAiProposalMock.mockImplementation(async (input) => {
    generateInputs.push(input);
    return { motivation: "提案された志望動機", selfPr: "提案された自己PR", changeSummary: "要約", evidenceSourceIds: ["src-1"] };
  })
}));
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => selectRowsQueue.shift() ?? [])
          })),
          limit: vi.fn(async () => selectRowsQueue.shift() ?? [])
        }))
      }))
    })),
    insert: vi.fn(() => ({ values: vi.fn(async (row) => insertCalls.push(row)) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async (clause) => updateCalls.push(clause)) })) }))
  }
}));

beforeEach(() => {
  requireUserMock.mockReset();
  getUserPlanMock.mockReset();
  assertAiCreditsAvailableMock.mockReset();
  consumeAiCreditsMock.mockReset();
  generateResumeAiProposalMock.mockReset();
  generateResumeAiProposalMock.mockImplementation(async (input) => {
    generateInputs.push(input);
    return { motivation: "提案された志望動機", selfPr: "提案された自己PR", changeSummary: "要約", evidenceSourceIds: ["src-1"] };
  });
  selectRowsQueue.length = 0;
  insertCalls.length = 0;
  updateCalls.length = 0;
  generateInputs.length = 0;
  requireUserMock.mockResolvedValue({ id: "user-1" });
  getUserPlanMock.mockResolvedValue("starter");
  assertAiCreditsAvailableMock.mockResolvedValue(undefined);
  consumeAiCreditsMock.mockResolvedValue(undefined);
});

async function loadAction() {
  return import("./resume-actions");
}

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("generateResumeAiProposalAction", () => {
  it("rejects unauthenticated users", async () => {
    requireUserMock.mockRejectedValueOnce(new Error("no user"));
    const { generateResumeAiProposalAction } = await loadAction();
    await expect(generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }))).rejects.toThrow();
  });

  it("rejects invalid draft input before any db or ai work", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("free");
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "", selfPr: "", education: "", experience: "", licenses: "" }));
    expect(result.error).toContain("入力");
    expect(assertAiCreditsAvailableMock).not.toHaveBeenCalled();
  });

  it("blocks plans without resume workspace", async () => {
    getUserPlanMock.mockResolvedValueOnce("free");
    PLAN_LIMITS.free.features.resumeWorkspace = false;
    try {
      const { generateResumeAiProposalAction } = await loadAction();
      const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
      expect(result.error).toContain("履歴書ワークスペース");
      expect(assertAiCreditsAvailableMock).not.toHaveBeenCalled();
    } finally {
      PLAN_LIMITS.free.features.resumeWorkspace = true;
    }
  });

  it("returns a generic error without leaking plan or database failures", async () => {
    getUserPlanMock.mockRejectedValueOnce(new Error("secret-plan-database-detail"));
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result).toEqual({ error: "履歴書AI提案の生成に失敗しました。時間をおいて再度お試しください。", proposal: null });
    expect(result.error).not.toContain("secret-plan-database-detail");
  });

  it("rejects company mode without jobId", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("対象求人");
  });

  it("rejects company mode when job is missing or owned by another user", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    selectRowsQueue.push([]);
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", jobId: "job-1", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("求人");
    expect(assertAiCreditsAvailableMock).not.toHaveBeenCalled();
  });

  it("rejects company mode when research is missing", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    selectRowsQueue.push([{ id: "job-1", companyName: "ACME", title: "Engineer" }], []);
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", jobId: "job-1", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("企業研究");
  });

  it("rejects malformed company research without consuming credits", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    selectRowsQueue.push([{ id: "job-1", userId: "user-1", companyName: "ACME", title: "Engineer" }], [{ id: "research-1", reportJson: "not-json", userId: "user-1", companyName: "ACME", createdAt: new Date() }]);
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", jobId: "job-1", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("企業研究");
    expect(assertAiCreditsAvailableMock).not.toHaveBeenCalled();
  });

  it("rejects company research with orphan citations before credit preflight", async () => {
    const report = buildMockCompanyResearchReport("ACME");
    report.sections[0]!.subsections[0]!.citations[0]!.sourceId = "missing-source";
    selectRowsQueue.push(
      [{ id: "job-1", companyName: "ACME", title: "Engineer" }],
      [{ id: "research-1", reportJson: JSON.stringify(report) }]
    );
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", jobId: "job-1", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("企業研究");
    expect(assertAiCreditsAvailableMock).not.toHaveBeenCalled();
    expect(generateResumeAiProposalMock).not.toHaveBeenCalled();
  });

  it("rejects a saved report for a different company before credit preflight", async () => {
    const report = buildMockCompanyResearchReport("Different Corp");
    selectRowsQueue.push(
      [{ id: "job-1", companyName: "ACME", title: "Engineer" }],
      [{ id: "research-1", reportJson: JSON.stringify(report) }]
    );
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", jobId: "job-1", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("企業研究");
    expect(assertAiCreditsAvailableMock).not.toHaveBeenCalled();
    expect(generateResumeAiProposalMock).not.toHaveBeenCalled();
  });

  it("passes only company job metadata and saved research to the generator", async () => {
    const report = buildMockCompanyResearchReport("ACME");
    selectRowsQueue.push(
      [{ id: "job-1", companyName: "ACME", title: "Engineer" }],
      [{ id: "research-1", reportJson: JSON.stringify(report) }],
      [{ id: "profile-1" }]
    );
    const { generateResumeAiProposalAction } = await loadAction();
    await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "company", jobId: "job-1", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(generateInputs[0]).toMatchObject({ mode: "company", targetJob: { id: "job-1", companyName: "ACME", title: "Engineer" }, companyResearch: { id: "research-1" } });
    const serialized = JSON.stringify(generateInputs[0]);
    expect(serialized).not.toContain("sourceChunks");
    expect(serialized).not.toContain("rawText");
    expect(serialized).not.toContain("sourceUrl");
    expect(serialized).not.toContain("fullName");
  });

  it("uses draft and review action keys for non-company modes", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    selectRowsQueue.push([{ id: "profile-1", userId: "user-1" }]);
    const { generateResumeAiProposalAction } = await loadAction();
    await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect((generateInputs[0] as { mode: string }).mode).toBe("draft");
    generateInputs.length = 0;
    selectRowsQueue.push([{ id: "profile-1", userId: "user-1" }]);
    await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "review", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect((generateInputs[0] as { mode: string }).mode).toBe("review");
  });

  it("stops on credit preflight failure before generation", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    assertAiCreditsAvailableMock.mockRejectedValueOnce(new Error("今月のAIクレジット上限（1）に達しています。"));
    selectRowsQueue.push([{ id: "profile-1", userId: "user-1" }]);
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("AIクレジット");
    expect(generateInputs).toHaveLength(0);
  });

  it("returns a generic error when generation fails", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    assertAiCreditsAvailableMock.mockResolvedValueOnce(undefined);
    selectRowsQueue.push([{ id: "profile-1", userId: "user-1" }]);
    generateResumeAiProposalMock.mockRejectedValueOnce(new Error("boom"));
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toContain("失敗");
    expect(consumeAiCreditsMock).not.toHaveBeenCalled();
  });

  it("returns proposal null when post-generation credit settlement fails", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    assertAiCreditsAvailableMock.mockResolvedValueOnce(undefined);
    consumeAiCreditsMock.mockRejectedValueOnce(new Error("今月のAIクレジット上限（1）に達しています。"));
    selectRowsQueue.push([{ id: "profile-1", userId: "user-1" }]);
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.proposal).toBeNull();
    expect(result.error).toContain("AIクレジット");
  });

  it("succeeds once with no db writes and returns a proposal", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    assertAiCreditsAvailableMock.mockResolvedValueOnce(undefined);
    consumeAiCreditsMock.mockResolvedValueOnce(undefined);
    selectRowsQueue.push([{ id: "profile-1", userId: "user-1" }]);
    const { generateResumeAiProposalAction } = await loadAction();
    const result = await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(result.error).toBeNull();
    expect(result.proposal).toMatchObject({ changeSummary: "要約" });
    expect(assertAiCreditsAvailableMock.mock.invocationCallOrder[0]).toBeLessThan(generateResumeAiProposalMock.mock.invocationCallOrder[0]);
    expect(generateResumeAiProposalMock.mock.invocationCallOrder[0]).toBeLessThan(consumeAiCreditsMock.mock.invocationCallOrder[0]);
    expect(assertAiCreditsAvailableMock).toHaveBeenCalledWith("user-1", "resume_ai");
    expect(consumeAiCreditsMock).toHaveBeenCalledWith("user-1", "resume_ai");
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("finds an existing profile id or falls back to unsaved", async () => {
    requireUserMock.mockResolvedValueOnce({ id: "user-1" });
    getUserPlanMock.mockResolvedValueOnce("starter");
    assertAiCreditsAvailableMock.mockResolvedValueOnce(undefined);
    consumeAiCreditsMock.mockResolvedValueOnce(undefined);
    selectRowsQueue.push([]);
    const { generateResumeAiProposalAction } = await loadAction();
    await generateResumeAiProposalAction({ error: null, proposal: null }, formData({ mode: "draft", motivation: "m", selfPr: "s", education: "e", experience: "x", licenses: "l" }));
    expect(generateInputs[0]).toMatchObject({ resumeProfileId: "unsaved" });
  });
});
