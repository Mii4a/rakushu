import { describe, expect, test } from "vitest";

import { buildCompanyResearchResultFromQuery } from "@/lib/company-research/generate-result";

describe("buildCompanyResearchResultFromQuery", () => {
  test("derives a company-specific result from a known URL instead of returning a single fixed mock", () => {
    const toyota = buildCompanyResearchResultFromQuery("https://www.toyota.co.jp/recruit/");
    const mercari = buildCompanyResearchResultFromQuery("https://about.mercari.com/careers/");

    expect(toyota.companyName).toContain("トヨタ");
    expect(mercari.companyName).toContain("メルカリ");
    expect(mercari.companyName).not.toEqual(toyota.companyName);
    expect(mercari.summary).toContain("メルカリ");
    expect(mercari.keyPoints.some((point) => point.includes("メルカリ"))).toBe(true);
  });

  test("falls back to a normalized company-style result for free text queries", () => {
    const result = buildCompanyResearchResultFromQuery("Acme Future Systems");

    expect(result.companyName).toBe("Acme Future Systems");
    expect(result.summary).toContain("Acme Future Systems");
    expect(result.nextActions).toHaveLength(3);
  });
});
