export function normalizeStationName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/駅$/u, "")
    .toLowerCase();
}
