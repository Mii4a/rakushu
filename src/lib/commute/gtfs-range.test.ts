import { describe, expect, it } from "vitest";

import { calculateGtfsCommuteRange } from "./gtfs-range";

describe("calculateGtfsCommuteRange", () => {
  it("returns min max and typical minutes from direct commuter trips", () => {
    const result = calculateGtfsCommuteRange({
      originStopId: "ogikubo",
      destinationStopId: "shibuya",
      routes: [
        { routeId: "route-local", routeShortName: "各駅停車" },
        { routeId: "route-rapid", routeShortName: "快速" }
      ],
      trips: [
        { tripId: "trip-1", routeId: "route-local", tripHeadsign: "渋谷" },
        { tripId: "trip-2", routeId: "route-rapid", tripHeadsign: "渋谷" }
      ],
      stopTimes: [
        { tripId: "trip-1", stopId: "ogikubo", departureTime: "07:10:00", stopSequence: 1 },
        { tripId: "trip-1", stopId: "shibuya", arrivalTime: "07:55:00", stopSequence: 2 },
        { tripId: "trip-2", stopId: "ogikubo", departureTime: "08:00:00", stopSequence: 1 },
        { tripId: "trip-2", stopId: "shibuya", arrivalTime: "08:32:00", stopSequence: 2 }
      ]
    });

    expect(result).toEqual({
      minMinutes: 32,
      maxMinutes: 45,
      typicalMinutes: 45,
      sampleCount: 2
    });
  });

  it("excludes denied and ambiguous services", () => {
    const result = calculateGtfsCommuteRange({
      originStopId: "a",
      destinationStopId: "b",
      routes: [
        { routeId: "route-exp", routeShortName: "特急" },
        { routeId: "route-amb", routeShortName: "通勤特急" }
      ],
      trips: [
        { tripId: "trip-exp", routeId: "route-exp" },
        { tripId: "trip-amb", routeId: "route-amb" }
      ],
      stopTimes: [
        { tripId: "trip-exp", stopId: "a", departureTime: "07:00:00", stopSequence: 1 },
        { tripId: "trip-exp", stopId: "b", arrivalTime: "07:20:00", stopSequence: 2 },
        { tripId: "trip-amb", stopId: "a", departureTime: "08:00:00", stopSequence: 1 },
        { tripId: "trip-amb", stopId: "b", arrivalTime: "08:18:00", stopSequence: 2 }
      ]
    });

    expect(result).toBeNull();
  });

  it("returns null when no trip falls in the departure window", () => {
    const result = calculateGtfsCommuteRange({
      originStopId: "a",
      destinationStopId: "b",
      routes: [{ routeId: "route-local", routeShortName: "普通" }],
      trips: [{ tripId: "trip-1", routeId: "route-local" }],
      stopTimes: [
        { tripId: "trip-1", stopId: "a", departureTime: "10:30:00", stopSequence: 1 },
        { tripId: "trip-1", stopId: "b", arrivalTime: "11:10:00", stopSequence: 2 }
      ],
      departureWindowStart: "07:00",
      departureWindowEnd: "09:00"
    });

    expect(result).toBeNull();
  });

  it("filters out trips whose service is not active on weekdays", () => {
    const result = calculateGtfsCommuteRange({
      originStopId: "a",
      destinationStopId: "b",
      routes: [{ routeId: "route-local", routeShortName: "普通" }],
      trips: [
        { tripId: "trip-weekday", routeId: "route-local", serviceId: "weekday" },
        { tripId: "trip-weekend", routeId: "route-local", serviceId: "weekend" }
      ],
      stopTimes: [
        { tripId: "trip-weekday", stopId: "a", departureTime: "07:30:00", stopSequence: 1 },
        { tripId: "trip-weekday", stopId: "b", arrivalTime: "08:00:00", stopSequence: 2 },
        { tripId: "trip-weekend", stopId: "a", departureTime: "07:10:00", stopSequence: 1 },
        { tripId: "trip-weekend", stopId: "b", arrivalTime: "07:20:00", stopSequence: 2 }
      ],
      activeServiceIds: new Set(["weekday"])
    });

    expect(result).toEqual({
      minMinutes: 30,
      maxMinutes: 30,
      typicalMinutes: 30,
      sampleCount: 1
    });
  });

  it("supports routes with one transfer inside the morning commute window", () => {
    const result = calculateGtfsCommuteRange({
      originStopId: "kichijoji",
      destinationStopId: "shibuya",
      routes: [
        { routeId: "route-local", routeShortName: "各駅停車" },
        { routeId: "route-rapid", routeShortName: "快速" }
      ],
      trips: [
        { tripId: "trip-leg-1", routeId: "route-local", tripHeadsign: "荻窪" },
        { tripId: "trip-leg-2", routeId: "route-local", tripHeadsign: "荻窪" },
        { tripId: "trip-leg-3", routeId: "route-rapid", tripHeadsign: "渋谷" },
        { tripId: "trip-leg-4", routeId: "route-rapid", tripHeadsign: "渋谷" },
        { tripId: "trip-too-early", routeId: "route-rapid", tripHeadsign: "渋谷" }
      ],
      stopTimes: [
        { tripId: "trip-leg-1", stopId: "kichijoji", departureTime: "07:05:00", stopSequence: 1 },
        { tripId: "trip-leg-1", stopId: "ogikubo", arrivalTime: "07:14:00", departureTime: "07:15:00", stopSequence: 2 },
        { tripId: "trip-leg-2", stopId: "kichijoji", departureTime: "08:01:00", stopSequence: 1 },
        { tripId: "trip-leg-2", stopId: "ogikubo", arrivalTime: "08:12:00", departureTime: "08:13:00", stopSequence: 2 },
        { tripId: "trip-leg-3", stopId: "ogikubo", departureTime: "07:18:00", stopSequence: 1 },
        { tripId: "trip-leg-3", stopId: "shibuya", arrivalTime: "07:50:00", stopSequence: 2 },
        { tripId: "trip-leg-4", stopId: "ogikubo", departureTime: "08:14:00", stopSequence: 1 },
        { tripId: "trip-leg-4", stopId: "shibuya", arrivalTime: "08:47:00", stopSequence: 2 },
        { tripId: "trip-too-early", stopId: "ogikubo", departureTime: "08:10:00", stopSequence: 1 },
        { tripId: "trip-too-early", stopId: "shibuya", arrivalTime: "08:42:00", stopSequence: 2 }
      ]
    });

    expect(result).toEqual({
      minMinutes: 45,
      maxMinutes: 46,
      typicalMinutes: 46,
      sampleCount: 2
    });
  });
});
