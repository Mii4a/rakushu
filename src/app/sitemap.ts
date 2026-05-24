import type { MetadataRoute } from "next";

import { buildCanonicalUrl } from "../lib/site";

const publicRoutes = [
  "/",
  "/beta",
  "/login",
  "/legal/commerce",
  "/legal/terms",
  "/legal/privacy",
  "/legal/refund"
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: buildCanonicalUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/beta" ? 0.8 : 0.6
  }));
}
