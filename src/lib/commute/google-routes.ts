import { serverEnv } from "@/lib/env/server";

function parseDurationMinutes(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = duration.match(/^(\d+)s$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds)) return null;
  return Math.max(1, Math.round(seconds / 60));
}

function getDefaultDepartureTime(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

export async function estimateTransitCommuteMinutes(params: {
  originAddress: string;
  destinationAddress: string;
}): Promise<number> {
  if (!serverEnv.GOOGLE_MAPS_SERVER_API_KEY) {
    throw new Error("GOOGLE_MAPS_SERVER_API_KEY が未設定です。");
  }

  const response = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": serverEnv.GOOGLE_MAPS_SERVER_API_KEY,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition"
    },
    body: JSON.stringify({
      origins: [
        {
          waypoint: {
            address: params.originAddress
          }
        }
      ],
      destinations: [
        {
          waypoint: {
            address: params.destinationAddress
          }
        }
      ],
      travelMode: "TRANSIT",
      departureTime: getDefaultDepartureTime(),
      languageCode: "ja",
      regionCode: "JP",
      units: "METRIC"
    }),
    cache: "no-store"
  });

  const data = (await response.json().catch(() => [])) as Array<{
    duration?: string;
    condition?: string;
    error?: {
      message?: string;
    };
  }>;

  if (!response.ok) {
    throw new Error(data[0]?.error?.message ?? "Routes API の呼び出しに失敗しました。");
  }

  const result = data[0];
  const minutes = parseDurationMinutes(result?.duration);
  if (minutes == null) {
    if (result?.condition === "ROUTE_NOT_FOUND") {
      throw new Error("Google Maps Routes API で公共交通機関の経路が見つかりませんでした。最寄り駅を見直してください。");
    }

    throw new Error("通勤時間を取得できませんでした。");
  }

  return minutes;
}
