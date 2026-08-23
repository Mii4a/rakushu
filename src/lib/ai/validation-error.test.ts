import { describe, expect, it } from "vitest";

import {
  StructuredAiValidationError,
  isStructuredAiValidationFailureReason,
  structuredAiValidationFailureReason
} from "./validation-error";

describe("structured AI validation errors", () => {
  it("extracts only the allowlisted reason from the dedicated error", () => {
    const error = new StructuredAiValidationError("missing_required_sections");

    expect(structuredAiValidationFailureReason(error)).toBe("missing_required_sections");
    expect(error).not.toHaveProperty("payload");
  });

  it("accepts the fixed cross-realm shape without reading raw error messages", () => {
    const error = Object.assign(Object.create(null), {
      name: "StructuredAiValidationError",
      reason: "unknown_citation_source",
      message: "PRIVATE provider output"
    });

    expect(structuredAiValidationFailureReason(error)).toBe("unknown_citation_source");
  });

  it("rejects arbitrary, inherited, and mismatched reasons", () => {
    expect(structuredAiValidationFailureReason({ name: "StructuredAiValidationError", reason: "PRIVATE output" })).toBeNull();
    expect(structuredAiValidationFailureReason(Object.create({ reason: "missing_sources" }))).toBeNull();
    expect(structuredAiValidationFailureReason({ name: "Error", reason: "missing_sources" })).toBeNull();
  });

  it("returns null when hostile getters throw", () => {
    const error = Object.create(null);
    Object.defineProperty(error, "reason", {
      enumerable: true,
      get() {
        throw new Error("PRIVATE getter payload");
      }
    });
    Object.defineProperty(error, "name", {
      enumerable: true,
      value: "StructuredAiValidationError"
    });

    expect(() => structuredAiValidationFailureReason(error)).not.toThrow();
    expect(structuredAiValidationFailureReason(error)).toBeNull();
  });

  it("exposes a narrow runtime allowlist", () => {
    expect(isStructuredAiValidationFailureReason("provider_schema")).toBe(true);
    expect(isStructuredAiValidationFailureReason("missing_sources")).toBe(true);
    expect(isStructuredAiValidationFailureReason("prompt")).toBe(false);
    expect(isStructuredAiValidationFailureReason(null)).toBe(false);
  });
});
