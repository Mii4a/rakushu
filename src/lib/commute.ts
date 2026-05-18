import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { userCommuteProfiles } from "@/lib/db/schema";
import { buildManualCommuteFields } from "@/lib/commute/fields";
import { getGtfsCommuteRangeByStationNames } from "@/lib/commute/gtfs-range-db";

export async function getUserCommuteProfile(userId: string) {
  return db.query.userCommuteProfiles.findFirst({
    where: eq(userCommuteProfiles.userId, userId)
  });
}

export async function resolveCommuteFields(params: {
  userId: string;
  destinationStationName?: string | null;
  manualCommuteMinutes?: number | null;
}) {
  if (params.manualCommuteMinutes != null) {
    return buildManualCommuteFields(params.manualCommuteMinutes);
  }

  if (!params.destinationStationName) {
    return buildManualCommuteFields(null);
  }

  const profile = await getUserCommuteProfile(params.userId);
  const originStationName = profile?.homeNearestStation?.trim() || "";
  const destinationStationName = params.destinationStationName.trim();

  if (!originStationName || !destinationStationName) {
    return buildManualCommuteFields(null);
  }

  const range = await getGtfsCommuteRangeByStationNames({
    originStationName,
    destinationStationName
  });

  if (!range) {
    return buildManualCommuteFields(null);
  }

  return {
    commuteMinutes: range.typicalMinutes,
    commuteMinutesMin: range.minMinutes,
    commuteMinutesMax: range.maxMinutes,
    commuteMinutesTypical: range.typicalMinutes,
    commuteDataKind: "gtfs_range" as const
  };
}
