import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Plus, ShieldAlert } from "lucide-react";

import type { ParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";

function formatHours(value: number) {
  const hours = Math.trunc(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatRankDetail(label: string, parsed: ParsedJob | null) {
  if (!parsed) return "値なし";

  if (label === "総合") {
    const warningCount = parsed.warnings.value?.length ?? 0;
    return warningCount > 0 ? `警告 ${warningCount}件` : "警告なし";
  }

  if (label === "固定残業") {
    if (parsed.fixedOvertimeHours.status === "none") return "固定残業なし";
    if (parsed.fixedOvertimeHours.value == null) return "時間不明";
    return formatHours(parsed.fixedOvertimeHours.value);
  }

  if (label === "年間休日") {
    return parsed.annualHolidays.value != null ? `${parsed.annualHolidays.value}日` : "日数不明";
  }

  if (label === "休日制度") {
    return parsed.holidayType.value ?? "制度不明";
  }

  if (label === "福利厚生") {
    const count = parsed.benefits.value?.length ?? 0;
    if (count === 0) return "項目なし";
    return `${count}項目`;
  }

  return "値なし";
}

function renderRankBadge(label: string, rank: string | null | undefined, detail: string) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{rank ?? "UNKNOWN"}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function renderWarningBadge(warning: string) {
  return (
    <span key={warning} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
      <ShieldAlert className="size-3.5" />
      {warning}
    </span>
  );
}

export default async function JobsPage() {
  const user = await requireUser();

  const jobList = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    orderBy: [desc(jobs.createdAt)],
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Jobs</p>
            <h1 className="page-title">求人一覧</h1>
            <p className="page-copy mt-3">保存済みの求人を、総合ランク、評価内訳、警告ワードの3層で素早く見返せる一覧にまとめています。</p>
          </div>
          <Link href="/jobs/new" className="button-primary">
            <Plus className="size-4" />
            求人を登録
          </Link>
        </div>
      </div>

      {jobList.length === 0 ? (
        <div className="panel">
          <div className="panel-muted">
            <p className="text-sm leading-6 text-slate-600">まだ求人がありません。まずは本文を貼り付けて、固定残業や休日制度がどう評価されるかを確認してください。</p>
            <Link href="/jobs/new" className="button-primary mt-4">
              最初の求人を解析
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobList.map((job) => {
            const latest = job.analyses[0];
            const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
            const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
            const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";
            const warnings = parsed?.warnings.value ?? [];

            return (
              <article key={job.id} className="panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">{displayCompanyName}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{displayTitle}</p>
                  </div>
                  <Link href={`/jobs/${job.id}`} className="button-secondary">
                    詳細を見る
                    <ArrowRight className="size-4" />
                  </Link>
                </div>

                {latest ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {renderRankBadge("総合", latest.totalRank, formatRankDetail("総合", parsed))}
                      {renderRankBadge("固定残業", latest.salaryRank, formatRankDetail("固定残業", parsed))}
                      {renderRankBadge("年間休日", latest.holidayRank, formatRankDetail("年間休日", parsed))}
                      {renderRankBadge("休日制度", latest.holidayTypeRank, formatRankDetail("休日制度", parsed))}
                      {renderRankBadge("福利厚生", latest.benefitRank, formatRankDetail("福利厚生", parsed))}
                    </div>

                    {warnings.length > 0 ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-900">警告 {warnings.length}件</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {warnings.slice(0, 6).map(renderWarningBadge)}
                          {warnings.length > 6 ? <span className="soft-pill">+{warnings.length - 6}</span> : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">解析結果はまだありません。</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
