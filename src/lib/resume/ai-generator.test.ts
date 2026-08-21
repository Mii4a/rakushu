import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyResearchReport } from "../company-research/types";

const requestStructuredAiMock = vi.hoisted(() => vi.fn());

vi.mock("../ai/openai-responses", () => ({ requestStructuredAi: requestStructuredAiMock }));

const baseReport: CompanyResearchReport = {
  companyName: "Saved Corp",
  generatedAt: "2026-08-16T00:00:00.000Z",
  estimatedPages: 1,
  estimatedFigures: 0,
  sections: [{ id: "sec-1", title: "Overview", summary: "Company overview", subsections: [{ id: "sub-1", title: "Mission", content: ["Build useful products."], citations: [{ sourceId: "src-1", label: "official" }] }] }],
  sources: [{ id: "src-1", kind: "official", title: "Official page", url: "https://example.com", fetchedAt: "2026-08-16T00:00:00.000Z", excerpt: "Excerpt text", reliability: "high" }],
  sourceChunks: [{ id: "chunk-1", sourceId: "src-1", title: "Chunk", text: "Should never be serialized" }],
  suggestedQuestions: ["Q1"]
};

const baseInput = {
  userId: "user-1",
  resumeProfileId: "profile-1",
  current: { motivation: "Current motivation", selfPr: "Current self PR" },
  background: { education: "Education", experience: "Experience", licenses: "Licenses" }
} as const;

function mockResponse(raw: unknown) {
  requestStructuredAiMock.mockImplementationOnce(({ parse }: { parse: (value: unknown) => unknown }) => Promise.resolve({ data: parse(raw), model: "gpt-5.4-mini", usageEventId: null }));
}

beforeEach(() => {
  requestStructuredAiMock.mockReset();
});

describe("generateResumeAiProposal", () => {
  it("builds a strict draft request without company context and parses the response", async () => {
    mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: [] });
    const { generateResumeAiProposal } = await import("./ai-generator");
    const result = await generateResumeAiProposal({ ...baseInput, mode: "draft" });
    expect(result).toEqual({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: [] });
    const input = requestStructuredAiMock.mock.calls[0][0];
    expect(input.actionKey).toBe("resume_draft_generate");
    expect(input.userId).toBe("user-1");
    expect(input.sourceTable).toBe("resume_profiles");
    expect(input.sourceId).toBe("profile-1");
    expect(input.schemaName).toBe("resume_ai_proposal");
    expect(input.jsonSchema.additionalProperties).toBe(false);
    expect(input.jsonSchema.properties.evidenceSourceIds.maxItems).toBe(0);
    expect(input.systemPrompt).toContain("Web Search");
    expect(input.systemPrompt).toContain("適用・書き換え・永続化しない");
    expect(JSON.stringify(input)).not.toContain("sourceChunks");
    expect(JSON.stringify(input)).not.toContain("companyResearch");
    expect(input.userPrompt).not.toContain("userId");
    expect(input.userPrompt).not.toContain("resumeProfileId");
    expect(input.userPrompt).not.toContain("user-1");
    expect(input.userPrompt).not.toContain("profile-1");
    expect(input.parse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: [] })).toEqual({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: [] });
  });

  it("builds a strict review request and includes no company report context", async () => {
    mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: [] });
    const { generateResumeAiProposal } = await import("./ai-generator");
    await generateResumeAiProposal({ ...baseInput, mode: "review" });
    const input = requestStructuredAiMock.mock.calls[0][0];
    expect(input.actionKey).toBe("resume_review_generate");
    expect(JSON.stringify(input)).not.toContain("Saved Corp");
    expect(JSON.stringify(input)).not.toContain("sourceChunks");
    expect(JSON.stringify(input)).not.toContain("companyResearch");
  });

  it("builds a privacy-minimized company request with bounded saved research context", async () => {
    mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: ["src-1"] });
    const { generateResumeAiProposal } = await import("./ai-generator");
    await generateResumeAiProposal({ ...baseInput, mode: "company", targetJob: { id: "job-1", companyName: "Target Co", title: "Engineer" }, companyResearch: { id: "research-1", report: baseReport } });
    const input = requestStructuredAiMock.mock.calls[0][0];
    expect(input.actionKey).toBe("resume_company_adjust_generate");
    const serialized = JSON.stringify(input);
    expect(serialized).toContain("Target Co");
    expect(serialized).toContain("research-1");
    expect(serialized).toContain("src-1");
    expect(serialized).toContain("official");
    expect(serialized).toContain("saved company research only");
    expect(serialized).not.toContain("sourceChunks");
    expect(serialized).not.toContain("fullName");
    expect(serialized).not.toContain("currentAddress");
    expect(serialized).not.toContain("phone");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("birthDate");
    expect(input.userPrompt).not.toContain("userId");
    expect(input.userPrompt).not.toContain("resumeProfileId");
    expect(input.jsonSchema.properties.evidenceSourceIds.minItems).toBe(1);
    expect(input.jsonSchema.properties.evidenceSourceIds.maxItems).toBe(5);
    expect(input.parse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: ["src-1"] })).toEqual({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: ["src-1"] });
  });

  it("does not serialize saved source URLs into the provider prompt", async () => {
    const privateSourceUrl = "https://resume-source-url.invalid/private-path";
    const report = {
      ...baseReport,
      sources: [{ ...baseReport.sources[0], url: privateSourceUrl }]
    };
    mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: ["src-1"] });
    const { generateResumeAiProposal } = await import("./ai-generator");
    await generateResumeAiProposal({
      ...baseInput,
      mode: "company",
      targetJob: { id: "job-1", companyName: "Target Co", title: "Engineer" },
      companyResearch: { id: "research-1", report }
    });
    const input = requestStructuredAiMock.mock.calls[0][0];
    expect(input.userPrompt).not.toContain(privateSourceUrl);
  });

  it("accepts the persisted report contract maximum of ten content lines and citations", async () => {
    const report = {
      ...baseReport,
      sections: [{
        ...baseReport.sections[0],
        subsections: [{
          ...baseReport.sections[0].subsections[0],
          content: Array.from({ length: 10 }, (_, index) => `line-${index}`),
          citations: Array.from({ length: 10 }, (_, index) => ({ sourceId: "src-1", label: `citation-${index}` }))
        }]
      }]
    };
    mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: ["src-1"] });
    const { generateResumeAiProposal } = await import("./ai-generator");
    await expect(generateResumeAiProposal({ ...baseInput, mode: "company", targetJob: { id: "job-1", companyName: "Target Co", title: "Engineer" }, companyResearch: { id: "research-1", report } })).resolves.toMatchObject({ motivation: "m" });
  });

  it("bounds serialized company report sections to 30000 characters", async () => {
    const largeSections = Array.from({ length: 12 }, (_, sectionIndex) => ({
      ...baseReport.sections[0],
      id: `sec-${sectionIndex}`,
      subsections: Array.from({ length: 20 }, (_, subsectionIndex) => ({
        ...baseReport.sections[0].subsections[0],
        id: `sub-${sectionIndex}-${subsectionIndex}`,
        content: Array.from({ length: 4 }, () => "x".repeat(1000))
      }))
    }));
    mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds: ["src-1"] });
    const { generateResumeAiProposal } = await import("./ai-generator");
    await generateResumeAiProposal({ ...baseInput, mode: "company", targetJob: { id: "job-1", companyName: "Target Co", title: "Engineer" }, companyResearch: { id: "research-1", report: { ...baseReport, sections: largeSections } } });
    const input = requestStructuredAiMock.mock.calls[0][0];
    const contextText = input.userPrompt.match(/<untrusted_context_json>(.*)<\/untrusted_context_json>/)?.[1];
    expect(contextText).toBeTruthy();
    const context = JSON.parse(contextText) as { companyResearch: { report: { sections: string } } };
    expect(context.companyResearch.report.sections.length).toBeLessThanOrEqual(30000);
  });

  for (const input of [
    { userId: "", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "draft" as const },
    { userId: "user-1", resumeProfileId: " ", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "draft" as const },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "x".repeat(4001), experience: "", licenses: "" }, mode: "draft" as const },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: " ", selfPr: "" }, background: { education: "", experience: "", licenses: "" }, mode: "draft" as const },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: " ", selfPr: "" }, background: { education: "e", experience: "", licenses: "" }, mode: "review" as const },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "company" as const, targetJob: { id: "", companyName: "Target", title: "Engineer" }, companyResearch: { id: "research-1", report: baseReport } },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "company" as const, targetJob: { id: "job-1", companyName: " ", title: "Engineer" }, companyResearch: { id: "research-1", report: baseReport } },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "company" as const, targetJob: { id: "job-1", companyName: "Target", title: "Engineer" }, companyResearch: { id: " ", report: baseReport } },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "company" as const, targetJob: { id: "job-1", companyName: "Target", title: "Engineer" }, companyResearch: { id: "research-1", report: { ...baseReport, sources: [] } } },
    { userId: "user-1", resumeProfileId: "profile-1", current: { motivation: "x", selfPr: "y" }, background: { education: "e", experience: "", licenses: "" }, mode: "company" as const, targetJob: { id: "job-1", companyName: "Target", title: "Engineer" }, companyResearch: { id: "research-1", report: { ...baseReport, sources: [{ ...baseReport.sources[0], id: "src-2" }] } } },
    { ...baseInput, mode: "unknown" },
    { ...baseInput, mode: "company" as const, targetJob: { id: "job-1", companyName: "x".repeat(201), title: "Engineer" }, companyResearch: { id: "research-1", report: baseReport } },
    { ...baseInput, mode: "company" as const, targetJob: { id: "job-1", companyName: "Target", title: "Engineer" }, companyResearch: { id: "research-1", report: { ...baseReport, sources: [baseReport.sources[0], baseReport.sources[0]] } } }
  ]) {
    it(`rejects invalid input before calling common path for ${input.mode}`, async () => {
      const { generateResumeAiProposal } = await import("./ai-generator");
      await expect(generateResumeAiProposal(input as never)).rejects.toThrow("Resume AI proposal generation failed");
      expect(requestStructuredAiMock).not.toHaveBeenCalled();
    });
  }

  for (const raw of [
    { motivation: " ", selfPr: "x", changeSummary: "c", evidenceSourceIds: [] },
    { motivation: "x", selfPr: " ", changeSummary: "c", evidenceSourceIds: [] },
    { motivation: "x".repeat(4001), selfPr: "y", changeSummary: "c", evidenceSourceIds: [] },
    { motivation: "x", selfPr: "y", changeSummary: " ", evidenceSourceIds: [] },
    { motivation: "x", selfPr: "y", changeSummary: "c".repeat(401), evidenceSourceIds: [] },
    { motivation: "x", selfPr: "y", changeSummary: "c", evidenceSourceIds: ["", "src-1"] },
    { motivation: "x", selfPr: "y", changeSummary: "c", evidenceSourceIds: ["src-1", "src-1"] },
    { motivation: "x", selfPr: "y", changeSummary: "c", evidenceSourceIds: ["src-1", "src-2", "src-3", "src-4", "src-5", "src-6"] },
    { motivation: "x", selfPr: "y", changeSummary: "c", evidenceSourceIds: ["missing"] },
    { motivation: "x", selfPr: "y", changeSummary: "c", evidenceSourceIds: ["src-1".repeat(40)] },
    { motivation: "x", selfPr: "y", changeSummary: "c", evidenceSourceIds: ["src-1"], unknown: true }
  ]) {
    it("rejects malformed model output and never leaks raw payload details", async () => {
      mockResponse(raw);
      const { generateResumeAiProposal } = await import("./ai-generator");
      await expect(generateResumeAiProposal({ ...baseInput, mode: "draft" })).rejects.toThrow("Resume AI proposal generation failed");
      expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(requestStructuredAiMock.mock.calls[0][0])).not.toContain("unknown");
    });
  }

  for (const evidenceSourceIds of [[], ["missing"], ["src-1", "src-1"]]) {
    it("rejects invalid company evidence semantics", async () => {
      mockResponse({ motivation: "m", selfPr: "s", changeSummary: "c", evidenceSourceIds });
      const { generateResumeAiProposal } = await import("./ai-generator");
      await expect(generateResumeAiProposal({ ...baseInput, mode: "company", targetJob: { id: "job-1", companyName: "Target Co", title: "Engineer" }, companyResearch: { id: "research-1", report: baseReport } })).rejects.toThrow("Resume AI proposal generation failed");
      expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
    });
  }

  it("maps common failures to the fixed error and never mutates input", async () => {
    const input = structuredClone({ ...baseInput, mode: "draft" as const });
    requestStructuredAiMock.mockRejectedValueOnce(new Error("raw provider failure"));
    const { generateResumeAiProposal } = await import("./ai-generator");
    await expect(generateResumeAiProposal(input)).rejects.toThrow("Resume AI proposal generation failed");
    expect(input).toEqual({ ...baseInput, mode: "draft" });
    expect(requestStructuredAiMock).toHaveBeenCalledTimes(1);
  });
});
