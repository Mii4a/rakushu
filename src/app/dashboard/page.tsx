import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import type { ParsedJob } from "@/lib/analysis";
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

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const recentJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, session.user.id),
    orderBy: [desc(jobs.createdAt)],
    limit: 6,
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">ログイン中</p>
        <h1 className="mt-1 text-2xl font-semibold">こんにちは、{session.user.name} さん</h1>
        <p className="mt-2 text-slate-700">求人の登録・解析・管理ができます。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/jobs/new" className="rounded-lg bg-rakushu-500 px-3 py-2 text-sm text-white hover:bg-rakushu-700">
            求人登録へ
          </Link>
          <Link href="/jobs" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
            求人管理
          </Link>
          <Link href="/pricing" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
            料金を見る
          </Link>
          <Link href="/settings/account" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
            アカウント設定
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">登録済み求人</h2>
            <p className="mt-1 text-sm text-slate-600">最近登録した求人をすぐ確認できます。</p>
          </div>
          <Link href="/jobs" className="text-sm text-rakushu-700 underline">
            すべて見る
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            <p>まだ求人が登録されていません。</p>
            <Link href="/jobs/new" className="mt-3 inline-flex rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white hover:bg-rakushu-700">
              求人を登録する
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {recentJobs.map((job) => {
              const latest = job.analyses[0];
              const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
              const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
              const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";

              return (
                <article key={job.id} className="min-w-[280px] max-w-[320px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{displayCompanyName}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{displayTitle}</p>
                    </div>
                    <Link href={`/jobs/${job.id}`} className="shrink-0 text-sm text-rakushu-700 underline">
                      詳細
                    </Link>
                  </div>

                  {latest ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {renderRankBadge("総合", latest.totalRank)}
                      {renderRankBadge("固定残業", latest.salaryRank)}
                      {renderRankBadge("年間休日", latest.holidayRank)}
                      {renderRankBadge("休日制度", latest.holidayTypeRank)}
                      {renderRankBadge("福利厚生", latest.benefitRank)}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">解析結果はまだありません。</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Phase 3 実装済み</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>料金ページ</li>
          <li>Stripe Checkout API</li>
          <li>Stripe Webhookでサブスク同期</li>
          <li>無料/有料の利用制限（求人保存・解析）</li>
        </ul>
      </div>
    </section>
  );
}
