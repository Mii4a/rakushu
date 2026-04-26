import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil, ScanSearch, Trash2 } from "lucide-react";

import { RerunAnalysisButton } from "@/components/rerun-analysis-button";
import { SelectionProgressForm } from "@/components/selection-progress-form";
import type { ParsedJob } from "@/lib/analysis";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

const evidenceLabels: Record<string, string> = {
  companyName: "会社名",
  title: "職種",
  employmentType: "雇用形態",
  salaryText: "給与テキスト",
  baseSalaryMin: "基本給最小",
  baseSalaryMax: "基本給最大",
  fixedOvertimeHours: "固定残業時間",
  fixedOvertimePay: "固定残業代",
  annualHolidays: "年間休日",
  holidayType: "休日制度",
  housingAllowance: "住宅手当",
  companyHousing: "社宅",
  benefits: "福利厚生",
  warnings: "警告"
};

const statusLabel: Record<string, string> = {
  saved: "検討中",
  applied: "応募済み",
  screening: "書類選考中",
  interview: "面接中",
  offer: "内定",
  rejected: "見送り"
};

function formatYen(value: number) {
  return `￥${value.toLocaleString("ja-JP")}`;
}

function formatHours(value: number) {
  const hours = Math.trunc(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatDays(value: number) {
  return `${value}日`;
}

function toDateInputValue(value: Date | null): string {
  if (!value) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderBadge(label: string, value: string | number | null | undefined, detail?: string) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 font-medium text-slate-950">{value ?? "不明"}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p> : null}
    </div>
  );
}

function formatExtractedValue(value: string | number | boolean | string[] | null | undefined) {
  if (value == null) return "不明";
  if (Array.isArray(value)) return value.length > 0 ? value.join(" / ") : "なし";
  if (typeof value === "boolean") return value ? "あり" : "なし";
  return String(value);
}

function formatBadgeValue(label: string, value: string | number | null | undefined) {
  if (value == null) return "不明";
  if (typeof value === "number") {
    if (label === "固定残業時間") return formatHours(value);
    if (label === "年間休日") return formatDays(value);
    if (label === "基本給最小" || label === "基本給最大" || label === "固定残業代") return formatYen(value);
  }
  return value;
}

function renderRankWithValue(label: string, rank: string | null | undefined, extracted: string) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className="rounded-full bg-rakushu-50 px-2.5 py-1 text-xs font-semibold text-rakushu-700">{rank ?? "UNKNOWN"}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{extracted}</p>
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [{ deleteJobAction }, { requireUser }, { db }, { jobAnalyses, jobs }] = await Promise.all([
    import("@/actions/job-actions"),
    import("@/lib/auth/require-user"),
    import("@/lib/db/client"),
    import("@/lib/db/schema")
  ]);
  const user = await requireUser();
  const { id } = (await params) ?? {};

  if (!id) {
    notFound();
  }

  const job = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, id), eq(jobs.userId, user.id)),
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  if (!job) {
    notFound();
  }

  const latest = job.analyses[0];
  const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
  const evidence = (parsed ?? {}) as Record<string, { evidence?: string | null }>;
  const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
  const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";
  const nextActionDate = toDateInputValue(job.nextActionAt);
  const fixedOvertimeHoursDisplay =
    parsed?.fixedOvertimeHours.status === "none"
      ? "固定残業制なし"
      : parsed?.fixedOvertimeHours.value != null
        ? formatHours(parsed.fixedOvertimeHours.value)
        : "不明";
  const fixedOvertimePayDisplay =
    parsed?.fixedOvertimePay.status === "none"
      ? "固定残業制なし"
      : parsed?.fixedOvertimePay.value != null
        ? formatYen(parsed.fixedOvertimePay.value)
        : "不明";
  const fixedOvertimeDetail =
    parsed?.fixedOvertimeHours.status === "none"
      ? "固定残業なし"
      : `固定残業時間: ${parsed?.fixedOvertimeHours.value != null ? formatHours(parsed.fixedOvertimeHours.value) : "不明"} / 固定残業代: ${parsed?.fixedOvertimePay.value != null ? formatYen(parsed.fixedOvertimePay.value) : "不明"}`;
  const holidayDetail = `年間休日: ${parsed?.annualHolidays.value != null ? formatDays(parsed.annualHolidays.value) : "不明"}`;
  const holidayTypeDetail = `休日制度: ${formatExtractedValue(parsed?.holidayType.value)}`;
  const benefitDetail = `福利厚生: ${formatExtractedValue(parsed?.benefits.value)}`;
  const totalDetail = `警告: ${formatExtractedValue(parsed?.warnings.value)}`;
  const baseSalaryMinDetail =
    parsed?.baseSalaryMin.evidence?.includes("基本給記載なし")
      ? "基本給記載なしのため月給の最小値から固定残業代を差し引いて算出"
      : undefined;

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Job detail</p>
            <h1 className="page-title">{displayCompanyName}</h1>
            <p className="page-copy mt-3">{displayTitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/jobs" className="button-secondary">
              <ArrowLeft className="size-4" />
              一覧へ
            </Link>
            <Link href={`/jobs/${job.id}/edit`} className="button-secondary">
              <Pencil className="size-4" />
              編集
            </Link>
            <form action={deleteJobAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <button type="submit" className="button-secondary text-rose-700 hover:text-rose-800">
                <Trash2 className="size-4" />
                削除
              </button>
            </form>
            <RerunAnalysisButton jobId={job.id} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">選考進捗</h2>
            <p className="section-copy">現在ステータス: {statusLabel[job.selectionStatus] ?? "未設定"}</p>
          </div>
        </div>
        <SelectionProgressForm jobId={job.id} selectionStatus={job.selectionStatus} nextActionDate={nextActionDate} selectionMemo={job.selectionMemo ?? ""} />
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">ランク</h2>
            <p className="section-copy">休日制度と福利厚生は別軸として並べ、総合ランクに対する内訳を追いやすくしています。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {renderRankWithValue("固定残業ランク", latest?.salaryRank, fixedOvertimeDetail)}
          {renderRankWithValue("年間休日ランク", latest?.holidayRank, holidayDetail)}
          {renderRankWithValue("休日制度ランク", latest?.holidayTypeRank, holidayTypeDetail)}
          {renderRankWithValue("福利厚生ランク", latest?.benefitRank, benefitDetail)}
          {renderRankWithValue("総合ランク", latest?.totalRank, totalDetail)}
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">抽出値</h2>
            <p className="section-copy">解析に使った構造化データをそのまま確認できます。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {renderBadge("雇用形態", formatBadgeValue("雇用形態", latest?.employmentType))}
          {renderBadge("基本給最小", formatBadgeValue("基本給最小", latest?.baseSalaryMin), baseSalaryMinDetail)}
          {renderBadge("基本給最大", formatBadgeValue("基本給最大", latest?.baseSalaryMax))}
          {renderBadge("固定残業時間", fixedOvertimeHoursDisplay)}
          {renderBadge("固定残業代", fixedOvertimePayDisplay)}
          {renderBadge("年間休日", formatBadgeValue("年間休日", latest?.annualHolidays))}
          {renderBadge("休日制度", formatBadgeValue("休日制度", latest?.holidayType))}
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">根拠文</h2>
            <p className="section-copy">各フィールドの抽出に使った文脈です。元文との対応を追えます。</p>
          </div>
          <ScanSearch className="size-5 text-rakushu-600" />
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {Object.entries(evidence)
            .filter(([key]) => key !== "parserVersion")
            .map(([key, value]) => (
              <li key={key} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <span className="font-medium text-slate-800">{evidenceLabels[key] ?? key}: </span>
                <span className="text-slate-600">{value?.evidence ?? "根拠なし"}</span>
              </li>
            ))}
        </ul>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">求人本文</h2>
            <p className="section-copy">保存時点の原文です。解析の再実行時もこの本文を基にします。</p>
          </div>
          <FileText className="size-5 text-slate-500" />
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 text-sm leading-7 text-slate-700">{job.rawText}</pre>
      </div>
    </section>
  );
}
