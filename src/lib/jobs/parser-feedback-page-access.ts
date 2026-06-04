import { canAccessInternalTools } from "@/lib/auth/internal-access";
import { resolveFeedbackAccessScope } from "@/lib/jobs/feedback-access";

type ResolveParserFeedbackPageAccessParams = {
  requesterUserId: string | null | undefined;
  requesterEmail: string | null | undefined;
  allowedEmails: readonly string[];
  adminEmails: readonly string[];
};

export function resolveParserFeedbackPageAccess(params: ResolveParserFeedbackPageAccessParams) {
  if (!canAccessInternalTools(params.requesterEmail, params.allowedEmails)) {
    return {
      allowed: false,
      redirectTo: "/jobs",
      restrictToUserId: "__no_access__"
    } as const;
  }

  const accessScope = resolveFeedbackAccessScope({
    requesterUserId: params.requesterUserId,
    requesterEmail: params.requesterEmail,
    adminEmails: params.adminEmails
  });

  return {
    allowed: true,
    redirectTo: null,
    restrictToUserId: accessScope.restrictToUserId
  } as const;
}
