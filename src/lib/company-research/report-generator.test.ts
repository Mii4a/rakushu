import { describe, expect, test, vi } from "vitest";

const { requestStructuredAiMock } = vi.hoisted(() => ({
  requestStructuredAiMock: vi.fn()
}));

vi.mock("@/lib/ai/openai-responses", () => ({
  requestStructuredAi: requestStructuredAiMock
}));

import { validateCompanyResearchEvidence } from "@/lib/company-research/evidence-validator";
import { generateCompanyResearchReport } from "@/lib/company-research/report-generator";

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "検証テスト株式会社",
    industry: "IT",
    location: "東京都",
    size: "100名",
    summary: "公開情報をもとにした要約です。",
    keyPoints: ["公式情報とIRを確認した"],
    interviewHints: ["公式サイトの事業説明を踏まえる"],
    nextActions: ["採用情報を確認する"],
    report: {
      companyName: "検証テスト株式会社",
      estimatedPages: 12,
      estimatedFigures: 3,
      sections: [
        { id: "executive-summary", title: "エグゼクティブサマリー", subsections: [{ id: "overview", title: "概要", content: ["公式サイトとIRから事業構造を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "company-background", title: "企業基本情報と設立背景", subsections: [{ id: "origin", title: "沿革", content: ["設立背景を公開情報で確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "business", title: "事業内容", subsections: [{ id: "services", title: "主要事業", content: ["主要サービスは公開情報に基づく。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "competition", title: "業界・競争環境", subsections: [{ id: "market", title: "競争環境", content: ["競合環境を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "organization", title: "組織・人材", subsections: [{ id: "culture", title: "文化", content: ["組織文化の説明がある。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "finance", title: "財務・業績", subsections: [{ id: "results", title: "業績", content: ["業績の確認ができる。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "growth", title: "成長戦略", subsections: [{ id: "strategy", title: "戦略", content: ["成長戦略を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "reviews", title: "従業員評価", subsections: [{ id: "voice", title: "口コミ", content: ["口コミ媒体での示唆を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
        { id: "job-hunting", title: "就活への応用", subsections: [{ id: "advice", title: "面接対策", content: ["面接では事業理解を軸に話す。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] }
      ],
      sources: [
        { id: "source-official", kind: "official", title: "検証テスト株式会社 公式サイト", url: "https://example.com/company", excerpt: "会社概要と事業説明の確認に使用。", reliability: "high" }
      ],
      suggestedQuestions: ["事業内容は？"]
    },
    ...overrides
  };
}

describe("generateCompanyResearchReport", () => {
  test("requests structured AI once with company research args and preserves validated report shape", async () => {
    const payload = makeValidPayload();
    requestStructuredAiMock.mockImplementationOnce(async (input: Record<string, unknown>) => {
      expect(input).toMatchObject({ userId: "user-1", actionKey: "company_research_report_generate", sourceTable: "company_researches", sourceId: "research-1", schemaName: "company_research_report" });
      const parsed = (input as { parse: (value: unknown) => unknown }).parse(payload);
      return { data: parsed, model: "gpt-5.4-mini", usageEventId: null };
    });

    const result = await generateCompanyResearchReport({
      userId: "user-1",
      researchId: "research-1",
      websiteUrl: "https://example.com/company",
      researchRequest: { websiteUrl: "https://example.com/company", model: "ignored", collectionPolicy: "policy", collectionScope: "scope", requiredSections: ["エグゼクティブサマリー"], requiredSubtopics: ["企業の位置付け"] },
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
    expect(result.model).toBe("gpt-5.4-mini");
    expect(result.usageEventId).toBeNull();
    expect(result.result.report.generatedAt).toBe("2026-07-20T00:00:00.000Z");
    expect(result.result.report.sources[0]?.fetchedAt).toBe("2026-07-20T00:00:00.000Z");
    expect(result.result.report.sourceChunks).toEqual([]);
    expect(result.result.chatMessages).toHaveLength(1);
    expect(result.result.report.sections.at(-1)?.title).toBe("引用サイト・文献");
    expect(result.result.report.sections.at(-1)?.subsections[0]?.content.join("\n")).toContain("https://example.com/company");
    expect(validateCompanyResearchEvidence(result.result.report)).toEqual({ ok: true });
  });

  test("validator failure in parse triggers a single Terra fallback and preserves Terra model", async () => {
    const validPayload = makeValidPayload();
    const invalidPayload = makeValidPayload({ report: { ...makeValidPayload().report, sources: [] } });

    requestStructuredAiMock.mockImplementationOnce(async (input: Record<string, unknown>) => {
      expect(() => (input as { parse: (value: unknown) => unknown }).parse(invalidPayload)).toThrow();
      return { data: (input as { parse: (value: unknown) => unknown }).parse(validPayload), model: "gpt-5.6-terra", usageEventId: "usage-2" };
    });

    const result = await generateCompanyResearchReport({
      userId: "user-1",
      researchId: "research-1",
      websiteUrl: "https://example.com/company",
      researchRequest: { websiteUrl: "https://example.com/company", model: "ignored", collectionPolicy: "policy", collectionScope: "scope", requiredSections: ["エグゼクティブサマリー"], requiredSubtopics: ["企業の位置付け"] },
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.model).toBe("gpt-5.6-terra");
    expect(result.usageEventId).toBe("usage-2");
    expect(requestStructuredAiMock).toHaveBeenCalledTimes(2);
  });

  test("rejects invalid evidence and never synthesizes fallback sources or sections", async () => {
    const invalidPayload = {
      ...makeValidPayload(),
      report: {
        ...makeValidPayload().report,
        sources: [{ id: "source-official", kind: "official", title: "検証テスト株式会社 公式サイト", url: "https://example.com/company", excerpt: "会社概要と事業説明の確認に使用。", reliability: "high" }]
      }
    };
    invalidPayload.report.sections = invalidPayload.report.sections.map((section: any, index: number) =>
      index === 0 ? { ...section, subsections: [{ ...section.subsections[0], citations: [{ sourceId: "missing-source", label: "[1]" }] }] } : section
    );
    requestStructuredAiMock.mockImplementationOnce(async (input: Record<string, unknown>) => ({ data: (input as { parse: (value: unknown) => unknown }).parse(invalidPayload), model: "gpt-5.4-mini", usageEventId: null }));

    await expect(
      generateCompanyResearchReport({
        userId: "user-1",
        researchId: "research-1",
        websiteUrl: "https://example.com/company",
        researchRequest: { websiteUrl: "https://example.com/company", model: "ignored", collectionPolicy: "policy", collectionScope: "scope", requiredSections: ["エグゼクティブサマリー"], requiredSubtopics: ["企業の位置付け"] },
        now: new Date("2026-07-20T00:00:00.000Z")
      })
    ).rejects.toThrow("Company research report generation failed");
  });

  test("preserves strict bounds and rejects unknown keys", async () => {
    const payload = makeValidPayload({ extraField: true, report: { ...makeValidPayload().report, sections: [...makeValidPayload().report.sections, { id: "x", title: "x", subsections: [{ id: "x", title: "x", content: ["x"], citations: [{ sourceId: "source-official", label: "[1]" }], extra: true }] }] } });
    requestStructuredAiMock.mockImplementationOnce(async (input: Record<string, unknown>) => {
      expect(() => (input as { parse: (value: unknown) => unknown }).parse(payload)).toThrow();
      throw new Error("Company research report generation failed");
    });

    await expect(
      generateCompanyResearchReport({
        userId: "user-1",
        researchId: "research-1",
        websiteUrl: "https://example.com/company",
        researchRequest: { websiteUrl: "https://example.com/company", model: "ignored", collectionPolicy: "policy", collectionScope: "scope", requiredSections: ["エグゼクティブサマリー"], requiredSubtopics: ["企業の位置付け"] },
        now: new Date("2026-07-20T00:00:00.000Z")
      })
    ).rejects.toThrow("Company research report generation failed");
  });
});
