import { z } from "zod";

import { db } from "../db/client";
import { marketingEvents } from "../db/schema";

export const marketingEventTypes = [
  "lp_view",
  "cta_beta_click",
  "beta_form_view",
  "beta_form_submit",
  "demo_interaction_started",
  "job_text_pasted",
  "analysis_completed",
  "signup_started",
  "signup_completed"
] as const;

export type MarketingEventType = (typeof marketingEventTypes)[number];

export const marketingEventSchema = z.object({
  eventType: z.enum(marketingEventTypes),
  page: z.string().trim().max(200).optional(),
  referrer: z.string().trim().max(1000).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
  utmContent: z.string().trim().max(120).optional(),
  utmTerm: z.string().trim().max(120).optional(),
  ctaVariant: z.string().trim().max(40).optional(),
  currentStatus: z.string().trim().max(120).optional(),
  topProblemCategory: z.string().trim().max(120).optional(),
  textLengthBucket: z.string().trim().max(40).optional(),
  totalRank: z.string().trim().max(20).optional(),
  interviewOptIn: z.boolean().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export type MarketingEventInput = z.infer<typeof marketingEventSchema>;

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getTextLengthBucket(length: number) {
  if (length < 200) return "under_200";
  if (length < 600) return "200_to_599";
  if (length < 1200) return "600_to_1199";
  return "1200_plus";
}

export async function recordMarketingEvent(input: MarketingEventInput) {
  const parsed = marketingEventSchema.parse(input);
  const now = new Date();

  await db.insert(marketingEvents).values({
    id: crypto.randomUUID(),
    eventType: parsed.eventType,
    page: normalizeOptional(parsed.page),
    referrer: normalizeOptional(parsed.referrer),
    utmSource: normalizeOptional(parsed.utmSource),
    utmMedium: normalizeOptional(parsed.utmMedium),
    utmCampaign: normalizeOptional(parsed.utmCampaign),
    utmContent: normalizeOptional(parsed.utmContent),
    utmTerm: normalizeOptional(parsed.utmTerm),
    ctaVariant: normalizeOptional(parsed.ctaVariant),
    currentStatus: normalizeOptional(parsed.currentStatus),
    topProblemCategory: normalizeOptional(parsed.topProblemCategory),
    textLengthBucket: normalizeOptional(parsed.textLengthBucket),
    totalRank: normalizeOptional(parsed.totalRank),
    interviewOptIn: parsed.interviewOptIn ?? null,
    metadataJson: parsed.metadata ? JSON.stringify(parsed.metadata) : null,
    createdAt: now
  });
}
