import { describe, expect, it } from "vitest";

import { resolveParserFeedbackPageAccess } from "./parser-feedback-page-access";

describe("resolveParserFeedbackPageAccess", () => {
  const allowedEmails = ["mii4a2501@gmail.com", "toolonly@example.com"];
  const adminEmails = ["mii4a2501@gmail.com"];

  it("allows admin users to view all parser feedback rows", () => {
    expect(
      resolveParserFeedbackPageAccess({
        requesterUserId: "admin-user-id",
        requesterEmail: "mii4a2501@gmail.com",
        allowedEmails,
        adminEmails
      })
    ).toEqual({
      allowed: true,
      redirectTo: null,
      restrictToUserId: null
    });
  });

  it("allows non-admin internal users but restricts them to their own rows", () => {
    expect(
      resolveParserFeedbackPageAccess({
        requesterUserId: "tool-user-id",
        requesterEmail: "toolonly@example.com",
        allowedEmails,
        adminEmails
      })
    ).toEqual({
      allowed: true,
      redirectTo: null,
      restrictToUserId: "tool-user-id"
    });
  });

  it("redirects non-allowlisted users away from the internal page", () => {
    expect(
      resolveParserFeedbackPageAccess({
        requesterUserId: "outsider-user-id",
        requesterEmail: "outsider@example.com",
        allowedEmails,
        adminEmails
      })
    ).toEqual({
      allowed: false,
      redirectTo: "/jobs",
      restrictToUserId: "__no_access__"
    });
  });
});
