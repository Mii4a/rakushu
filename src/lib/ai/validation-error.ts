export type StructuredAiValidationFailureReason =
  | "provider_schema"
  | "missing_required_sections"
  | "missing_sources"
  | "invalid_source_id"
  | "duplicate_source_id"
  | "unusable_source_url"
  | "unknown_citation_source"
  | "missing_critical_content"
  | "uncited_critical_claim";

const VALIDATION_FAILURE_REASONS = new Set<StructuredAiValidationFailureReason>([
  "provider_schema",
  "missing_required_sections",
  "missing_sources",
  "invalid_source_id",
  "duplicate_source_id",
  "unusable_source_url",
  "unknown_citation_source",
  "missing_critical_content",
  "uncited_critical_claim"
]);

export class StructuredAiValidationError extends Error {
  readonly reason: StructuredAiValidationFailureReason;

  constructor(reason: StructuredAiValidationFailureReason) {
    super(`Structured AI validation failed: ${reason}`);
    this.name = "StructuredAiValidationError";
    this.reason = reason;
  }
}

export function isStructuredAiValidationFailureReason(value: unknown): value is StructuredAiValidationFailureReason {
  return typeof value === "string" && VALIDATION_FAILURE_REASONS.has(value as StructuredAiValidationFailureReason);
}

export function structuredAiValidationFailureReason(error: unknown): StructuredAiValidationFailureReason | null {
  if (typeof error !== "object" || error === null) return null;
  try {
    if (!Object.prototype.hasOwnProperty.call(error, "reason")) return null;
    const candidate = error as { name?: unknown; reason?: unknown };
    if (candidate.name !== "StructuredAiValidationError") return null;
    return isStructuredAiValidationFailureReason(candidate.reason) ? candidate.reason : null;
  } catch {
    return null;
  }
}
