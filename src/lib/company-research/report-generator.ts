import { buildMockCompanyResearchReport, type CompanyResearchResult } from "@/lib/company-research/mock-data";
import type { CompanyResearchRequest } from "@/lib/company-research/research-request";
import type { CompanyResearchReport, ResearchSection, ResearchSource } from "@/lib/company-research/types";
import { generateJsonWithGpt } from "@/lib/company-research/llm-client";
import { buildCompanyResearchReportUserPrompt, companyResearchReportSystemPrompt } from "@/lib/company-research/report-prompt";

const requiredSectionTitles = [
  "エグゼクティブサマリー",
  "企業基本情報と設立背景",
  "事業内容",
  "業界・競争環境",
  "組織・人材",
  "財務・業績",
  "成長戦略",
  "従業員評価",
  "就活への応用"
];

function hasMinimalResultShape(value: unknown): value is CompanyResearchResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<CompanyResearchResult>;
  return Boolean(result.companyName && result.summary && result.report && Array.isArray(result.report.sections));
}

function buildFallbackSource(websiteUrl: string, now: Date): ResearchSource {
  return {
    id: "source-ai-public-info",
    kind: "other",
    title: "AI調査で参照した公開情報",
    url: "URL未取得",
    fetchedAt: now.toISOString(),
    excerpt: `AI調査で参照した公開情報。入力URL: ${websiteUrl}。個別の引用URLは未取得です。`,
    reliability: "low"
  };
}

function normalizeSources(sources: CompanyResearchReport["sources"] | undefined, websiteUrl: string, now: Date): ResearchSource[] {
  if (!Array.isArray(sources) || sources.length === 0) return [buildFallbackSource(websiteUrl, now)];

  return sources.map((source, index) => ({
    id: source.id || `source-${index + 1}`,
    kind: source.kind || "other",
    title: source.title || `引用サイト・文献 ${index + 1}`,
    url: source.url || "URL未取得",
    fetchedAt: source.fetchedAt || now.toISOString(),
    excerpt: source.excerpt || "このレポート作成時に参照した公開情報です。",
    reliability: source.reliability || "medium"
  }));
}

function buildCitationSection(sources: ResearchSource[]): ResearchSection {
  return {
    id: "quoted-sites-and-literature",
    title: "引用サイト・文献",
    subsections: [
      {
        id: "quoted-sites-and-literature-list",
        title: "引用サイト・文献一覧",
        content: sources.map((source, index) => {
          const url = source.url && source.url.trim().length > 0 ? source.url : "URL未取得";
          const reliabilityLabel = source.reliability === "high" ? "高" : source.reliability === "medium" ? "中" : "低";
          return `[${index + 1}] ${source.title} / ${url} / 種別: ${source.kind} / 確度: ${reliabilityLabel}`;
        }),
        citations: sources.map((source, index) => ({ sourceId: source.id, label: `[${index + 1}]` }))
      }
    ]
  };
}

function ensureSectionCitations(sections: ResearchSection[], sources: ResearchSource[]): ResearchSection[] {
  const primarySource = sources[0];
  return sections.map((section) => {
    if (section.title === "引用サイト・文献") return section;
    return {
      ...section,
      subsections: section.subsections.map((subsection) => ({
        ...subsection,
        citations:
          Array.isArray(subsection.citations) && subsection.citations.length > 0
            ? subsection.citations
            : primarySource
              ? [{ sourceId: primarySource.id, label: "[1]" }]
              : []
      }))
    };
  });
}

function withCitationSection(sections: ResearchSection[], sources: ResearchSource[]): ResearchSection[] {
  const nonCitationSections = sections.filter((section) => section.title !== "引用サイト・文献");
  return [...ensureSectionCitations(nonCitationSections, sources), buildCitationSection(sources)];
}

function withRequiredReportShape(result: CompanyResearchResult, websiteUrl: string, now: Date): CompanyResearchResult {
  const fallbackReport = buildMockCompanyResearchReport(result.companyName || "気になる企業", now.toISOString());
  const existingTitles = new Set(result.report.sections.map((section) => section.title));
  const missingSections = fallbackReport.sections.filter((section) => !existingTitles.has(section.title));
  const sources = normalizeSources(result.report.sources, websiteUrl, now);
  const report = {
    ...fallbackReport,
    ...result.report,
    companyName: result.report.companyName || result.companyName,
    generatedAt: result.report.generatedAt || now.toISOString(),
    sources,
    sections: withCitationSection([...result.report.sections, ...missingSections], sources),
    suggestedQuestions:
      Array.isArray(result.report.suggestedQuestions) && result.report.suggestedQuestions.length > 0
        ? result.report.suggestedQuestions
        : fallbackReport.suggestedQuestions
  };

  return {
    ...result,
    report,
    chatMessages:
      result.chatMessages.length > 0
        ? result.chatMessages
        : [
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `${result.companyName}について、公開情報をもとに調査を行い、レポートを作成しました。
以下のレポートをご確認ください。`,
              createdAt: now.toISOString()
            }
          ]
  };
}

export async function generateCompanyResearchReport({
  websiteUrl,
  researchRequest,
  now
}: {
  websiteUrl: string;
  researchRequest: CompanyResearchRequest;
  now: Date;
}): Promise<CompanyResearchResult> {
  const generated = await generateJsonWithGpt<CompanyResearchResult>({
    system: companyResearchReportSystemPrompt,
    user: buildCompanyResearchReportUserPrompt(researchRequest),
    temperature: 0.2
  });

  if (!hasMinimalResultShape(generated)) {
    throw new Error("Company research report JSON did not match the minimal expected shape");
  }

  return withRequiredReportShape(generated, websiteUrl, now);
}

export { requiredSectionTitles };
