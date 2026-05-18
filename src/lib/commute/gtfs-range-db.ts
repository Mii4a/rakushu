import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  transitRoutes,
  transitServiceExceptions,
  transitServices,
  transitStationAliases,
  transitStops,
  transitStopTimes,
  transitTrips
} from "@/lib/db/schema";

import { calculateGtfsCommuteRange, type CommuteRangeResult } from "./gtfs-range";
import { resolveActiveServiceIds } from "./service-calendar";
import { normalizeStationName } from "./station-name";

type FeedStopCandidate = {
  feedId: string;
  stopId: string;
};

async function getFeedStopCandidates(stationName: string, region?: string) {
  const normalizedName = normalizeStationName(stationName);
  const aliasRows = await db
    .select({
      canonicalStopId: transitStationAliases.canonicalStopId,
      region: transitStationAliases.region
    })
    .from(transitStationAliases)
    .where(
      region
        ? and(eq(transitStationAliases.normalizedName, normalizedName), eq(transitStationAliases.region, region))
        : eq(transitStationAliases.normalizedName, normalizedName)
    );

  if (aliasRows.length === 0) {
    return [];
  }

  const stopRows = await db
    .select({
      feedId: transitStops.feedId,
      stopId: transitStops.stopId
    })
    .from(transitStops)
    .where(inArray(transitStops.stopId, aliasRows.map((row) => row.canonicalStopId)));

  return stopRows;
}

async function calculateRangeForFeed(params: {
  feedId: string;
  originStopId: string;
  destinationStopId: string;
  departureWindowStart?: string;
  departureWindowEnd?: string;
  targetDate?: string;
}) {
  const [routes, trips, services, exceptions, stopTimes] = await Promise.all([
    db
      .select({
        routeId: transitRoutes.routeId,
        routeShortName: transitRoutes.routeShortName,
        routeLongName: transitRoutes.routeLongName,
        routeDesc: transitRoutes.routeDesc
      })
      .from(transitRoutes)
      .where(eq(transitRoutes.feedId, params.feedId)),
    db
      .select({
        tripId: transitTrips.tripId,
        routeId: transitTrips.routeId,
        serviceId: transitTrips.serviceId,
        tripShortName: transitTrips.tripShortName,
        tripHeadsign: transitTrips.tripHeadsign
      })
      .from(transitTrips)
      .where(eq(transitTrips.feedId, params.feedId)),
    db
      .select({
        serviceId: transitServices.serviceId,
        monday: transitServices.monday,
        tuesday: transitServices.tuesday,
        wednesday: transitServices.wednesday,
        thursday: transitServices.thursday,
        friday: transitServices.friday
      })
      .from(transitServices)
      .where(eq(transitServices.feedId, params.feedId)),
    db
      .select({
        serviceId: transitServiceExceptions.serviceId,
        serviceDate: transitServiceExceptions.serviceDate,
        exceptionType: transitServiceExceptions.exceptionType
      })
      .from(transitServiceExceptions)
      .where(eq(transitServiceExceptions.feedId, params.feedId)),
    db
      .select({
        tripId: transitStopTimes.tripId,
        stopId: transitStopTimes.stopId,
        arrivalTime: transitStopTimes.arrivalTime,
        departureTime: transitStopTimes.departureTime,
        stopSequence: transitStopTimes.stopSequence,
        stopHeadsign: transitStopTimes.stopHeadsign
      })
      .from(transitStopTimes)
      .where(eq(transitStopTimes.feedId, params.feedId))
  ]);

  const activeServiceIds = services.length > 0 ? resolveActiveServiceIds({ services, exceptions, targetDate: params.targetDate }) : null;

  return calculateGtfsCommuteRange({
    originStopId: params.originStopId,
    destinationStopId: params.destinationStopId,
    routes,
    trips,
    stopTimes,
    departureWindowStart: params.departureWindowStart,
    departureWindowEnd: params.departureWindowEnd,
    activeServiceIds
  });
}

export async function getGtfsCommuteRangeByStationNames(params: {
  originStationName: string;
  destinationStationName: string;
  region?: string;
  departureWindowStart?: string;
  departureWindowEnd?: string;
  targetDate?: string;
}): Promise<(CommuteRangeResult & { feedId: string }) | null> {
  const [originCandidates, destinationCandidates] = await Promise.all([
    getFeedStopCandidates(params.originStationName, params.region),
    getFeedStopCandidates(params.destinationStationName, params.region)
  ]);

  if (originCandidates.length === 0 || destinationCandidates.length === 0) {
    return null;
  }

  const destinationByFeed = new Map<string, FeedStopCandidate[]>();
  for (const candidate of destinationCandidates) {
    const current = destinationByFeed.get(candidate.feedId) ?? [];
    current.push(candidate);
    destinationByFeed.set(candidate.feedId, current);
  }

  const results: Array<CommuteRangeResult & { feedId: string }> = [];

  for (const origin of originCandidates) {
    const destinations = destinationByFeed.get(origin.feedId) ?? [];

    for (const destination of destinations) {
      const range = await calculateRangeForFeed({
        feedId: origin.feedId,
        originStopId: origin.stopId,
        destinationStopId: destination.stopId,
        departureWindowStart: params.departureWindowStart,
        departureWindowEnd: params.departureWindowEnd,
        targetDate: params.targetDate
      });

      if (range) {
        results.push({
          ...range,
          feedId: origin.feedId
        });
      }
    }
  }

  if (results.length === 0) {
    return null;
  }

  return results.sort((a, b) => a.minMinutes - b.minMinutes)[0];
}
