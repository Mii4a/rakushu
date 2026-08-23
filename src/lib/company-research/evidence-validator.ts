

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

type RecordLike = Record<PropertyKey, unknown>;

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

function isRecordLike(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

function safeGet(value: unknown, key: PropertyKey): unknown {
  if (!isRecordLike(value)) return undefined;
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getSections(report: unknown): unknown[] {
  return safeArray(safeGet(report, "sections"));
}

function getSources(report: unknown): unknown[] {
  return safeArray(safeGet(report, "sources"));
}

function sectionHasRequiredTitle(section: unknown): boolean {
  const title = safeGet(section, "title");
  return isNonEmptyTrimmedString(title) && REQUIRED_SECTION_CANONICALS.has(canonicalizeTitle(title));
}

function hasClaimContent(subsection: unknown): boolean {
  const content = safeGet(subsection, "content");
  return Array.isArray(content) && content.some(isNonEmptyTrimmedString);
}

function isValidHttpUrl(value: string): boolean {
  const normalized = normalizeText(value);
  if (!/^https?:\/\//i.test(normalized)) return false;
  try {
    const parsed = new URL(normalized);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.trim().length > 0;
  } catch {
    return false;
  }
}

function sourceIdFromCitation(citation: unknown): string {
  const sourceId = safeGet(citation, "sourceId");
  return isNonEmptyTrimmedString(sourceId) ? sourceId.trim() : "";
}

function hasValidCitations(citations: unknown, sourceIds: Set<string>): boolean {
  if (!Array.isArray(citations) || citations.length === 0) return false;
  return citations.every((citation) => {
    const sourceId = sourceIdFromCitation(citation);
    return sourceId.length > 0 && sourceIds.has(sourceId);
  });
}

function result(reason: EvidenceFailureReason): EvidenceValidationResult {
  return { ok: false, reason };
}

function validateCompanyResearchEvidenceInternal(report: unknown): EvidenceValidationResult {
  const sections = getSections(report);
  if (
    REQUIRED_RESEARCH_SECTION_TITLES.some(
      (title) => !sections.some((section) => sectionHasRequiredTitle(section) && canonicalizeTitle(String(safeGet(section, "title"))) === canonicalizeTitle(title))
    )
  ) {
    return result("missing_required_sections");
  }

  const sources = getSources(report);
  if (sources.length === 0) {
    return result("missing_sources");
  }

  const sourceIds = new Set<string>();
  for (const source of sources) {
    const id = safeGet(source, "id");
    if (!isNonEmptyTrimmedString(id)) {
      return result("invalid_source_id");
    }
    const trimmedId = id.trim();
    if (sourceIds.has(trimmedId)) {
      return result("duplicate_source_id");
    }
    sourceIds.add(trimmedId);
  }

  for (const source of sources) {
    const url = safeGet(source, "url");
    if (!isNonEmptyTrimmedString(url) || !isValidHttpUrl(url)) {
      return result("unusable_source_url");
    }
  }

  for (const section of sections) {
    const subsections = safeArray(safeGet(section, "subsections"));
    for (const subsection of subsections) {
      const citations = safeArray(safeGet(subsection, "citations"));
      for (const citation of citations) {
        const sourceId = sourceIdFromCitation(citation);
        if (!sourceId || !sourceIds.has(sourceId)) {
          return result("unknown_citation_source");
        }
      }
    }
  }

  for (const section of sections) {
    if (!sectionHasRequiredTitle(section)) continue;
    const subsections = safeArray(safeGet(section, "subsections"));
    if (!subsections.some((subsection) => hasClaimContent(subsection))) {
      return result("missing_critical_content");
    }
    for (const subsection of subsections) {
      if (hasClaimContent(subsection) && !hasValidCitations(safeGet(subsection, "citations"), sourceIds)) {
        return result("uncited_critical_claim");
      }
    }
  }

  return { ok: true };
}

export function validateCompanyResearchEvidence(report: unknown): EvidenceValidationResult {
  try {
    return validateCompanyResearchEvidenceInternal(report);
  } catch {
    return result("missing_required_sections");
  }
}
