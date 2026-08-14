import { describe, expect, test, vi } from "vitest";

const { generateJsonWithGptMock } = vi.hoisted(() => ({
  generateJsonWithGptMock: vi.fn()
}));

vi.mock("@/lib/company-research/llm-client", () => ({
  generateJsonWithGpt: generateJsonWithGptMock
}));

import { generateCompanyResearchReport } from "@/lib/company-research/report-generator";
import { buildCompanyResearchRequest } from "@/lib/company-research/research-request";

describe("generateCompanyResearchReport", () => {
  test("always appends a quoted sites and literature section from generated sources", async () => {
    generateJsonWithGptMock.mockResolvedValueOnce({
      companyName: "引用テスト株式会社",
      industry: "IT",
      location: "東京",
      size: "100名",
      summary: "公開情報をもとにした要約です。",
      keyPoints: ["公式情報を確認している"],
      interviewHints: ["引用元を確認して話す"],
      nextActions: ["公式サイトを見る"],
      report: {
        companyName: "引用テスト株式会社",
        generatedAt: "2026-07-20T00:00:00.000Z",
        estimatedPages: 10,
        estimatedFigures: 2,
        sections: [
          {
            id: "executive-summary",
            title: "エグゼクティブサマリー",
            subsections: [
              {
                id: "overview",
                title: "概要",
                content: ["公式サイトの会社概要を参照して整理しました。"],
                citations: []
              }
            ]
          }
        ],
        sources: [
          {
            id: "source-official",
            kind: "official",
            title: "引用テスト株式会社 公式サイト",
            url: "https://example.com/company",
            fetchedAt: "2026-07-20T00:00:00.000Z",
            excerpt: "会社概要の確認に使用。",
            reliability: "high"
          }
        ],
        sourceChunks: [],
        suggestedQuestions: ["事業内容は？"]
      },
      chatMessages: []
    });

    const result = await generateCompanyResearchReport({
      websiteUrl: "https://example.com/company",
      researchRequest: buildCompanyResearchRequest("https://example.com/company"),
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    const citationSection = result.report.sections.find((section) => section.title === "引用サイト・文献");
    expect(citationSection).toBeDefined();
    expect(citationSection?.subsections[0]?.content.join("\n")).toContain("引用テスト株式会社 公式サイト");
    expect(citationSection?.subsections[0]?.content.join("\n")).toContain("https://example.com/company");
    expect(result.report.sections[0]?.subsections[0]?.citations).toEqual([{ sourceId: "source-official", label: "[1]" }]);
  });

  test("uses an explicit missing-source fallback when the model omits sources", async () => {
    generateJsonWithGptMock.mockResolvedValueOnce({
      companyName: "未取得テスト株式会社",
      industry: "IT",
      location: "東京",
      size: "未確認",
      summary: "summary",
      keyPoints: ["k1"],
      interviewHints: ["h1"],
      nextActions: ["n1"],
      report: {
        companyName: "未取得テスト株式会社",
        generatedAt: "2026-07-20T00:00:00.000Z",
        estimatedPages: 8,
        estimatedFigures: 1,
        sections: [
          {
            id: "executive-summary",
            title: "エグゼクティブサマリー",
            subsections: [{ id: "overview", title: "概要", content: ["summary"], citations: [] }]
          }
        ],
        sources: [],
        sourceChunks: [],
        suggestedQuestions: []
      },
      chatMessages: []
    });

    const result = await generateCompanyResearchReport({
      websiteUrl: "https://example.com/",
      researchRequest: buildCompanyResearchRequest("https://example.com/"),
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.report.sources).toHaveLength(1);
    expect(result.report.sources[0]?.title).toBe("AI調査で参照した公開情報");
    const citationSection = result.report.sections.find((section) => section.title === "引用サイト・文献");
    expect(citationSection?.subsections[0]?.content.join("\n")).toContain("URL未取得");
  });
});
