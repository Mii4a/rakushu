type ResolveFeedbackAccessScopeParams = {
  requesterUserId: string | null | undefined;
  requesterEmail: string | null | undefined;
  adminEmails: readonly string[];
};

export function resolveFeedbackAccessScope(params: ResolveFeedbackAccessScopeParams) {
  if (!params.requesterUserId) {
    return { restrictToUserId: "__no_access__" } as const;
  }

  const normalizedEmail = params.requesterEmail?.trim().toLowerCase();
  const isAdmin = normalizedEmail ? params.adminEmails.includes(normalizedEmail) : false;

  if (isAdmin) {
    return { restrictToUserId: null } as const;
  }

  return { restrictToUserId: params.requesterUserId } as const;
}
