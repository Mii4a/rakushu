export const TOP_DEMO_INTENT_STORAGE_KEY = "rakushu:top-demo-intent";

export type TopDemoFeature = "job-checker" | "company-research";

export type TopDemoIntent = {
  source: "top-demo";
  feature: TopDemoFeature;
  payload: {
    jobText?: string;
    companyUrl?: string;
  };
  createdAt: number;
};

const maxAgeMs = 1000 * 60 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function readTopDemoIntent(expectedFeature: TopDemoFeature): TopDemoIntent | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(TOP_DEMO_INTENT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.source !== "top-demo" || parsed.feature !== expectedFeature) return null;
    if (typeof parsed.createdAt !== "number" || Date.now() - parsed.createdAt > maxAgeMs) return null;
    if (!isRecord(parsed.payload)) return null;

    return parsed as TopDemoIntent;
  } catch {
    return null;
  }
}

export function writeTopDemoIntent(intent: TopDemoIntent) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOP_DEMO_INTENT_STORAGE_KEY, JSON.stringify(intent));
}

export function clearTopDemoIntent() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOP_DEMO_INTENT_STORAGE_KEY);
}
