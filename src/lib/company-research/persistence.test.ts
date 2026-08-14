import { describe, expect, test } from "vitest";

import { buildMockCompanyResearchReport, type CompanyResearchResult } from "@/lib/company-research/mock-data";
import { buildCompanyResearchUiState } from "@/lib/company-research/persistence";

const baseResult: CompanyResearchResult = {
  companyName: "株式会社テスト",
  industry: "IT",
  location: "東京都",
  size: "100人",
  summary: "要約",
  keyPoints: ["要点1"],
  interviewHints: ["論点1"],
  nextActions: ["行動1"],
  report: buildMockCompanyResearchReport("株式会社テスト"),
  chatMessages: []
};

describe("buildCompanyResearchUiState", () => {
  test("returns an empty-state shape when no saved researches exist", () => {
    const state = buildCompanyResearchUiState([]);

    expect(state.recentItems).toEqual([]);
    expect(state.activeResult).toBeNull();
    expect(state.activeQuery).toBeNull();
  });

  test("uses the newest saved research as the active result and recent history", () => {
    const state = buildCompanyResearchUiState([
      {
        id: "older",
        query: "https://old.example.com",
        companyName: "旧会社",
        industry: "メーカー",
        location: "大阪府",
        size: "50人",
        summary: "旧要約",
        keyPoints: ["旧要点"],
        interviewHints: ["旧論点"],
        nextActions: ["旧行動"],
        report: buildMockCompanyResearchReport("旧会社"),
        chatMessages: [],
        status: "比較候補",
        createdAt: new Date("2026-06-14T00:00:00.000Z")
      },
      {
        id: "newer",
        query: "https://new.example.com",
        companyName: baseResult.companyName,
        industry: baseResult.industry,
        location: baseResult.location,
        size: baseResult.size,
        summary: baseResult.summary,
        keyPoints: baseResult.keyPoints,
        interviewHints: baseResult.interviewHints,
        nextActions: baseResult.nextActions,
        report: baseResult.report,
        chatMessages: baseResult.chatMessages,
        status: "要点整理済み",
        createdAt: new Date("2026-06-15T00:00:00.000Z")
      }
    ]);

    expect(state.recentItems.map((item) => item.id)).toEqual(["newer", "older"]);
    expect(state.activeQuery).toBe("https://new.example.com");
    expect(state.activeResult).toEqual(baseResult);
  });
});
