export type MarketingEventType =
  | "lp_view"
  | "cta_beta_click"
  | "beta_form_view"
  | "beta_form_submit"
  | "demo_interaction_started"
  | "job_text_pasted"
  | "analysis_completed"
  | "signup_started"
  | "signup_completed";

export type MarketingEventPayload = {
  eventType: MarketingEventType;
  page?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  ctaVariant?: string;
  currentStatus?: string;
  topProblemCategory?: string;
  textLengthBucket?: string;
  totalRank?: string;
  interviewOptIn?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
};

const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type SearchParamReader = {
  get(name: string): string | null;
};

export function getUtmParams(searchParams: SearchParamReader | null) {
  return {
    utmSource: searchParams?.get("utm_source") ?? undefined,
    utmMedium: searchParams?.get("utm_medium") ?? undefined,
    utmCampaign: searchParams?.get("utm_campaign") ?? undefined,
    utmContent: searchParams?.get("utm_content") ?? undefined,
    utmTerm: searchParams?.get("utm_term") ?? undefined
  };
}

export function buildTrackedHref(pathname: string, searchParams: SearchParamReader | null, extra: Record<string, string>) {
  const params = new URLSearchParams();

  for (const key of utmKeys) {
    const value = searchParams?.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(extra)) {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getTextLengthBucket(length: number) {
  if (length < 200) return "under_200";
  if (length < 600) return "200_to_599";
  if (length < 1200) return "600_to_1199";
  return "1200_plus";
}

export function sendMarketingEvent(payload: MarketingEventPayload) {
  return fetch("/api/marketing-events", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => undefined);
}

export function sendMarketingEventBeacon(payload: MarketingEventPayload) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/marketing-events", blob)) {
      return;
    }
  }

  void sendMarketingEvent(payload);
}
