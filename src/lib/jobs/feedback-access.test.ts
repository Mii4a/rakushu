import { describe, expect, it } from "vitest";

import { resolveFeedbackAccessScope } from "./feedback-access";

describe("resolveFeedbackAccessScope", () => {
  it("allows admins to see all feedback rows", () => {
    expect(
      resolveFeedbackAccessScope({
        requesterUserId: "user-1",
        requesterEmail: "owner@example.com",
        adminEmails: ["owner@example.com"]
      })
    ).toEqual({ restrictToUserId: null });
  });

  it("restricts non-admin internal users to their own jobs", () => {
    expect(
      resolveFeedbackAccessScope({
        requesterUserId: "user-1",
        requesterEmail: "reviewer@example.com",
        adminEmails: ["owner@example.com"]
      })
    ).toEqual({ restrictToUserId: "user-1" });
  });

  it("fails closed when requester user id is missing", () => {
    expect(
      resolveFeedbackAccessScope({
        requesterUserId: "",
        requesterEmail: "owner@example.com",
        adminEmails: ["owner@example.com"]
      })
    ).toEqual({ restrictToUserId: "__no_access__" });
  });
});
