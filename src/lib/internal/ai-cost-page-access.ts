import { canAccessInternalTools } from "@/lib/auth/internal-access";

export type AiCostPageAccessResult = {
  allowed: boolean;
  redirectTo: string | null;
};

export function resolveAiCostPageAccess({
  requesterEmail,
  adminEmails
}: {
  requesterEmail: string | null | undefined;
  adminEmails: readonly string[];
}): AiCostPageAccessResult {
  const allowed = canAccessInternalTools(requesterEmail, adminEmails);

  return allowed ? { allowed: true, redirectTo: null } : { allowed: false, redirectTo: "/jobs" };
}
