import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CompanyResearchResult } from "@/lib/company-research/types";

const { requestStructuredAiMock } = vi.hoisted(() => ({
  requestStructuredAiMock: vi.fn()
}));

vi.mock("@/lib/ai/openai-responses", () => ({
  requestStructuredAi: requestStructuredAiMock
}));

import { validateCompanyResearchEvidence } from "@/lib/company-research/evidence-validator";
import { generateCompanyResearchReport } from "@/lib/company-research/report-generator";
import type { CompanyResearchRequest } from "@/lib/company-research/research-request";

type StrictInput = {
  userId: string;
  actionKey: string;
  sourceTable: string;
  sourceId: string;
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: { properties?: { report?: { properties?: { sections?: { items?: { properties?: { subsections?: { items?: { properties?: { content?: { maxItems?: number } } } } } } } } } } };
  parse: (value: unknown) => CompanyResearchResult;
};

type Citation = { sourceId: string; label: string };
type Subsection = { id: string; title: string; content: string[]; citations: Citation[] };
type Section = { id: string; title: string; subsections: Subsection[] };
type Source = { id: string; kind: "official"; title: string; url: string; excerpt: string; reliability: "high" };
type Payload = {
  companyName: string;
  industry: string;
  location: string;
  size: string;
  summary: string;
  keyPoints: string[];
  interviewHints: string[];
  nextActions: string[];
  report: {
    companyName: string;
    estimatedPages: number;
    estimatedFigures: number;
    sections: Section[];
    sources: Source[];
    suggestedQuestions: string[];
  };
};

const baseSections: Section[] = [
  { id: "executive-summary", title: "エグゼクティブサマリー", subsections: [{ id: "overview", title: "概要", content: ["公式サイトとIRから事業構造を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "company-background", title: "企業基本情報と設立背景", subsections: [{ id: "origin", title: "沿革", content: ["設立背景を公開情報で確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "business", title: "事業内容", subsections: [{ id: "services", title: "主要事業", content: ["主要サービスは公開情報に基づく。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "competition", title: "業界・競争環境", subsections: [{ id: "market", title: "競争環境", content: ["競合環境を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "organization", title: "組織・人材", subsections: [{ id: "culture", title: "文化", content: ["組織文化の説明がある。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "finance", title: "財務・業績", subsections: [{ id: "results", title: "業績", content: ["業績の確認ができる。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "growth", title: "成長戦略", subsections: [{ id: "strategy", title: "戦略", content: ["成長戦略を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "reviews", title: "従業員評価", subsections: [{ id: "voice", title: "口コミ", content: ["口コミ媒体での示唆を確認した。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] },
  { id: "job-hunting", title: "就活への応用", subsections: [{ id: "advice", title: "面接対策", content: ["面接では事業理解を軸に話す。"], citations: [{ sourceId: "source-official", label: "[1]" }] }] }
];

const basePayload: Payload = {
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
    sections: baseSections,
    sources: [{ id: "source-official", kind: "official", title: "検証テスト株式会社 公式サイト", url: "https://example.com/company", excerpt: "会社概要と事業説明の確認に使用。", reliability: "high" }],
    suggestedQuestions: ["事業内容は？"]
  }
};

const clone = <T>(value: T): T => structuredClone(value);
const makePayload = (mutate?: (payload: Payload) => void): Payload => {
  const payload = clone(basePayload);
  mutate?.(payload);
  return payload;
};

const mockInputCheck = (input: StrictInput) => {
  expect(input).toMatchObject({
    userId: "user-1",
    actionKey: "company_research_report_generate",
    sourceTable: "company_researches",
    sourceId: "research-1",
    schemaName: "company_research_report"
  });
  expect(input.jsonSchema.properties?.report?.properties?.sections?.items?.properties?.subsections?.items?.properties?.content?.maxItems).toBe(10);
};

const request = (): { userId: string; researchId: string; websiteUrl: string; researchRequest: CompanyResearchRequest; now: Date } => ({
  userId: "user-1",
  researchId: "research-1",
  websiteUrl: "https://example.com/company",
  researchRequest: {
    websiteUrl: "https://example.com/company",
    model: "ignored",
    collectionPolicy: "policy",
    collectionScope: "scope",
    requiredSections: ["エグゼクティブサマリー"],
    requiredSubtopics: ["企業の位置付け"]
  },
  now: new Date("2026-07-20T00:00:00.000Z")
});

describe("generateCompanyResearchReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("success preserves evidence, trims fields, and keeps derived citation section separate", async () => {
    const payload = makePayload((draft) => {
      draft.companyName = " 検証テスト株式会社 ";
      draft.industry = " IT ";
      draft.location = " 東京都 ";
      draft.size = " 100名 ";
      draft.summary = " 要約です。 ";
      draft.keyPoints = [" 公式情報とIRを確認した "];
      draft.interviewHints = [" 公式サイトの事業説明を踏まえる "];
      draft.nextActions = [" 採用情報を確認する "];
      draft.report.companyName = " 検証テスト株式会社 ";
      draft.report.sections[0].title = " エグゼクティブサマリー ";
      draft.report.sections[0].subsections[0]!.content = [" 公式サイトとIRから事業構造を確認した。 "];
      draft.report.sections[0].subsections[0]!.citations[0]!.label = " [1] ";
      draft.report.sources[0]!.title = " 検証テスト株式会社 公式サイト ";
      draft.report.sources[0]!.url = " https://example.com/company ";
      draft.report.sources[0]!.excerpt = " 会社概要と事業説明の確認に使用。 ";
    });

    requestStructuredAiMock.mockImplementationOnce(async (input: StrictInput) => {
      mockInputCheck(input);
      const parsed = input.parse(payload);
      return { data: parsed, model: "gpt-5.4-mini", usageEventId: null };
    });

    const result = await generateCompanyResearchReport(request());

    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
    expect(result.model).toBe("gpt-5.4-mini");
    expect(result.usageEventId).toBeNull();
    expect(result.result.companyName).toBe("検証テスト株式会社");
    expect(result.result.industry).toBe("IT");
    expect(result.result.location).toBe("東京都");
    expect(result.result.size).toBe("100名");
    expect(result.result.summary).toBe("要約です。");
    expect(result.result.keyPoints).toEqual(["公式情報とIRを確認した"]);
    expect(result.result.report.generatedAt).toBe("2026-07-20T00:00:00.000Z");
    expect(result.result.report.sources[0]?.fetchedAt).toBe("2026-07-20T00:00:00.000Z");
    expect(result.result.report.sourceChunks).toEqual([]);
    expect(result.result.chatMessages).toEqual([
      expect.objectContaining({ role: "assistant", createdAt: "2026-07-20T00:00:00.000Z" })
    ]);
    expect(result.result.report.sections.at(-1)?.title).toBe("引用サイト・文献");
    expect(result.result.report.sections.at(-1)?.subsections[0]?.content).toEqual([
      "[1] 検証テスト株式会社 公式サイト / https://example.com/company / 種別: official / 確度: high"
    ]);
    expect(validateCompanyResearchEvidence(result.result.report)).toEqual({ ok: true });
  });

  test("falls back to Terra once when the first provider parse is invalid", async () => {
    const invalid = makePayload((draft) => {
      draft.report.sources = [];
    });
    const valid = makePayload();

    requestStructuredAiMock.mockImplementationOnce(async (input: StrictInput) => {
      expect(() => input.parse(invalid)).toThrow();
      const parsed = input.parse(valid);
      return { data: parsed, model: "gpt-5.6-terra", usageEventId: "usage-2" };
    });

    const result = await generateCompanyResearchReport(request());

    expect(result.model).toBe("gpt-5.6-terra");
    expect(result.usageEventId).toBe("usage-2");
    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["semantic required title replaced and duplicated", (draft: Payload) => {
      draft.report.sections[0]!.title = "要約";
      draft.report.sections[1]!.title = "要約";
    }],
    ["missing sources", (draft: Payload) => {
      draft.report.sources = [];
    }],
    ["URL未取得", (draft: Payload) => {
      draft.report.sources[0]!.url = "URL未取得";
    }],
    ["uncited claim", (draft: Payload) => {
      draft.report.sections[0]!.subsections[0]!.citations = [];
    }],
    ["orphan citation", (draft: Payload) => {
      draft.report.sections[0]!.subsections[0]!.citations[0]!.sourceId = "missing-source";
    }]
  ])("rejects invalid evidence: %s", async (_label, mutate) => {
    const payload = makePayload(mutate);
    requestStructuredAiMock.mockImplementationOnce(async (input: StrictInput) => {
      expect(() => input.parse(payload)).toThrow();
      throw new Error("Company research report generation failed");
    });

    await expect(generateCompanyResearchReport(request())).rejects.toThrow("Company research report generation failed");
  });

  test.each([
    ["whitespace top summary", (draft: Payload) => { draft.summary = "   "; }],
    ["unknown top key", (draft: Payload) => { (draft as Payload & { extraTop?: boolean }).extraTop = true; }],
    ["unknown nested key", (draft: Payload) => { (draft.report.sections[0]!.subsections[0] as Subsection & { extra?: boolean }).extra = true; }],
    ["11 content items", (draft: Payload) => { draft.report.sections[0]!.subsections[0]!.content = Array.from({ length: 11 }, () => "x"); }],
    ["overlong string", (draft: Payload) => { draft.report.sources[0]!.excerpt = "x".repeat(4001); }]
  ])("rejects strict invalid input: %s", async (_label, mutate) => {
    const payload = makePayload(mutate);
    requestStructuredAiMock.mockImplementationOnce(async (input: StrictInput) => {
      expect(() => input.parse(payload)).toThrow();
      throw new Error("Company research report generation failed");
    });

    await expect(generateCompanyResearchReport(request())).rejects.toThrow("Company research report generation failed");
  });

  test("preserves provider citations exactly when a second source exists", async () => {
    const payload = makePayload((draft) => {
      draft.report.sources.push({ id: "source-ir", kind: "official", title: "IR資料", url: "https://example.com/ir", excerpt: "IR資料の確認。", reliability: "high" });
      draft.report.sections[0]!.subsections[0]!.citations.push({ sourceId: "source-ir", label: "[2]" });
    });

    requestStructuredAiMock.mockImplementationOnce(async (input: StrictInput) => ({ data: input.parse(payload), model: "gpt-5.4-mini", usageEventId: null }));

    const result = await generateCompanyResearchReport(request());

    expect(result.result.report.sections[0]?.subsections[0]?.citations).toEqual([{ sourceId: "source-official", label: "[1]" }, { sourceId: "source-ir", label: "[2]" }]);
    expect(result.result.report.sections.at(-1)?.title).toBe("引用サイト・文献");
  });

  test("propagates provider rejection without local fallback", async () => {
    requestStructuredAiMock.mockRejectedValueOnce(new Error("provider down"));

    await expect(generateCompanyResearchReport(request())).rejects.toThrow("provider down");
    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
  });
});
