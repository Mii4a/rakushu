import { describe, expect, it } from "vitest";

import { resolveAiCostPageAccess } from "./ai-cost-page-access";

describe("resolveAiCostPageAccess", () => {
  it("allows only admin emails and redirects everyone else to jobs", () => {
    const admin = resolveAiCostPageAccess({
      requesterEmail: "admin@example.com",
      adminEmails: ["admin@example.com", "other@example.com"]
    });

    expect(admin).toEqual({ allowed: true, redirectTo: null });

    expect(
      resolveAiCostPageAccess({
        requesterEmail: "tool@example.com",
        adminEmails: ["admin@example.com"]
      })
    ).toEqual({ allowed: false, redirectTo: "/jobs" });

    expect(
      resolveAiCostPageAccess({
        requesterEmail: null,
        adminEmails: ["admin@example.com"]
      })
    ).toEqual({ allowed: false, redirectTo: "/jobs" });
  });

  it("does not grant access to tool-only or general allowlists", () => {
    expect(
      resolveAiCostPageAccess({
        requesterEmail: "tool@example.com",
        adminEmails: []
      })
    ).toEqual({ allowed: false, redirectTo: "/jobs" });
  });
});
