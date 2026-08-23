export type ResumeAiProposalMode = "draft" | "review" | "company";
export type ResumeAiProposalApplyTarget = "motivation" | "selfPr" | "all" | null;

export type ResumeAiProposal = {
  motivation: string;
  selfPr: string;
  changeSummary: string;
  evidenceSourceIds: string[];
};

export type ResumeAiProposalState = {
  motivation: string;
  selfPr: string;
  targetJobId: string | null;
  targetCompanyName: string | null;
  mode: ResumeAiProposalMode;
  loading: boolean;
  error: string | null;
  proposal: ResumeAiProposal | null;
};

export type ResumeAiProposalViewModel = {
  current: { motivation: string; selfPr: string };
  proposal: ResumeAiProposal | null;
};

export function buildResumeAiProposalViewModel(
  state: ResumeAiProposalState,
  proposal: ResumeAiProposal | null,
): ResumeAiProposalViewModel {
  return {
    current: { motivation: state.motivation, selfPr: state.selfPr },
    proposal,
  };
}

export function applyResumeAiProposal(
  state: ResumeAiProposalState,
  proposal: ResumeAiProposal,
  target: { field: ResumeAiProposalApplyTarget },
): { motivation: string; selfPr: string } {
  if (target.field === "motivation") {
    return { motivation: proposal.motivation, selfPr: state.selfPr };
  }
  if (target.field === "selfPr") {
    return { motivation: state.motivation, selfPr: proposal.selfPr };
  }
  if (target.field === "all") {
    return { motivation: proposal.motivation, selfPr: proposal.selfPr };
  }
  return { motivation: state.motivation, selfPr: state.selfPr };
}
