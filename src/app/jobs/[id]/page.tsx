import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { RerunAnalysisButton } from "@/components/rerun-analysis-button";
import type { ParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";

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

function renderBadge(label: string, value: string | number | null | undefined, detail?: string) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value ?? "不明"}</p>
      {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{rank ?? "UNKNOWN"}</p>
      <p className="mt-1 text-xs text-slate-600">{extracted}</p>
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

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
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{displayCompanyName}</h1>
          <p className="text-slate-600">{displayTitle}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs" className="text-sm text-rakushu-700 underline">
            一覧へ
          </Link>
          <RerunAnalysisButton jobId={job.id} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">ランク</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {renderRankWithValue("固定残業ランク", latest?.salaryRank, fixedOvertimeDetail)}
          {renderRankWithValue("年間休日ランク", latest?.holidayRank, holidayDetail)}
          {renderRankWithValue("休日制度ランク", latest?.holidayTypeRank, holidayTypeDetail)}
          {renderRankWithValue("福利厚生ランク", latest?.benefitRank, benefitDetail)}
          {renderRankWithValue("総合ランク", latest?.totalRank, totalDetail)}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">抽出値</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renderBadge("雇用形態", formatBadgeValue("雇用形態", latest?.employmentType))}
          {renderBadge("基本給最小", formatBadgeValue("基本給最小", latest?.baseSalaryMin), baseSalaryMinDetail)}
          {renderBadge("基本給最大", formatBadgeValue("基本給最大", latest?.baseSalaryMax))}
          {renderBadge("固定残業時間", fixedOvertimeHoursDisplay)}
          {renderBadge("固定残業代", fixedOvertimePayDisplay)}
          {renderBadge("年間休日", formatBadgeValue("年間休日", latest?.annualHolidays))}
          {renderBadge("休日制度", formatBadgeValue("休日制度", latest?.holidayType))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">根拠文（evidence）</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.entries(evidence)
            .filter(([key]) => key !== "parserVersion")
            .map(([key, value]) => (
            <li key={key} className="rounded border border-slate-200 bg-slate-50 p-3">
              <span className="font-medium text-slate-800">{evidenceLabels[key] ?? key}: </span>
              <span className="text-slate-600">{value?.evidence ?? "根拠なし"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">求人本文（生データ）</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{job.rawText}</pre>
      </div>
    </section>
  );
}
