import { describe, expect, it } from "vitest";

import { canAccessInternalTools, isInternalAdminUser, parseAllowedInternalEmails } from "./internal-access";

describe("internal access helpers", () => {
  it("normalizes allowlist emails and drops blanks", () => {
    expect(parseAllowedInternalEmails(" Owner@Example.com, admin@example.com ,, viewer@example.com ")).toEqual([
      "owner@example.com",
      "admin@example.com",
      "viewer@example.com"
    ]);
  });

  it("allows only explicitly allowlisted emails", () => {
    const allowed = parseAllowedInternalEmails("owner@example.com,admin@example.com");

    expect(canAccessInternalTools("owner@example.com", allowed)).toBe(true);
    expect(canAccessInternalTools("OWNER@example.com", allowed)).toBe(true);
    expect(canAccessInternalTools("other@example.com", allowed)).toBe(false);
    expect(canAccessInternalTools(null, allowed)).toBe(false);
  });

  it("recognizes admin emails from env", () => {
    process.env.INTERNAL_ADMIN_EMAILS = "owner@example.com,admin@example.com";

    expect(isInternalAdminUser("admin@example.com")).toBe(true);
    expect(isInternalAdminUser("viewer@example.com")).toBe(false);
  });
});
