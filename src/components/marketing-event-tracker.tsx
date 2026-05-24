"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getUtmParams, sendMarketingEvent, type MarketingEventPayload } from "@/lib/marketing/client";

export function MarketingEventTracker({
  eventType,
  ctaVariant,
  metadata
}: {
  eventType: MarketingEventPayload["eventType"];
  ctaVariant?: string;
  metadata?: MarketingEventPayload["metadata"];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    void sendMarketingEvent({
      eventType,
      page: pathname ?? undefined,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      ctaVariant,
      metadata,
      ...getUtmParams(searchParams)
    });
  }, [ctaVariant, eventType, metadata, pathname, searchParams]);

  return null;
}
