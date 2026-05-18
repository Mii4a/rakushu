export type CommuteDataKind = "manual" | "gtfs_range" | "estimated_range" | "unsupported";

export type CommuteRangeLike = {
  commuteMinutes?: number | null;
  commuteMinutesMin?: number | null;
  commuteMinutesMax?: number | null;
  commuteMinutesTypical?: number | null;
  commuteDataKind?: string | null;
};

export function buildManualCommuteFields(commuteMinutes: number | null) {
  if (commuteMinutes == null) {
    return {
      commuteMinutes: null,
      commuteMinutesMin: null,
      commuteMinutesMax: null,
      commuteMinutesTypical: null,
      commuteDataKind: null
    };
  }

  return {
    commuteMinutes,
    commuteMinutesMin: commuteMinutes,
    commuteMinutesMax: commuteMinutes,
    commuteMinutesTypical: commuteMinutes,
    commuteDataKind: "manual" satisfies CommuteDataKind
  };
}

export function getPrimaryCommuteMinutes(value: CommuteRangeLike) {
  return value.commuteMinutesTypical ?? value.commuteMinutes ?? null;
}

export function formatCommuteRange(value: CommuteRangeLike) {
  const min = value.commuteMinutesMin;
  const max = value.commuteMinutesMax;
  const typical = value.commuteMinutesTypical ?? value.commuteMinutes;

  if (min != null && max != null) {
    if (min === max) {
      return `${min}分`;
    }
    return `約${min}-${max}分`;
  }

  if (typical != null) {
    return `${typical}分`;
  }

  return "－";
}

export function formatCommuteRangeDetail(value: CommuteRangeLike) {
  const min = value.commuteMinutesMin;
  const max = value.commuteMinutesMax;
  const typical = value.commuteMinutesTypical ?? value.commuteMinutes;

  if (min != null && max != null && typical != null && (min !== max || typical !== min)) {
    return `参考 ${min}-${max}分 / 代表 ${typical}分`;
  }

  if (min != null && max != null) {
    return min === max ? `${min}分` : `参考 ${min}-${max}分`;
  }

  if (typical != null) {
    return `${typical}分`;
  }

  return "未設定";
}

export function getCommuteTone(value: CommuteRangeLike) {
  const primary = getPrimaryCommuteMinutes(value);
  if (primary == null) return "neutral" as const;
  if (primary <= 45) return "good" as const;
  if (primary >= 75) return "warn" as const;
  return "neutral" as const;
}

export function getCommuteDataKindLabel(kind: string | null | undefined) {
  switch (kind) {
    case "gtfs_range":
      return "実データ";
    case "estimated_range":
      return "推定";
    case "manual":
      return "手入力";
    case "unsupported":
      return "未対応";
    default:
      return null;
  }
}

export function getCommuteDataKindTone(kind: string | null | undefined) {
  switch (kind) {
    case "gtfs_range":
      return "bg-[#eefbea] text-[#2a9442]";
    case "estimated_range":
      return "bg-[#edf4ff] text-[#2d5f93]";
    case "manual":
      return "bg-[#f5f0ff] text-[#7050c8]";
    case "unsupported":
      return "bg-[#fff1e3] text-[#c7771f]";
    default:
      return "bg-slate-100 text-slate-500";
  }
}
