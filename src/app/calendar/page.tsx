import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

function toDateKey(value: Date) {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toJaDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return `${y}年${m}月${d}日`;
}

const statusLabel: Record<string, string> = {
  saved: "検討中",
  applied: "応募済み",
  screening: "書類選考中",
  interview: "面接中",
  offer: "内定",
  rejected: "見送り"
};

export default async function CalendarPage() {
  const user = await requireUser();

  const actionJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.userId, user.id), sql`${jobs.nextActionAt} is not null`),
    orderBy: [asc(jobs.nextActionAt)]
  });

  const grouped = new Map<string, typeof actionJobs>();
  for (const job of actionJobs) {
    if (!job.nextActionAt) continue;
    const key = toDateKey(job.nextActionAt);
    const list = grouped.get(key) ?? [];
    list.push(job);
    grouped.set(key, list);
  }

  const dates = [...grouped.keys()];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">選考カレンダー</h1>
        <Link href="/jobs" className="text-sm text-rakushu-700 underline">
          求人一覧へ
        </Link>
      </div>

      <p className="text-sm text-slate-600">次アクション日が設定された求人を日付単位で確認できます。</p>

      {dates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          次アクション日が設定された求人はまだありません。
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((dateKey) => {
            const items = grouped.get(dateKey) ?? [];
            return (
              <div key={dateKey} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold">{toJaDateLabel(dateKey)}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {items.map((job) => (
                    <li key={job.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div>
                        <p className="font-medium text-slate-900">{job.companyName ?? "会社名不明"}</p>
                        <p className="text-slate-600">{job.title ?? "職種不明"}</p>
                        <p className="text-xs text-slate-500">ステータス: {statusLabel[job.selectionStatus] ?? "未設定"}</p>
                      </div>
                      <Link href={`/jobs/${job.id}`} className="text-rakushu-700 underline">
                        詳細
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
