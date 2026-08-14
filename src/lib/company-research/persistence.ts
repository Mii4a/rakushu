import type { CompanyResearchRecentItem, CompanyResearchResult } from "@/lib/company-research/mock-data";
import { buildPersistedWorkspaceState, type PersistedWorkspaceRecord } from "@/lib/persisted-workspace-state";

export type StoredCompanyResearch = {
  id: string;
  query: string;
  companyName: string;
  industry: string;
  location: string;
  size: string;
  summary: string;
  keyPoints: string[];
  interviewHints: string[];
  nextActions: string[];
  report: CompanyResearchResult["report"];
  chatMessages: CompanyResearchResult["chatMessages"];
  status: string;
  createdAt: Date;
};

export function buildCompanyResearchUiState(researches: StoredCompanyResearch[]): {
  recentItems: CompanyResearchRecentItem[];
  activeResult: CompanyResearchResult | null;
  activeQuery: string | null;
} {
  const state = buildPersistedWorkspaceState<
    string,
    CompanyResearchResult,
    { companyName: string; status: string },
    CompanyResearchRecentItem
  >(
    researches.map((item) => ({
      id: item.id,
      input: item.query,
      detail: {
        companyName: item.companyName,
        industry: item.industry,
        location: item.location,
        size: item.size,
        summary: item.summary,
        keyPoints: item.keyPoints,
        interviewHints: item.interviewHints,
        nextActions: item.nextActions,
        report: item.report,
        chatMessages: item.chatMessages
      },
      history: {
        companyName: item.companyName,
        status: item.status
      },
      createdAt: item.createdAt
    })) satisfies Array<PersistedWorkspaceRecord<string, CompanyResearchResult, { companyName: string; status: string }>>,
    {
      toHistoryItem: (record) => ({
        id: record.id,
        companyName: record.history.companyName,
        researchedAt: record.createdAt.toLocaleDateString("ja-JP"),
        status: record.history.status
      }),
      toActiveDetail: (record) => record.detail,
      getActiveInput: (record) => record.input
    }
  );

  return {
    recentItems: state.historyItems,
    activeResult: state.activeDetail,
    activeQuery: state.activeInput
  };
}
