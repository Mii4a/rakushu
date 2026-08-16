import { z } from "zod";

import { requestStructuredAi } from "@/lib/ai/openai-responses";
import { validateCompanyResearchEvidence } from "@/lib/company-research/evidence-validator";
import { buildCompanyResearchReportUserPrompt, companyResearchReportSystemPrompt } from "@/lib/company-research/report-prompt";
import type { CompanyResearchRequest } from "@/lib/company-research/research-request";
import type { CompanyResearchReport, CompanyResearchResult, ResearchSection, ResearchSource } from "@/lib/company-research/types";

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
] as const;

const citationSchema = z.object({ sourceId: z.string().min(1).max(100), label: z.string().min(1).max(100) }).strict();
const subsectionSchema = z.object({ id: z.string().min(1).max(100), title: z.string().min(1).max(200), content: z.array(z.string().min(1).max(4000)).min(1).max(20), citations: z.array(citationSchema).min(1).max(10) }).strict();
const sectionSchema = z.object({ id: z.string().min(1).max(100), title: z.string().min(1).max(200), subsections: z.array(subsectionSchema).min(1).max(20) }).strict();
const sourceSchema = z.object({ id: z.string().min(1).max(100), kind: z.enum(["official", "ir", "recruit", "review", "news", "other"]), title: z.string().min(1).max(200), url: z.string().url().max(2048), excerpt: z.string().min(1).max(4000), reliability: z.enum(["high", "medium", "low"]) }).strict();
const providerReportSchema = z.object({ companyName: z.string().min(1).max(200), estimatedPages: z.number().int().min(0).max(200), estimatedFigures: z.number().int().min(0).max(200), sections: z.array(sectionSchema).min(9).max(12), sources: z.array(sourceSchema).min(1).max(20), suggestedQuestions: z.array(z.string().min(1).max(500)).min(1).max(6) }).strict();
const providerPayloadSchema = z.object({ companyName: z.string().min(1).max(200), industry: z.string().min(1).max(4000), location: z.string().min(1).max(4000), size: z.string().min(1).max(4000), summary: z.string().min(1).max(4000), keyPoints: z.array(z.string().min(1).max(500)).min(1).max(5), interviewHints: z.array(z.string().min(1).max(500)).min(1).max(5), nextActions: z.array(z.string().min(1).max(500)).min(1).max(5), report: providerReportSchema }).strict();

type ProviderPayload = z.infer<typeof providerPayloadSchema>;

const requestJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["companyName", "industry", "location", "size", "summary", "keyPoints", "interviewHints", "nextActions", "report"],
  properties: {
    companyName: { type: "string", minLength: 1, maxLength: 200 },
    industry: { type: "string", minLength: 1, maxLength: 4000 },
    location: { type: "string", minLength: 1, maxLength: 4000 },
    size: { type: "string", minLength: 1, maxLength: 4000 },
    summary: { type: "string", minLength: 1, maxLength: 4000 },
    keyPoints: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 1, maxLength: 500 } },
    interviewHints: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 1, maxLength: 500 } },
    nextActions: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 1, maxLength: 500 } },
    report: {
      type: "object",
      additionalProperties: false,
      required: ["companyName", "estimatedPages", "estimatedFigures", "sections", "sources", "suggestedQuestions"],
      properties: {
        companyName: { type: "string", minLength: 1, maxLength: 200 },
        estimatedPages: { type: "integer", minimum: 0, maximum: 200 },
        estimatedFigures: { type: "integer", minimum: 0, maximum: 200 },
        sections: {
          type: "array",
          minItems: 9,
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "title", "subsections"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              title: { type: "string", minLength: 1, maxLength: 200 },
              subsections: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "title", "content", "citations"],
                  properties: {
                    id: { type: "string", minLength: 1, maxLength: 100 },
                    title: { type: "string", minLength: 1, maxLength: 200 },
                    content: { type: "array", minItems: 1, maxItems: 20, items: { type: "string", minLength: 1, maxLength: 4000 } },
                    citations: {
                      type: "array",
                      minItems: 1,
                      maxItems: 10,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["sourceId", "label"],
                        properties: {
                          sourceId: { type: "string", minLength: 1, maxLength: 100 },
                          label: { type: "string", minLength: 1, maxLength: 100 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        sources: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "title", "url", "excerpt", "reliability"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              kind: { type: "string", enum: ["official", "ir", "recruit", "review", "news", "other"] },
              title: { type: "string", minLength: 1, maxLength: 200 },
              url: { type: "string", minLength: 1, maxLength: 2048 },
              excerpt: { type: "string", minLength: 1, maxLength: 4000 },
              reliability: { type: "string", enum: ["high", "medium", "low"] }
            }
          }
        },
        suggestedQuestions: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 1, maxLength: 500 } }
      }
    }
  }
} as const;

function buildCitationSection(sources: ResearchSource[]): ResearchSection {
  return {
    id: "quoted-sites-and-literature",
    title: "引用サイト・文献",
    subsections: [
      {
        id: "quoted-sites-and-literature-list",
        title: "引用サイト・文献一覧",
        content: sources.map((source, index) => `[${index + 1}] ${source.title} / ${source.url} / 種別: ${source.kind} / 確度: ${source.reliability}`),
        citations: sources.map((source, index) => ({ sourceId: source.id, label: `[${index + 1}]` }))
      }
    ]
  };
}

function ensureCitation(section: ResearchSection, sourceId: string): ResearchSection {
  return { ...section, subsections: section.subsections.map((subsection) => ({ ...subsection, citations: subsection.citations.length > 0 ? subsection.citations : [{ sourceId, label: "[1]" }] })) };
}

function finalizeResult(payload: ProviderPayload, now: Date): CompanyResearchResult {
  const sources: ResearchSource[] = payload.report.sources.map((source) => ({ ...source, fetchedAt: now.toISOString() }));
  const report: CompanyResearchReport = {
    companyName: payload.report.companyName,
    generatedAt: now.toISOString(),
    estimatedPages: payload.report.estimatedPages,
    estimatedFigures: payload.report.estimatedFigures,
    sections: payload.report.sections.filter((section) => section.title !== "引用サイト・文献").map((section) => ensureCitation(section, sources[0]!.id)).concat(buildCitationSection(sources)),
    sources,
    sourceChunks: [],
    suggestedQuestions: payload.report.suggestedQuestions
  };

  if (validateCompanyResearchEvidence(report).ok !== true) {
    throw new Error("Company research report generation failed");
  }

  return {
    companyName: payload.companyName,
    industry: payload.industry,
    location: payload.location,
    size: payload.size,
    summary: payload.summary,
    keyPoints: payload.keyPoints,
    interviewHints: payload.interviewHints,
    nextActions: payload.nextActions,
    report,
    chatMessages: [{ id: crypto.randomUUID(), role: "assistant", content: `${payload.companyName}について、公開情報をもとに調査を行い、レポートを作成しました。\n以下のレポートをご確認ください。`, createdAt: now.toISOString() }]
  };
}

export async function generateCompanyResearchReport({ userId, researchId, websiteUrl, researchRequest, now }: { userId: string; researchId: string; websiteUrl: string; researchRequest: CompanyResearchRequest; now: Date; }): Promise<{ result: CompanyResearchResult; model: string; usageEventId: string | null }> {
  const generation = await requestStructuredAi({
    userId,
    actionKey: "company_research_report_generate",
    sourceTable: "company_researches",
    sourceId: researchId,
    systemPrompt: companyResearchReportSystemPrompt,
    userPrompt: buildCompanyResearchReportUserPrompt(researchRequest),
    schemaName: "company_research_report",
    jsonSchema: requestJsonSchema,
    parse: (value: unknown) => finalizeResult(providerPayloadSchema.parse(value), now)
  });

  return { result: generation.data, model: generation.model, usageEventId: generation.usageEventId };
}

export { requiredSectionTitles };
