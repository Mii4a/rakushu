const fallbackSiteUrl = "http://localhost:3000";

function normalizeSiteUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
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
