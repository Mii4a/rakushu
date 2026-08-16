import { describe, expect, test } from "vitest";

import { buildMockCompanyResearchReport } from "./mock-data";
import { REQUIRED_RESEARCH_SECTION_TITLES, validateCompanyResearchEvidence } from "./evidence-validator";
import type { CompanyResearchReport } from "./types";

function cloneReport(report: CompanyResearchReport): CompanyResearchReport {
  return structuredClone(report);
}

function withReportMutations(
  base: CompanyResearchReport,
  mutate: (report: CompanyResearchReport) => void
): CompanyResearchReport {
  const report = cloneReport(base);
  mutate(report);
  return report;
}

function buildValidReport(): CompanyResearchReport {
  return buildMockCompanyResearchReport("株式会社テスト");
}

describe("validateCompanyResearchEvidence", () => {
  test("buildMockCompanyResearchReport passes", () => {
    expect(validateCompanyResearchEvidence(buildValidReport())).toEqual({ ok: true });
  });

  test("exact canonical titles pass", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections = REQUIRED_RESEARCH_SECTION_TITLES.map((title, index) => ({
        id: `section-${index + 1}`,
        title,
        subsections: [
          {
            id: `sub-${index + 1}`,
            title: `sub-${index + 1}`,
            content: [`content-${index + 1}`],
            citations: [{ sourceId: draft.sources[0]?.id ?? "source-1", label: "[1]" }]
          }
        ]
      }));
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: true });
  });

  test.each(REQUIRED_RESEARCH_SECTION_TITLES)("missing required section %s fails", (missingTitle) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections = draft.sections.filter(
        (section) => section.title.normalize("NFKC").replace(/[\s・/／]/g, "").replace(/の/g, "") !==
          missingTitle.normalize("NFKC").replace(/[\s・/／]/g, "").replace(/の/g, "")
      );
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "missing_required_sections" });
  });

  test.each([
    [undefined, "missing_sources"],
    [[], "missing_sources"]
  ] as const)("sources %s fails", (sources, reason) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources = sources as unknown as CompanyResearchReport["sources"];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason });
  });

  test("blank source id fails", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources = [{ ...draft.sources[0], id: "   " }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "invalid_source_id" });
  });

  test("duplicate source id fails", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources = [draft.sources[0], { ...draft.sources[0], url: "https://example.org/other" }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "duplicate_source_id" });
  });

  test.each([
    ["URL未取得"],
    ["   "],
    ["/relative"],
    ["javascript:alert(1)"],
    ["data:text/plain,hello"],
    ["ftp://example.com"],
    ["http://example.com"],
    ["https://example.com/path"]
  ])("url %s validation", (url) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources = [{ ...draft.sources[0], url }];
    });

    const result = validateCompanyResearchEvidence(report);
    if (url === "http://example.com" || url === "https://example.com/path") {
      expect(result.ok).toBe(true);
    } else {
      expect(result).toEqual({ ok: false, reason: "unusable_source_url" });
    }
  });

  test.each(["", "   ", undefined])("orphan citation sourceId %s fails", (sourceId) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = [{ sourceId: sourceId as string, label: "[1]" }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "unknown_citation_source" });
  });

  test("unknown citation source fails", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = [{ sourceId: "missing-source", label: "[1]" }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "unknown_citation_source" });
  });

  test.each(REQUIRED_RESEARCH_SECTION_TITLES)("required section %s with no content fails", (title) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      const section = draft.sections.find(
        (item) => item.title.normalize("NFKC").replace(/[\s・/／]/g, "").replace(/の/g, "") ===
          title.normalize("NFKC").replace(/[\s・/／]/g, "").replace(/の/g, "")
      );
      if (section?.subsections[0]) section.subsections[0].content = ["   "];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "missing_critical_content" });
  });

  test("claim-bearing subsection without citations fails when citations are undefined", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = undefined as unknown as [];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "uncited_critical_claim" });
  });

  test("claim-bearing subsection without citations fails when citations are empty", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = [];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "uncited_critical_claim" });
  });

  test("extra uncited critical subsection fails", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections.push({
        id: "extra",
        title: "追加",
        content: ["追加の主張"],
        citations: []
      });
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "uncited_critical_claim" });
  });

  test("citation section orphan citation fails but noncritical uncited content alone does not", () => {
    const noncriticalReport = withReportMutations(buildValidReport(), (draft) => {
      draft.sections.push({
        id: "citation-section",
        title: "引用サイト・文献",
        subsections: [
          {
            id: "citation-section-1",
            title: "一覧",
            content: ["非クリティカルな説明"],
            citations: []
          }
        ]
      });
    });

    expect(validateCompanyResearchEvidence(noncriticalReport)).toEqual({ ok: true });

    const orphanReport = withReportMutations(buildValidReport(), (draft) => {
      draft.sections.push({
        id: "citation-section",
        title: "引用サイト・文献",
        subsections: [
          {
            id: "citation-section-1",
            title: "一覧",
            content: ["非クリティカルな説明"],
            citations: [{ sourceId: "orphan", label: "[1]" }]
          }
        ]
      });
    });

    expect(validateCompanyResearchEvidence(orphanReport)).toEqual({ ok: false, reason: "unknown_citation_source" });
  });

  test("does not mutate report", () => {
    const report = buildValidReport();
    const snapshot = structuredClone(report);

    validateCompanyResearchEvidence(report);

    expect(report).toEqual(snapshot);
  });

  test("serialization contains no raw malicious strings", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources[0]!.url = "javascript:alert('leak-me')";
    });

    const result = validateCompanyResearchEvidence(report);
    expect(JSON.stringify(result)).not.toContain("leak-me");
    expect(JSON.stringify(result)).not.toContain("javascript:");
  });
});
