import type { ParsedJob } from "@/lib/analysis";
import { buildMissingItemSummary, type MissingItemSummary } from "@/lib/analysis/missing-items";

type CheckTone = "good" | "neutral" | "caution" | "concern";

type Item = {
  label: string;
  value: string;
  tone: CheckTone;
};

const toneStyles: Record<CheckTone, string> = {
  good: "border-rakumo-mint/60 bg-[#F2FFFB] text-rakumo-ink",
  neutral: "border-rakumo-border bg-white text-rakumo-ink",
  caution: "border-rakumo-warning/80 bg-[#FFF8D9] text-rakumo-ink",
  concern: "border-rakumo-peach/90 bg-[#FFF3EA] text-rakumo-ink"
};

function hasMissing(summary: MissingItemSummary, key: string) {
  return summary.missingInRawText.includes(key as never);
}

function hasAmbiguous(summary: MissingItemSummary, key: string) {
  return summary.ambiguousButVisible.includes(key as never);
}

export function getChecklistItems(parsed: ParsedJob | null, missingSummary?: MissingItemSummary | null): Item[] {
  if (!parsed) {
    return [
      { label: "求人情報", value: "まだランク付け前", tone: "neutral" },
      { label: "確認メモ", value: "本文を入れると判断材料が出ます", tone: "neutral" }
    ];
  }

  const benefitsCount = parsed.benefits.value?.length ?? 0;
  const warnings = parsed.warnings.value ?? [];
  const summary = missingSummary ?? buildMissingItemSummary(parsed, null);

  return [
    {
      label: "残業時間の明記",
      value:
        parsed.fixedOvertimeHours.status === "none"
          ? "固定残業なし"
          : parsed.fixedOvertimeHours.value != null
            ? `${parsed.fixedOvertimeHours.value}時間`
            : hasMissing(summary, "fixedOvertimeHours")
              ? "本文未記載"
              : "要確認",
      tone:
        parsed.fixedOvertimeHours.value == null && parsed.fixedOvertimeHours.status !== "none"
          ? hasMissing(summary, "fixedOvertimeHours")
            ? "concern"
            : "caution"
          : "good"
    },
    {
      label: "年間休日",
      value:
        parsed.annualHolidays.value != null
          ? `${parsed.annualHolidays.value}日`
          : hasMissing(summary, "annualHolidays")
            ? "本文未記載"
            : hasAmbiguous(summary, "annualHolidays")
              ? "要確認"
              : "不明",
      tone:
        parsed.annualHolidays.value != null && parsed.annualHolidays.value >= 120
          ? "good"
          : parsed.annualHolidays.value == null
            ? hasMissing(summary, "annualHolidays")
              ? "concern"
              : "neutral"
            : "caution"
    },
    {
      label: "休日制度",
      value:
        parsed.holidayType.value
          ? parsed.holidayType.value
          : hasMissing(summary, "holidayType")
            ? "本文未記載"
            : hasAmbiguous(summary, "holidayType")
              ? "要確認"
              : "不明",
      tone:
        parsed.holidayType.value === "完全週休2日制"
          ? "good"
          : parsed.holidayType.value === "週休2日制"
            ? "neutral"
            : hasMissing(summary, "holidayType")
              ? "concern"
              : "caution"
    },
    {
      label: "賞与制度",
      value:
        parsed.bonusCount?.status === "none"
          ? "なし"
          : parsed.bonusCount?.value != null
            ? `年${parsed.bonusCount.value}回${parsed.bonusPerformanceLinked?.status === "found" ? "（業績連動）" : ""}`
            : hasMissing(summary, "bonusCount")
              ? "本文未記載"
              : hasAmbiguous(summary, "bonusCount")
                ? "要確認"
                : "不明",
      tone:
        parsed.bonusCount?.value != null && parsed.bonusCount.value >= 2 && parsed.bonusPerformanceLinked?.status !== "found"
          ? "good"
          : parsed.bonusCount?.status === "none"
            ? "caution"
            : hasMissing(summary, "bonusCount")
              ? "concern"
              : "neutral"
    },
    {
      label: "退職金制度",
      value:
        parsed.retirementAllowance?.status === "found"
          ? "あり"
          : parsed.retirementAllowance?.status === "none"
            ? "なし"
            : hasMissing(summary, "retirementAllowance")
              ? "本文未記載"
              : hasAmbiguous(summary, "retirementAllowance")
                ? "要確認"
                : "不明",
      tone:
        parsed.retirementAllowance?.status === "found"
          ? "good"
          : parsed.retirementAllowance?.status === "none"
            ? "caution"
            : hasMissing(summary, "retirementAllowance")
              ? "concern"
              : "neutral"
    },
    {
      label: "福利厚生",
      value:
        benefitsCount > 0
          ? `${benefitsCount}項目`
          : hasMissing(summary, "benefits")
            ? "本文の情報が少ない"
            : hasAmbiguous(summary, "benefits")
              ? "要確認"
              : "不明",
      tone:
        benefitsCount >= 4
          ? "good"
          : benefitsCount >= 1
            ? "neutral"
            : hasMissing(summary, "benefits")
              ? "caution"
              : "caution"
    },
    {
      label: "雇用形態",
      value:
        parsed.employmentType.value
          ? parsed.employmentType.value
          : hasMissing(summary, "employmentType")
            ? "本文未記載"
            : hasAmbiguous(summary, "employmentType")
              ? "要確認"
              : "不明",
      tone:
        parsed.employmentType.value
          ? "neutral"
          : hasMissing(summary, "employmentType")
            ? "concern"
            : "caution"
    },
    {
      label: "気になる表現",
      value: warnings.length > 0 ? `${warnings.length}件` : "少なめ",
      tone: warnings.length >= 3 ? "concern" : warnings.length >= 1 ? "caution" : "good"
    }
  ];
}

type Props = {
  parsed: ParsedJob | null;
  missingSummary?: MissingItemSummary | null;
  className?: string;
};

export function JobCheckList({ parsed, missingSummary, className }: Props) {
  const items = getChecklistItems(parsed, missingSummary);

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      {items.map((item) => (
        <div key={item.label} className={`rounded-2xl border px-4 py-3 ${toneStyles[item.tone]}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-sm font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
