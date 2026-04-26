import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { getAnalysisCount, getMonthKey } from "@/lib/usage/counters";

function toDateLabel(value: Date | null): string {
  if (!value) return "日付未設定";
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const plan = await getUserPlan(session.user.id);
  const limits = PLAN_LIMITS[plan];

  const jobCountResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, session.user.id));
  const jobCount = jobCountResult[0]?.count ?? 0;
  const monthKey = getMonthKey();
  const analysisCount = await getAnalysisCount(session.user.id, monthKey);
  const now = new Date();
  const oneWeekLater = new Date(now);
  oneWeekLater.setUTCDate(now.getUTCDate() + 7);

  const upcomingActions = await db.query.jobs.findMany({
    where: and(
      eq(jobs.userId, session.user.id),
      sql`${jobs.nextActionAt} is not null`,
      sql`${jobs.selectionStatus} not in ('offer', 'rejected')`,
      sql`${jobs.nextActionAt} <= ${oneWeekLater}`
    ),
    orderBy: [asc(jobs.nextActionAt)],
    limit: 8
  });

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">ログイン中</p>
        <h1 className="mt-1 text-2xl font-semibold">こんにちは、{session.user.name} さん</h1>
        <p className="mt-2 text-slate-700">求人の登録・解析ができます。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/jobs" className="rounded-lg bg-rakushu-500 px-3 py-2 text-sm text-white hover:bg-rakushu-700">
            求人一覧へ
          </Link>
          <Link href="/pricing" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
            料金を見る
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">利用状況（{monthKey}）</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">求人保存</p>
            <p className="mt-1 font-medium text-slate-900">
              {jobCount}/{Number.isFinite(limits.maxJobs) ? limits.maxJobs : "∞"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">解析（今月）</p>
            <p className="mt-1 font-medium text-slate-900">
              {analysisCount}/{Number.isFinite(limits.maxAnalysesPerMonth) ? limits.maxAnalysesPerMonth : "∞"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">次アクション（7日以内）</h2>
        {upcomingActions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">期限が近いアクションはありません。</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {upcomingActions.map((job) => (
              <li key={job.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="font-medium text-slate-900">{job.companyName ?? "会社名不明"}</p>
                  <p className="text-slate-600">{job.title ?? "職種不明"}</p>
                </div>
                <Link href={`/jobs/${job.id}`} className="text-rakushu-700 underline">
                  {toDateLabel(job.nextActionAt)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Phase 3 実装済み</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>求人一覧の検索・絞り込み・並び替え</li>
          <li>料金ページ</li>
          <li>Stripe Checkout API</li>
          <li>Stripe Webhookでサブスク同期</li>
          <li>無料/有料の利用制限（求人保存・解析）</li>
        </ul>
      </div>
    </section>
  );
}
