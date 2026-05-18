import Link from "next/link";
import { Bookmark, FileSearch, GitCompareArrows, Home, Plane, Settings } from "lucide-react";
import { desc, eq } from "drizzle-orm";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import type { ParsedJob } from "@/lib/analysis";
import { requireUser } from "@/lib/auth/require-user";
import { formatCommuteRangeDetail, getCommuteDataKindLabel, getCommuteDataKindTone } from "@/lib/commute/fields";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const compareEnabled = PLAN_LIMITS[plan].commute.canCompare;
  const userJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    orderBy: [desc(jobs.updatedAt)],
    limit: 6
  });
  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(userJobs.map((job) => job.id));
  const jobsWithData = userJobs.map((job) => {
    const latest = latestAnalysesByJobId.get(job.id);
    const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
    return {
      ...job,
      latest,
      parsed
    };
  });

  return (
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="compare" note="比較ページは次の段階で実装します。通勤時間やランク軸を横並びで見比べる入口として使います。" />

        <div className="dashboard-main">
          <div className="page-stack">
            <div className="page-hero">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Compare</p>
                  <h1 className="page-title">求人比較</h1>
                  <p className="page-copy mt-3">
                    ここは比較ビューの入口です。次の実装では、総合ランク、年間休日、固定残業、福利厚生、通勤時間を複数求人で横並び比較できるようにします。
                  </p>
                </div>
                <Link href="/jobs" className="button-secondary">
                  求人一覧へ
                </Link>
              </div>
            </div>

            <div className="panel">
              {!compareEnabled ? (
                <div className="space-y-3">
                  <h2 className="section-title">Pro で比較を解放</h2>
                  <p className="text-sm text-rakumo-ink/75">比較ページで複数求人の通勤時間・休日・賞与・総合ランクを横並びにする機能は Pro プラン向けです。</p>
                  <Link href="/pricing" className="button-primary">
                    料金ページを見る
                  </Link>
                </div>
              ) : jobsWithData.length === 0 ? (
                <div className="space-y-3">
                  <h2 className="section-title">比較する求人がまだありません</h2>
                  <p className="text-sm text-rakumo-ink/75">先に求人を保存すると、ここで通勤時間やランク軸を並べて比較できます。</p>
                  <Link href="/jobs/new" className="button-primary">求人を入力する</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-rakumo-ink">
                    <thead>
                      <tr className="border-b border-rakumo-border text-left">
                        <th className="px-3 py-3 font-bold">求人</th>
                        <th className="px-3 py-3 font-bold">総合ランク</th>
                        <th className="px-3 py-3 font-bold">通勤時間</th>
                        <th className="px-3 py-3 font-bold">年間休日</th>
                        <th className="px-3 py-3 font-bold">固定残業</th>
                        <th className="px-3 py-3 font-bold">賞与</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobsWithData.map((job) => (
                        <tr key={job.id} className="border-b border-rakumo-border/70 align-top">
                          <td className="px-3 py-3">
                            <p className="font-semibold">{job.parsed?.companyName.value ?? job.companyName ?? "会社名不明"}</p>
                            <p className="text-rakumo-ink/65">{job.parsed?.title.value ?? job.title ?? "職種不明"}</p>
                          </td>
                          <td className="px-3 py-3 font-bold">{job.latest?.totalRank ?? "保留"}</td>
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <p>{formatCommuteRangeDetail(job)}</p>
                              {getCommuteDataKindLabel(job.commuteDataKind) ? (
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${getCommuteDataKindTone(job.commuteDataKind)}`}>
                                  {getCommuteDataKindLabel(job.commuteDataKind)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3">{job.parsed?.annualHolidays.value != null ? `${job.parsed.annualHolidays.value}日` : "－"}</td>
                          <td className="px-3 py-3">
                            {job.parsed?.fixedOvertimeHours.status === "none"
                              ? "なし"
                              : job.parsed?.fixedOvertimeHours.value != null
                                ? `${job.parsed.fixedOvertimeHours.value}時間`
                                : "－"}
                          </td>
                          <td className="px-3 py-3">
                            {job.parsed?.bonusCount?.status === "none"
                              ? "なし"
                              : job.parsed?.bonusCount?.value != null
                                ? `年${job.parsed.bonusCount.value}回`
                                : "－"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="dashboard-mobile-nav">
          <Link href="/dashboard" className="dashboard-mobile-nav-item">
            <Home className="size-5" />
            <span>ホーム</span>
          </Link>
          <Link href="/jobs/new" className="dashboard-mobile-nav-item">
            <FileSearch className="size-5" />
            <span>ランク付け</span>
          </Link>
          <Link href="/jobs" className="dashboard-mobile-nav-item">
            <Bookmark className="size-5" />
            <span>保存</span>
          </Link>
          <Link href="/jobs" className="dashboard-mobile-nav-item">
            <Plane className="size-5" />
            <span>応募</span>
          </Link>
          <Link href="/settings" className="dashboard-mobile-nav-item">
            <Settings className="size-5" />
            <span>設定</span>
          </Link>
        </nav>
      </div>
    </section>
  );
}
