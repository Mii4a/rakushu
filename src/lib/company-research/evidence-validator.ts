import type { CompanyResearchReport, ResearchCitation, ResearchSection, ResearchSource } from "./types";

export const REQUIRED_RESEARCH_SECTION_TITLES = [
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

export type EvidenceFailureReason =
  | "missing_required_sections"
  | "missing_sources"
  | "invalid_source_id"
  | "duplicate_source_id"
  | "unusable_source_url"
  | "unknown_citation_source"
  | "missing_critical_content"
  | "uncited_critical_claim";

export type EvidenceValidationResult = { ok: true } | { ok: false; reason: EvidenceFailureReason };

const REQUIRED_SECTION_CANONICALS = new Set(REQUIRED_RESEARCH_SECTION_TITLES.map(canonicalizeTitle));

function canonicalizeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s・/／]/g, "")
    .replace(/の/g, "");
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim();
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && normalizeText(value).length > 0;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getSections(report: CompanyResearchReport): ResearchSection[] {
  return Array.isArray(report.sections) ? report.sections : [];
}

function getSources(report: CompanyResearchReport): ResearchSource[] {
  return Array.isArray(report.sources) ? report.sources : [];
}

function sectionHasRequiredTitle(section: ResearchSection): boolean {
  return REQUIRED_SECTION_CANONICALS.has(canonicalizeTitle(section.title));
}

function hasClaimContent(subsection: { content?: unknown }): boolean {
  return Array.isArray(subsection.content) && subsection.content.some(isNonEmptyTrimmedString);
}

function hasValidCitations(citations: unknown, sourceIds: Set<string>): boolean {
  if (!Array.isArray(citations) || citations.length === 0) return false;
  return citations.every((citation) => {
    if (!citation || typeof citation !== "object") return false;
    const entry = citation as Partial<ResearchCitation>;
    return isNonEmptyTrimmedString(entry.sourceId) && sourceIds.has(entry.sourceId.trim());
  });
}

export function validateCompanyResearchEvidence(report: CompanyResearchReport): EvidenceValidationResult {
  const sections = getSections(report);
  if (REQUIRED_RESEARCH_SECTION_TITLES.some((title) => !sections.some((section) => canonicalizeTitle(section.title) === canonicalizeTitle(title)))) {
    return { ok: false, reason: "missing_required_sections" };
  }

  const sources = getSources(report);
  if (sources.length === 0) {
    return { ok: false, reason: "missing_sources" };
  }

  const sourceIds = new Set<string>();
  for (const source of sources) {
    if (!isNonEmptyTrimmedString(source?.id)) {
      return { ok: false, reason: "invalid_source_id" };
    }
    const id = source.id.trim();
    if (sourceIds.has(id)) {
      return { ok: false, reason: "duplicate_source_id" };
    }
    sourceIds.add(id);
  }

  for (const source of sources) {
    const url = normalizeText(source.url ?? "");
    if (url === "" || url === "URL未取得" || !isValidHttpUrl(url)) {
      return { ok: false, reason: "unusable_source_url" };
    }
  }

  for (const section of sections) {
    if (!Array.isArray(section.subsections)) continue;
    for (const subsection of section.subsections) {
      if (!Array.isArray(subsection?.citations)) continue;
      for (const citation of subsection.citations) {
        const sourceId = typeof citation?.sourceId === "string" ? citation.sourceId.trim() : "";
        if (!sourceId || !sourceIds.has(sourceId)) {
          return { ok: false, reason: "unknown_citation_source" };
        }
      }
    }
  }

  for (const section of sections) {
    if (!sectionHasRequiredTitle(section)) continue;
    const subsections = Array.isArray(section.subsections) ? section.subsections : [];
    if (!subsections.some((subsection) => hasClaimContent(subsection))) {
      return { ok: false, reason: "missing_critical_content" };
    }
    for (const subsection of subsections) {
      if (hasClaimContent(subsection) && !hasValidCitations(subsection.citations, sourceIds)) {
        return { ok: false, reason: "uncited_critical_claim" };
      }
    }
  }

  return { ok: true };
}
