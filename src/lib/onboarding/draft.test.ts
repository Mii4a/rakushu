import { describe, expect, it } from "vitest";

import { createInitialOnboardingDraft, shouldPersistOnboardingDraft } from "@/lib/onboarding/draft";

describe("shouldPersistOnboardingDraft", () => {
  it("returns true for an in-progress draft", () => {
    const draft = {
      ...createInitialOnboardingDraft("たろですよ"),
      started: true,
      currentStep: 2
    };

    expect(shouldPersistOnboardingDraft(draft)).toBe(true);
  });

  it("returns false after onboarding completion", () => {
    const draft = {
      ...createInitialOnboardingDraft("たろですよ"),
      started: true,
      currentStep: 5,
      completedAt: "2026-06-08T00:00:00.000Z"
    };

    expect(shouldPersistOnboardingDraft(draft)).toBe(false);
  });

  it("returns false after onboarding skip", () => {
    const draft = {
      ...createInitialOnboardingDraft("たろですよ"),
      started: true,
      currentStep: 0,
      skippedAt: "2026-06-08T00:00:00.000Z"
    };

    expect(shouldPersistOnboardingDraft(draft)).toBe(false);
  });
});
