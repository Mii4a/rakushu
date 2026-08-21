import { describe, expect, it } from "vitest";

import { applyResumeAiProposal, buildResumeAiProposalViewModel, type ResumeAiProposalState } from "./resume-ai-proposal-state";

const currentState: ResumeAiProposalState = {
  motivation: "現在の志望動機",
  selfPr: "現在の自己PR",
  targetJobId: "job-123",
  targetCompanyName: "株式会社テスト",
  mode: "company",
  loading: false,
  error: null,
  proposal: null,
};

const proposal = {
  motivation: "提案された志望動機",
  selfPr: "提案された自己PR",
  changeSummary: "変更点の要約",
  evidenceSourceIds: ["src-1", "src-2"],
};

describe("resume-ai-proposal-state", () => {
  it("builds a review model that preserves current values", () => {
    const next = buildResumeAiProposalViewModel(currentState, proposal);

    expect(next.current.motivation).toBe("現在の志望動機");
    expect(next.current.selfPr).toBe("現在の自己PR");
    expect(next.proposal?.motivation).toBe("提案された志望動機");
    expect(next.proposal?.selfPr).toBe("提案された自己PR");
    expect(next.proposal?.changeSummary).toBe("変更点の要約");
    expect(next.proposal?.evidenceSourceIds).toEqual(["src-1", "src-2"]);
  });

  it("applies only motivation without changing selfPr", () => {
    const next = applyResumeAiProposal(currentState, proposal, { field: "motivation" });

    expect(next.motivation).toBe("提案された志望動機");
    expect(next.selfPr).toBe("現在の自己PR");
  });

  it("applies only selfPr without changing motivation", () => {
    const next = applyResumeAiProposal(currentState, proposal, { field: "selfPr" });

    expect(next.motivation).toBe("現在の志望動機");
    expect(next.selfPr).toBe("提案された自己PR");
  });

  it("applies all fields to motivation and selfPr", () => {
    const next = applyResumeAiProposal(currentState, proposal, { field: "all" });

    expect(next.motivation).toBe("提案された志望動機");
    expect(next.selfPr).toBe("提案された自己PR");
  });

  it("discard leaves the current values unchanged", () => {
    const next = applyResumeAiProposal(currentState, proposal, { field: null });

    expect(next).toEqual({
      motivation: "現在の志望動機",
      selfPr: "現在の自己PR",
    });
  });
});
