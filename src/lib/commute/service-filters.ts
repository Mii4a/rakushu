export const COMMUTE_SERVICE_DENY_LABELS = [
  "新幹線",
  "shinkansen",
  "特急",
  "limited express",
  "ltd. exp.",
  "ltd exp",
  "ライナー",
  "liner"
] as const;

export const COMMUTE_SERVICE_ALLOW_LABELS = [
  "普通",
  "各駅停車",
  "快速",
  "区間快速",
  "急行",
  "準急",
  "通勤快速",
  "通勤急行"
] as const;

export const COMMUTE_SERVICE_AMBIGUOUS_LABELS = [
  "快特",
  "特別快速",
  "新快速",
  "空港快特",
  "通勤特急"
] as const;

export type CommuteServicePolicy = "allow" | "deny" | "ambiguous" | "unknown";

function normalizeServiceLabel(value: string) {
  return value.trim().toLowerCase();
}

function containsAnyLabel(target: string, labels: readonly string[]) {
  return labels.some((label) => target.includes(normalizeServiceLabel(label)));
}

export function classifyCommuteServiceLabel(...rawValues: Array<string | null | undefined>): CommuteServicePolicy {
  const normalizedValues = rawValues
    .filter((value): value is string => typeof value === "string")
    .map(normalizeServiceLabel)
    .filter(Boolean);

  if (normalizedValues.length === 0) {
    return "unknown";
  }

  if (normalizedValues.some((value) => containsAnyLabel(value, COMMUTE_SERVICE_AMBIGUOUS_LABELS))) {
    return "ambiguous";
  }

  if (normalizedValues.some((value) => containsAnyLabel(value, COMMUTE_SERVICE_DENY_LABELS))) {
    return "deny";
  }

  if (normalizedValues.some((value) => containsAnyLabel(value, COMMUTE_SERVICE_ALLOW_LABELS))) {
    return "allow";
  }

  return "unknown";
}
