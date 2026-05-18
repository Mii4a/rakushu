import { classifyCommuteServiceLabel } from "./service-filters";

export type GtfsRouteRecord = {
  routeId: string;
  routeShortName?: string | null;
  routeLongName?: string | null;
  routeDesc?: string | null;
};

export type GtfsTripRecord = {
  tripId: string;
  routeId?: string | null;
  serviceId?: string | null;
  tripShortName?: string | null;
  tripHeadsign?: string | null;
};

export type GtfsStopTimeRecord = {
  tripId: string;
  stopId: string;
  arrivalTime?: string | null;
  departureTime?: string | null;
  stopSequence: number;
  stopHeadsign?: string | null;
};

export type CommuteRangeResult = {
  minMinutes: number;
  maxMinutes: number;
  typicalMinutes: number;
  sampleCount: number;
};

type NormalizedTrip = {
  tripId: string;
  stopTimes: GtfsStopTimeRecord[];
};

function parseGtfsTimeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
}

function normalizeWindowMinutes(time: string) {
  const parsed = parseGtfsTimeToMinutes(time);
  if (parsed == null) {
    throw new Error(`Invalid window time: ${time}`);
  }
  return parsed;
}

function getStopEventMinutes(stopTime: GtfsStopTimeRecord, mode: "arrival" | "departure") {
  return parseGtfsTimeToMinutes(
    mode === "arrival"
      ? stopTime.arrivalTime ?? stopTime.departureTime
      : stopTime.departureTime ?? stopTime.arrivalTime
  );
}

function normalizeEligibleTrips(params: {
  routes: GtfsRouteRecord[];
  trips: GtfsTripRecord[];
  stopTimes: GtfsStopTimeRecord[];
  activeServiceIds?: Set<string> | null;
}) {
  const routeMap = new Map(params.routes.map((route) => [route.routeId, route]));
  const tripMap = new Map(params.trips.map((trip) => [trip.tripId, trip]));
  const stopTimesByTrip = new Map<string, GtfsStopTimeRecord[]>();

  for (const stopTime of params.stopTimes) {
    const current = stopTimesByTrip.get(stopTime.tripId) ?? [];
    current.push(stopTime);
    stopTimesByTrip.set(stopTime.tripId, current);
  }

  const eligibleTrips: NormalizedTrip[] = [];

  for (const [tripId, tripStopTimes] of stopTimesByTrip.entries()) {
    const trip = tripMap.get(tripId);
    if (params.activeServiceIds && trip?.serviceId && !params.activeServiceIds.has(trip.serviceId)) {
      continue;
    }
    const route = trip?.routeId ? routeMap.get(trip.routeId) : null;
    const policy = classifyCommuteServiceLabel(
      route?.routeShortName,
      route?.routeLongName,
      route?.routeDesc,
      trip?.tripShortName,
      trip?.tripHeadsign,
      ...tripStopTimes.map((stopTime) => stopTime.stopHeadsign)
    );

    if (policy === "deny" || policy === "ambiguous") {
      continue;
    }

    eligibleTrips.push({
      tripId,
      stopTimes: [...tripStopTimes].sort((a, b) => a.stopSequence - b.stopSequence)
    });
  }

  return eligibleTrips;
}

export function calculateGtfsCommuteRange(params: {
  originStopId: string;
  destinationStopId: string;
  routes: GtfsRouteRecord[];
  trips: GtfsTripRecord[];
  stopTimes: GtfsStopTimeRecord[];
  departureWindowStart?: string;
  departureWindowEnd?: string;
  maxTransferWaitMinutes?: number;
  activeServiceIds?: Set<string> | null;
}): CommuteRangeResult | null {
  const departureWindowStart = normalizeWindowMinutes(params.departureWindowStart ?? "07:00");
  const departureWindowEnd = normalizeWindowMinutes(params.departureWindowEnd ?? "09:00");
  const maxTransferWaitMinutes = params.maxTransferWaitMinutes ?? 20;
  const eligibleTrips = normalizeEligibleTrips(params);
  const candidateDurations: number[] = [];

  for (const trip of eligibleTrips) {
    const originIndex = trip.stopTimes.findIndex((stopTime) => stopTime.stopId === params.originStopId);
    if (originIndex < 0) {
      continue;
    }

    const originStop = trip.stopTimes[originIndex];
    const originDeparture = getStopEventMinutes(originStop, "departure");
    if (originDeparture == null || originDeparture < departureWindowStart || originDeparture > departureWindowEnd) {
      continue;
    }

    const directDestinationIndex = trip.stopTimes.findIndex(
      (stopTime, index) => index > originIndex && stopTime.stopId === params.destinationStopId
    );
    if (directDestinationIndex > originIndex) {
      const destinationArrival = getStopEventMinutes(trip.stopTimes[directDestinationIndex], "arrival");
      if (destinationArrival != null) {
        const directDuration = destinationArrival - originDeparture;
        if (directDuration > 0) {
          candidateDurations.push(directDuration);
        }
      }
    }

    for (let transferIndex = originIndex + 1; transferIndex < trip.stopTimes.length; transferIndex += 1) {
      const transferStop = trip.stopTimes[transferIndex];
      const transferArrival = getStopEventMinutes(transferStop, "arrival");
      if (transferArrival == null) {
        continue;
      }

      for (const secondTrip of eligibleTrips) {
        if (secondTrip.tripId === trip.tripId) {
          continue;
        }

        const secondTransferIndex = secondTrip.stopTimes.findIndex((stopTime) => stopTime.stopId === transferStop.stopId);
        if (secondTransferIndex < 0) {
          continue;
        }

        const secondTransferStop = secondTrip.stopTimes[secondTransferIndex];
        const secondDeparture = getStopEventMinutes(secondTransferStop, "departure");
        if (secondDeparture == null || secondDeparture < transferArrival) {
          continue;
        }
        if (secondDeparture - transferArrival > maxTransferWaitMinutes) {
          continue;
        }

        const destinationIndex = secondTrip.stopTimes.findIndex(
          (stopTime, index) => index > secondTransferIndex && stopTime.stopId === params.destinationStopId
        );
        if (destinationIndex <= secondTransferIndex) {
          continue;
        }

        const destinationArrival = getStopEventMinutes(secondTrip.stopTimes[destinationIndex], "arrival");
        if (destinationArrival == null) {
          continue;
        }

        const transferDuration = destinationArrival - originDeparture;
        if (transferDuration > 0) {
          candidateDurations.push(transferDuration);
        }
      }
    }
  }

  if (candidateDurations.length === 0) {
    return null;
  }

  const sortedDurations = candidateDurations.sort((a, b) => a - b);
  const typicalMinutes = sortedDurations[Math.floor(sortedDurations.length / 2)];

  return {
    minMinutes: sortedDurations[0],
    maxMinutes: sortedDurations[sortedDurations.length - 1],
    typicalMinutes,
    sampleCount: sortedDurations.length
  };
}
