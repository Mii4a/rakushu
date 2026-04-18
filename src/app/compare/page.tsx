import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

type CompareSearchParams = Promise<{ ids?: string | string[] }>;

function parseIds(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export default async function ComparePage({ searchParams }: { searchParams: CompareSearchParams }) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const params = await searchParams;
  const ids = parseIds(params.ids);

  const allJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    orderBy: [desc(jobs.createdAt)]
  });

  const maxCompare = PLAN_LIMITS[plan].maxCompare;
  const overLimit = Number.isFinite(maxCompare) && ids.length > maxCompare;

  const compareTargets = ids.length
    ? await db.query.jobs.findMany({
        where: and(eq(jobs.userId, user.id), inArray(jobs.id, ids)),
        with: {
          analyses: {
            orderBy: [desc(jobAnalyses.createdAt)],
            limit: 1
          }
        }
      })
    : [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人比較</h1>
        <Link href="/jobs" className="text-sm text-rakushu-700 underline">
          求人一覧へ
        </Link>
      </div>

      <form method="GET" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm text-slate-600">比較したい求人を選択してください{Number.isFinite(maxCompare) ? `（最大${maxCompare}件）` : ""}</p>
        <div className="space-y-2">
          {allJobs.map((job) => {
            const checked = ids.includes(job.id);
            return (
              <label key={job.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ids" value={job.id} defaultChecked={checked} />
                <span>
                  {job.companyName ?? "会社名不明"} / {job.title ?? "職種不明"}
                </span>
              </label>
            );
          })}
        </div>

        <button type="submit" className="mt-4 rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
          比較する
        </button>
      </form>

      {overLimit ? <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900">無料プランは比較3件までです。件数を減らすか、Proプランをご利用ください。</p> : null}

      {!overLimit && compareTargets.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">項目</th>
                {compareTargets.map((job) => (
                  <th key={job.id} className="px-4 py-3 text-left">
                    {job.companyName ?? "会社名不明"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">職種</td>
                {compareTargets.map((job) => (
                  <td key={job.id} className="px-4 py-3 text-slate-900">{job.title ?? "不明"}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">雇用形態</td>
                {compareTargets.map((job) => (
                  <td key={job.id} className="px-4 py-3 text-slate-900">{job.analyses[0]?.employmentType ?? "不明"}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">年間休日</td>
                {compareTargets.map((job) => (
                  <td key={job.id} className="px-4 py-3 text-slate-900">{job.analyses[0]?.annualHolidays ?? "不明"}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">固定残業時間</td>
                {compareTargets.map((job) => (
                  <td key={job.id} className="px-4 py-3 text-slate-900">{job.analyses[0]?.fixedOvertimeHours ?? "不明"}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">総合ランク</td>
                {compareTargets.map((job) => (
                  <td key={job.id} className="px-4 py-3 text-slate-900">{job.analyses[0]?.totalRank ?? "UNKNOWN"}</td>
                ))}
              </tr>

              {plan === "pro" ? (
                <>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-700">固定残業ランク</td>
                    {compareTargets.map((job) => (
                      <td key={job.id} className="px-4 py-3 text-slate-900">{job.analyses[0]?.salaryRank ?? "UNKNOWN"}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-700">休日ランク</td>
                    {compareTargets.map((job) => (
                      <td key={job.id} className="px-4 py-3 text-slate-900">{job.analyses[0]?.holidayRank ?? "UNKNOWN"}</td>
                    ))}
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-700">詳細評価</td>
                  <td className="px-4 py-3 text-slate-500" colSpan={compareTargets.length}>
                    詳細評価はProプランで利用できます。
                    <Link href="/pricing" className="ml-1 text-rakushu-700 underline">
                      料金を見る
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
