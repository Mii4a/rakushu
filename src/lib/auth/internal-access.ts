function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseAllowedInternalEmails(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function canAccessInternalTools(email: string | null | undefined, allowedEmails: readonly string[]) {
  if (!email) {
    return false;
  }

  return allowedEmails.includes(normalizeEmail(email));
}

export function isInternalToolsUser(email: string | null | undefined) {
  return canAccessInternalTools(email, parseAllowedInternalEmails(process.env.INTERNAL_TOOL_EMAILS));
}

export function isInternalAdminUser(email: string | null | undefined) {
  return canAccessInternalTools(email, parseAllowedInternalEmails(process.env.INTERNAL_ADMIN_EMAILS));
}
