import { describe, expect, test } from "vitest";

import { buildMockCompanyResearchReport } from "./mock-data";
import { REQUIRED_RESEARCH_SECTION_TITLES, validateCompanyResearchEvidence } from "./evidence-validator";
import type { CompanyResearchReport } from "./types";

function cloneReport(report: CompanyResearchReport): CompanyResearchReport {
  return structuredClone(report);
}

function withReportMutations(base: CompanyResearchReport, mutate: (report: CompanyResearchReport) => void): CompanyResearchReport {
  const report = cloneReport(base);
  mutate(report);
  return report;
}

function buildValidReport(): CompanyResearchReport {
  return buildMockCompanyResearchReport("株式会社テスト");
}

function buildSection(title: unknown, subsections: unknown = []): unknown {
  return { id: "section", title, subsections };
}

function buildSource(id: unknown, url: unknown): unknown {
  return { id, kind: "official", title: "t", url, fetchedAt: "2026-01-01", excerpt: "e", reliability: "high" };
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

  test.each([null, undefined, 0, 1, "", true, false, Symbol("x")])(
    "malformed report %s safely fails missing_required_sections",
    (report) => {
      expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
      expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "missing_required_sections" });
    }
  );

  test.each([{}, { sections: null }, { sections: [null] }, { sections: [buildSection(42)] }])(
    "malformed sections safely fails missing_required_sections",
    (report) => {
      expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
      expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "missing_required_sections" });
    }
  );

  test("extra malformed section does not throw or invalidate by itself", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections.push(
        {
          id: "extra-section",
          title: 42,
          subsections: [{ id: "ok", title: "x", content: ["extra"], citations: [{ sourceId: draft.sources[0]!.id, label: "[1]" }] }]
        } as unknown as CompanyResearchReport["sections"][number]
      );
    });

    expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: true });
  });

  test.each([
    [{ sources: [null] }, "invalid_source_id"],
    [{ sources: [buildSource(42, "https://example.com")] }, "invalid_source_id"],
    [{ sources: [buildSource("", "https://example.com")] }, "invalid_source_id"],
    [{ sources: [buildSource("   ", "https://example.com")] }, "invalid_source_id"],
    [{ sources: [buildSource("source-1", 42)] }, "unusable_source_url"],
    [{ sources: [buildSource("source-1", { href: "https://example.com" })] }, "unusable_source_url"]
  ] as const)("malformed sources safely fail %s", (mutation, reason) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      Object.assign(draft, mutation);
    });

    expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason });
  });

  test.each(["", "   ", undefined])("orphan citation sourceId %s fails", (sourceId) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = [{ sourceId: sourceId as never, label: "[1]" }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "unknown_citation_source" });
  });

  test("malformed citation entry fails safely", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = [null as never];
    });

    expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
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
        (item) => item.title.normalize("NFKC").replace(/[\s・/／]/g, "").replace(/の/g, "") === title.normalize("NFKC").replace(/[\s・/／]/g, "").replace(/の/g, "")
      );
      if (section?.subsections[0]) section.subsections[0].content = ["   "];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "missing_critical_content" });
  });

  test("malformed subsection content safely yields missing_critical_content", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0] = { ...draft.sections[0]!.subsections[0], content: null as never };
    });

    expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "missing_critical_content" });
  });

  test("claim-bearing subsection without citations fails when citations are undefined", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = undefined as never;
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "uncited_critical_claim" });
  });

  test("claim-bearing subsection without citations fails when citations are empty", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections[0]!.citations = [];
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

  test("https:example.com is not treated as explicit absolute URL", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources = [{ ...draft.sources[0], url: "https:example.com" }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "unusable_source_url" });
  });

  test.each(["http://example.com", "https://example.com/path"])("valid absolute url %s passes", (url) => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sources = [{ ...draft.sources[0], url }];
    });

    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: true });
  });

  test("hostile getter and revoked proxy never throw", () => {
    const hostileSection = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        }
      }
    );
    const revoked = Proxy.revocable(
      {
        sections: [hostileSection],
        sources: [buildSource("source-1", "https://example.com")]
      },
      {}
    );
    revoked.revoke();

    expect(() => validateCompanyResearchEvidence(revoked.proxy)).not.toThrow();
    expect(JSON.stringify(validateCompanyResearchEvidence(revoked.proxy))).toBe('{"ok":false,"reason":"missing_required_sections"}');
  });

  test("malformed citation and subsection arrays are handled safely", () => {
    const report = withReportMutations(buildValidReport(), (draft) => {
      draft.sections[0]!.subsections = [{ ...draft.sections[0]!.subsections[0], citations: [null as never, { sourceId: 1, label: "[1]" } as never] } as never];
      draft.sections[1]!.subsections = [null as never];
    });

    expect(() => validateCompanyResearchEvidence(report)).not.toThrow();
    expect(validateCompanyResearchEvidence(report)).toEqual({ ok: false, reason: "unknown_citation_source" });
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
