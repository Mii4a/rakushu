import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUserInApi } from "@/lib/auth/require-user-api";
import { buildManualCommuteFields } from "@/lib/commute/fields";
import { getGtfsCommuteRangeByStationNames } from "@/lib/commute/gtfs-range-db";
import { estimateTransitCommuteMinutes } from "@/lib/commute/google-routes";
import { getUserCommuteProfile } from "@/lib/commute";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

export async function POST(request: Request) {
  try {
    const user = await requireUserInApi();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    if (!PLAN_LIMITS[plan].commute.canAutoEstimate) {
      return NextResponse.json({ error: "通勤時間の自動取得は Plus プラン以上で利用できます。" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { jobId?: string };
    const jobId = body.jobId ?? "";
    if (!jobId) {
      return NextResponse.json({ error: "jobId が必要です。" }, { status: 400 });
    }

    const [profile, jobRows] = await Promise.all([
      getUserCommuteProfile(user.id),
      db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id))).limit(1)
    ]);
    const job = jobRows[0];

    if (!profile) {
      return NextResponse.json({ error: "先に通勤プロフィールを登録してください。" }, { status: 400 });
    }

    if (!job) {
      return NextResponse.json({ error: "求人が見つかりません。" }, { status: 404 });
    }

    const originStation = profile.homeNearestStation || "";
    const destinationStation = job.nearestStation || "";
    const originAddress = originStation || profile.homeAddress || "";
    const destinationAddress = destinationStation || job.workAddress || "";

    if (!originAddress || !destinationAddress) {
      return NextResponse.json({ error: "出発地または到着地が不足しています。" }, { status: 400 });
    }

    const gtfsRange =
      originStation && destinationStation
        ? await getGtfsCommuteRangeByStationNames({
            originStationName: originStation,
            destinationStationName: destinationStation
          })
        : null;

    let commuteUpdate:
      | {
          commuteMinutes: number | null;
          commuteMinutesMin: number | null;
          commuteMinutesMax: number | null;
          commuteMinutesTypical: number | null;
          commuteDataKind: string | null;
        }
      | null = null;

    if (gtfsRange) {
      commuteUpdate = {
        commuteMinutes: gtfsRange.typicalMinutes,
        commuteMinutesMin: gtfsRange.minMinutes,
        commuteMinutesMax: gtfsRange.maxMinutes,
        commuteMinutesTypical: gtfsRange.typicalMinutes,
        commuteDataKind: "gtfs_range"
      };
    } else {
      const commuteMinutes = await estimateTransitCommuteMinutes({
        originAddress,
        destinationAddress
      });
      commuteUpdate = {
        ...buildManualCommuteFields(commuteMinutes),
        commuteDataKind: "estimated_range"
      };
    }

    await db
      .update(jobs)
      .set({
        ...commuteUpdate,
        updatedAt: new Date()
      })
      .where(and(eq(jobs.id, job.id), eq(jobs.userId, user.id)));

    return NextResponse.json(commuteUpdate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "通勤時間の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
