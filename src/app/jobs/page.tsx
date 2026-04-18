import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

export default async function JobsPage() {
  const user = await requireUser();

  const jobList = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    orderBy: [desc(jobs.createdAt)]
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
          {jobList.map((job) => (
            <li key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.companyName ?? "会社名不明"}</p>
                  <p className="text-sm text-slate-600">{job.title ?? "職種不明"}</p>
                </div>
                <Link href={`/jobs/${job.id}`} className="text-sm text-rakushu-700 underline">
                  詳細
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
