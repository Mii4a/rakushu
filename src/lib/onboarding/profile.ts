import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { userOnboardingProfiles } from "@/lib/db/schema";
import { type OnboardingDraft } from "@/lib/onboarding/draft";

function parseStringArray(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function getUserOnboardingDraft(userId: string): Promise<OnboardingDraft | null> {
  const row = (
    await db.select().from(userOnboardingProfiles).where(eq(userOnboardingProfiles.userId, userId)).limit(1)
  )[0];

  if (!row) {
    return null;
  }

  return {
    started: row.started,
    currentStep: row.currentStep,
    nickname: row.nickname ?? "",
    applicantStatus: parseStringArray(row.applicantStatusJson),
    workStyles: parseStringArray(row.workStylesJson),
    locations: parseStringArray(row.locationsJson),
    commutePreference: row.commutePreference ?? "",
    locationNote: row.locationNote ?? "",
    salaryPreference: row.salaryPreference ?? "",
    avoidConditions: parseStringArray(row.avoidConditionsJson),
    jobHuntingStatus: row.jobHuntingStatus ?? "",
    priority: parseStringArray(row.priorityJson),
    deferredRoles: row.deferredRoles,
    deferredSkills: row.deferredSkills,
    completedAt: row.completedAt ? row.completedAt.toISOString() : undefined,
    skippedAt: row.skippedAt ? row.skippedAt.toISOString() : undefined
  };
}

export function isOnboardingFinished(draft: OnboardingDraft | null | undefined) {
  return Boolean(draft?.completedAt || draft?.skippedAt);
}
