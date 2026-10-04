const fallbackSiteUrl = "http://localhost:3000";

function normalizeSiteUrl(url: string) {
  const parsed = new URL(url);

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use https in production");
  }

  return parsed.origin;
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL ?? fallbackSiteUrl);
}

export function getSiteOrigin() {
  return new URL(getSiteUrl());
}

export function buildCanonicalUrl(path = "/") {
  return new URL(path, getSiteOrigin()).toString();
}
