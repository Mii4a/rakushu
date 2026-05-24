import { NextResponse } from "next/server";

import { marketingEventSchema, recordMarketingEvent } from "@/lib/marketing/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = marketingEventSchema.parse(body);

    await recordMarketingEvent({
      ...payload,
      referrer: payload.referrer ?? request.headers.get("referer") ?? undefined
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
