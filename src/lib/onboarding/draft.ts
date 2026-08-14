export type OnboardingDraft = {
  started: boolean;
  currentStep: number;
  nickname: string;
  applicantStatus: string[];
  workStyles: string[];
  locations: string[];
  commutePreference: string;
  locationNote: string;
  salaryPreference: string;
  avoidConditions: string[];
  jobHuntingStatus: string;
  priority: string[];
  deferredRoles: boolean;
  deferredSkills: boolean;
  completedAt?: string;
  skippedAt?: string;
};

export function trimDisplayName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first || "あなた";
}

export function createInitialOnboardingDraft(initialName: string): OnboardingDraft {
  return {
    started: false,
    currentStep: 0,
    nickname: trimDisplayName(initialName),
    applicantStatus: [],
    workStyles: [],
    locations: [],
    commutePreference: "",
    locationNote: "",
    salaryPreference: "",
    avoidConditions: [],
    jobHuntingStatus: "",
    priority: [],
    deferredRoles: false,
    deferredSkills: false
  };
}

export function mergeOnboardingDraft(initialName: string, saved?: Partial<OnboardingDraft> | null): OnboardingDraft {
  const initialDraft = createInitialOnboardingDraft(initialName);

  if (!saved) {
    return initialDraft;
  }

  return {
    ...initialDraft,
    ...saved,
    nickname: typeof saved.nickname === "string" && saved.nickname.trim() ? saved.nickname : initialDraft.nickname,
    applicantStatus: Array.isArray(saved.applicantStatus) ? saved.applicantStatus : initialDraft.applicantStatus,
    workStyles: Array.isArray(saved.workStyles) ? saved.workStyles : initialDraft.workStyles,
    locations: Array.isArray(saved.locations) ? saved.locations : initialDraft.locations,
    avoidConditions: Array.isArray(saved.avoidConditions) ? saved.avoidConditions : initialDraft.avoidConditions,
    priority: Array.isArray(saved.priority) ? saved.priority : initialDraft.priority,
    currentStep: typeof saved.currentStep === "number" ? saved.currentStep : initialDraft.currentStep,
    started: Boolean(saved.started),
    commutePreference: typeof saved.commutePreference === "string" ? saved.commutePreference : "",
    locationNote: typeof saved.locationNote === "string" ? saved.locationNote : "",
    salaryPreference: typeof saved.salaryPreference === "string" ? saved.salaryPreference : "",
    jobHuntingStatus: typeof saved.jobHuntingStatus === "string" ? saved.jobHuntingStatus : "",
    deferredRoles: Boolean(saved.deferredRoles),
    deferredSkills: Boolean(saved.deferredSkills),
    completedAt: typeof saved.completedAt === "string" ? saved.completedAt : undefined,
    skippedAt: typeof saved.skippedAt === "string" ? saved.skippedAt : undefined
  } satisfies OnboardingDraft;
}

export function shouldPersistOnboardingDraft(draft: Pick<OnboardingDraft, "completedAt" | "skippedAt">) {
  return !draft.completedAt && !draft.skippedAt;
}
