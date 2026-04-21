import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import type { ParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";

function renderRankBadge(label: string, rank: string | null | undefined) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{rank ?? "UNKNOWN"}</p>
    </div>
  );
}

function renderWarningBadge(warning: string) {
  return (
    <span key={warning} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人一覧</h1>
        <Link href="/jobs/new" className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
          求人を登録
        </Link>
      </div>

      {jobList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          まだ求人がありません。まずは求人本文を登録して解析してみましょう。
        </div>
      ) : (
        <ul className="space-y-3">
          {jobList.map((job) => {
            const latest = job.analyses[0];
            const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
            const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
            const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";
            const warnings = parsed?.warnings.value ?? [];

            return (
              <li key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{displayCompanyName}</p>
                    <p className="text-sm text-slate-600">{displayTitle}</p>
                  </div>
                  <Link href={`/jobs/${job.id}`} className="shrink-0 text-sm text-rakushu-700 underline">
                    詳細
                  </Link>
                </div>

                {latest ? (
                  <>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {renderRankBadge("総合", latest.totalRank)}
                      {renderRankBadge("固定残業", latest.salaryRank)}
                      {renderRankBadge("年間休日", latest.holidayRank)}
                      {renderRankBadge("休日制度", latest.holidayTypeRank)}
                      {renderRankBadge("福利厚生", latest.benefitRank)}
                    </div>

                    {warnings.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500">警告 {warnings.length}件</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {warnings.slice(0, 4).map(renderWarningBadge)}
                          {warnings.length > 4 ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">+{warnings.length - 4}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">解析結果はまだありません。</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
