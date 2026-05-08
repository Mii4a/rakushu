import type { ParsedJob } from "@/lib/analysis";
import { getRakumoJobComment } from "@/lib/rakumo/comments";
import { RakumoCommentCard } from "@/components/rakumo/RakumoCommentCard";

type Props = {
  rank: string | null | undefined;
  parsed: ParsedJob | null;
  companyName: string;
  title: string;
  className?: string;
  showComment?: boolean;
  compact?: boolean;
};

function formatEmploymentType(value: string | null | undefined) {
  return value ?? "不明";
}

export function JobRankCard({ rank, parsed, companyName, title, className, showComment = true, compact = false }: Props) {
  const comment = getRakumoJobComment({ rank, parsed });
  const displayRank = rank && rank !== "UNKNOWN" ? rank : "保留";
  const annualHolidays = parsed?.annualHolidays.value != null ? `${parsed.annualHolidays.value}日` : "不明";
  const fixedOvertime =
    parsed?.fixedOvertimeHours.status === "none"
      ? "なし"
      : parsed?.fixedOvertimeHours.value != null
        ? `${parsed.fixedOvertimeHours.value}時間`
        : "不明";
  const benefitsCount = parsed?.benefits.value?.length ?? 0;
  const metricGridClassName = compact ? "mt-5 grid gap-3 sm:grid-cols-2" : "mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="rounded-3xl border border-rakumo-border bg-white p-5 shadow-[0_14px_32px_-24px_rgba(45,58,74,0.22)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-rakumo-ink">{companyName}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{title}</p>
          </div>
          <div className="rounded-2xl bg-rakumo-sand px-4 py-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">総合ランク</p>
            <p className="mt-2 text-2xl font-bold text-rakumo-ink">{displayRank}</p>
          </div>
        </div>

        <div className={metricGridClassName}>
          <div className="rounded-2xl bg-rakumo-cream px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">年収</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">{parsed?.salaryText.value ?? "不明"}</p>
          </div>
          <div className="rounded-2xl bg-rakumo-cream px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">残業</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">{fixedOvertime}</p>
          </div>
          <div className="rounded-2xl bg-rakumo-cream px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">勤務地</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">求人票を確認</p>
          </div>
          <div className="rounded-2xl bg-rakumo-cream px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">雇用形態</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">{formatEmploymentType(parsed?.employmentType.value)}</p>
          </div>
          <div className="rounded-2xl bg-rakumo-cream px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">福利厚生</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">{benefitsCount > 0 ? `${benefitsCount}項目` : "不明"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-rakumo-border bg-rakumo-sand/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">年間休日</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">{annualHolidays}</p>
          </div>
          <div className="rounded-2xl border border-rakumo-border bg-rakumo-sand/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">休日制度</p>
            <p className="mt-2 text-sm font-medium leading-6 text-rakumo-ink">{parsed?.holidayType.value ?? "不明"}</p>
          </div>
        </div>
      </div>

      {showComment ? <RakumoCommentCard tone={comment.tone} text={comment.text} /> : null}
    </div>
  );
}
