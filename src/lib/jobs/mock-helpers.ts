import type { ParsedJob } from "@/lib/analysis";
import { buildMissingItemSummary, type MissingItemKey, type MissingItemSummary } from "@/lib/analysis/missing-items";

export const SORT_OPTIONS = {
  created_desc: "更新日が新しい順",
  created_asc: "更新日が古い順",
  company_asc: "会社名A→Z",
  company_desc: "会社名Z→A",
  rank_desc: "マッチ度が高い順",
  holidays_desc: "年間休日が多い順"
} as const;

export type SortKey = keyof typeof SORT_OPTIONS;

export const statusLabel: Record<string, string> = {
  saved: "保存済み",
  applied: "応募済み",
  screening: "面接中",
  interview: "面接中",
  offer: "内定",
  rejected: "見送り"
};

export const statusBadgeClassName: Record<string, string> = {
  saved: "bg-[#eef6ff] text-[#2f7df6]",
  applied: "bg-[#edf9ef] text-[#26a54e]",
  screening: "bg-[#fff6df] text-[#f29f05]",
  interview: "bg-[#f4edff] text-[#8a5cf6]",
  offer: "bg-[#ecf8e8] text-[#1c9b3a]",
  rejected: "bg-slate-100 text-slate-500"
};

const totalRankScoreMap: Record<string, number> = {
  S: 92,
  A: 82,
  B: 74,
  C: 61,
  D: 48,
  E: 34
};

const rankOrderScore: Record<string, number> = {
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1
};

export function toSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function coerceDate(value: Date | number | string | null | undefined) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date | number | string | null | undefined) {
  const normalized = coerceDate(date);
  if (!normalized) return "未設定";
  const year = normalized.getUTCFullYear();
  const month = String(normalized.getUTCMonth() + 1).padStart(2, "0");
  const day = String(normalized.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export function formatDateInputValue(value: Date | number | string | null | undefined): string {
  const normalized = coerceDate(value);
  if (!normalized) return "";
  const year = normalized.getUTCFullYear();
  const month = String(normalized.getUTCMonth() + 1).padStart(2, "0");
  const day = String(normalized.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMetricValue(value: string | number | null | undefined, suffix = "") {
  if (value == null || value === "") return "－";
  return `${value}${suffix}`;
}

export function getDisplayRank(rank: string | null | undefined) {
  return rank && rank !== "UNKNOWN" ? rank : "－";
}

export function getRankCardClassName(rank: string | null | undefined) {
  if (rank === "S" || rank === "A") return "from-[#edf9e8] to-[#f9fff6] text-[#2ba33d]";
  if (rank === "B") return "from-[#edf4ff] to-[#fbfdff] text-[#2f7df6]";
  if (rank === "C") return "from-[#fff6e6] to-[#fffdf8] text-[#f29f05]";
  if (rank === "D" || rank === "E") return "from-[#fff2ea] to-[#fffaf7] text-[#f07a23]";
  return "from-slate-100 to-slate-50 text-slate-500";
}

export function getMatchScoreFromRank(rank: string | null | undefined) {
  return totalRankScoreMap[rank ?? ""] ?? 68;
}

export function getScoreFromRank(rank: string | null | undefined) {
  return rankOrderScore[rank ?? ""] ?? 0;
}

export function hasMissingItem(summary: MissingItemSummary, key: MissingItemKey) {
  return summary.missingInRawText.includes(key);
}

export function hasAmbiguousItem(summary: MissingItemSummary, key: MissingItemKey) {
  return summary.ambiguousButVisible.includes(key);
}

export function getMissingAwareText(summary: MissingItemSummary, key: MissingItemKey, fallback = "不明") {
  if (hasMissingItem(summary, key)) return "本文未記載";
  if (hasAmbiguousItem(summary, key)) return "要確認";
  return fallback;
}

export function buildAnalysisNotes(parsed: ParsedJob | null, warnings: string[], missingSummary?: MissingItemSummary) {
  if (!parsed) {
    return ["まだ解析結果がありません。必要になったタイミングで再解析できます。"];
  }

  const summary = missingSummary ?? buildMissingItemSummary(parsed, null);

  const notes = [
    parsed.annualHolidays.value != null
      ? `年間休日は ${parsed.annualHolidays.value} 日です。`
      : hasMissingItem(summary, "annualHolidays")
        ? "年間休日の記載が本文に見当たりませんでした。"
        : "年間休日は要確認です。",
    parsed.holidayType.value
      ? `休日制度は「${parsed.holidayType.value}」です。`
      : hasMissingItem(summary, "holidayType")
        ? "休日制度の明記が本文に見当たりませんでした。"
        : "休日制度は要確認です。",
    parsed.bonusCount?.status === "none"
      ? "賞与制度は見当たりませんでした。"
      : parsed.bonusCount?.value != null
        ? `賞与制度は年 ${parsed.bonusCount.value} 回${parsed.bonusPerformanceLinked?.status === "found" ? "で、業績により変動します。" : "です。"}`
        : hasMissingItem(summary, "bonusCount")
          ? "賞与制度の回数は本文に見当たりませんでした。"
          : "賞与制度の回数は要確認です。",
    parsed.retirementAllowance?.status === "found"
      ? "退職金制度の記載があります。"
      : parsed.retirementAllowance?.status === "none"
        ? "退職金制度は見当たりませんでした。"
        : hasMissingItem(summary, "retirementAllowance")
          ? "退職金制度の明記が本文に見当たりませんでした。"
          : "退職金制度は要確認です。",
    parsed.fixedOvertimeHours.status === "none"
      ? "固定残業制度は見当たりませんでした。"
      : parsed.fixedOvertimeHours.value != null
        ? `固定残業は ${parsed.fixedOvertimeHours.value} 時間です。`
        : hasMissingItem(summary, "fixedOvertimeHours")
          ? "固定残業時間の明記が本文に見当たりませんでした。"
          : "固定残業時間は要確認です。",
    parsed.benefits.value && parsed.benefits.value.length > 0
      ? `福利厚生は ${parsed.benefits.value.length} 項目見つかっています。`
      : hasMissingItem(summary, "benefits")
        ? "福利厚生の記載が本文ではかなり少なめです。"
        : "福利厚生は少なめ、または読み取りが難しい状態です。"
  ];

  if (warnings.length > 0) {
    notes.push(`注意点は ${warnings.length} 件あります。先に気になるポイントを見返すと判断しやすいです。`);
  }

  if (summary.thinInput) {
    notes.push("この求人は採点に必要な情報が不足しているため、未記載項目は最低点候補として扱います。");
  }

  return notes;
}

export function buildRankReasonLabel(summary: MissingItemSummary, warnings: string[]) {
  if (summary.missingInRawText.length > 0) {
    return "低評価の主因: 本文未記載項目が多い";
  }
  if (warnings.length >= 3) {
    return "低評価の主因: 気になる表現が多い";
  }
  return "低評価の主因: 条件が弱い";
}

export function buildSelectedHref(params: URLSearchParams, selectedId: string) {
  const next = new URLSearchParams(params);
  next.set("selected", selectedId);
  return `/jobs?${next.toString()}`;
}

export function getCompareBars(job: {
  latest?: {
    salaryRank?: string | null;
    holidayRank?: string | null;
    benefitRank?: string | null;
    totalRank?: string | null;
  } | null;
  parsed?: ParsedJob | null;
  commuteMinutes?: number | null;
  commuteMinutesTypical?: number | null;
  warnings?: string[];
}) {
  const commute = job.commuteMinutesTypical ?? job.commuteMinutes ?? null;
  const overtime = job.parsed?.fixedOvertimeHours.value ?? null;
  const holidayScore = getMatchScoreFromRank(job.latest?.holidayRank ?? null);
  const salaryScore = getMatchScoreFromRank(job.latest?.salaryRank ?? null);
  const benefitsScore = getMatchScoreFromRank(job.latest?.benefitRank ?? null);
  const locationScore = commute == null ? 78 : commute <= 30 ? 90 : commute <= 45 ? 84 : commute <= 60 ? 76 : 64;
  const overtimeScore = overtime == null ? 70 : overtime <= 10 ? 92 : overtime <= 20 ? 82 : overtime <= 30 ? 70 : 55;
  const growthScore = Math.max(58, getMatchScoreFromRank(job.latest?.totalRank ?? null) - 4);
  const comfortScore = Math.round((holidayScore + benefitsScore + overtimeScore) / 3);
  return [
    { label: "年収・給与", score: salaryScore, tone: salaryScore >= 80 ? "green" : salaryScore >= 70 ? "yellow" : "orange" },
    { label: "勤務地", score: locationScore, tone: locationScore >= 80 ? "green" : locationScore >= 70 ? "yellow" : "orange" },
    { label: "休日・休暇", score: holidayScore, tone: holidayScore >= 80 ? "green" : holidayScore >= 70 ? "yellow" : "orange" },
    { label: "残業時間", score: overtimeScore, tone: overtimeScore >= 80 ? "green" : overtimeScore >= 70 ? "yellow" : "orange" },
    { label: "福利厚生", score: benefitsScore, tone: benefitsScore >= 80 ? "green" : benefitsScore >= 70 ? "yellow" : "orange" },
    { label: "成長環境", score: growthScore, tone: growthScore >= 80 ? "green" : growthScore >= 70 ? "yellow" : "orange" },
    { label: "働きやすさ", score: comfortScore, tone: comfortScore >= 80 ? "green" : comfortScore >= 70 ? "yellow" : "orange" }
  ] as const;
}
