import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { updateJobAction } from "@/actions/job-actions";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const job = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, id), eq(jobs.userId, user.id))
  });

  if (!job) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人編集</h1>
        <Link href={`/jobs/${job.id}`} className="text-sm text-rakushu-700 underline">
          詳細に戻る
        </Link>
      </div>

      <form action={updateJobAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="jobId" value={job.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">会社名（任意）</span>
            <input name="companyName" defaultValue={job.companyName ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">職種（任意）</span>
            <input name="title" defaultValue={job.title ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">情報元（任意）</span>
            <input
              name="sourceName"
              placeholder="例: リクナビ"
              defaultValue={job.sourceName ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">URL（任意）</span>
            <input
              name="sourceUrl"
              placeholder="https://..."
              defaultValue={job.sourceUrl ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-slate-700">求人本文（必須）</span>
          <textarea name="rawText" required minLength={20} rows={12} defaultValue={job.rawText} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>

        <p className="text-xs text-slate-500">編集後に「再解析」を実行すると、新しい本文をもとに解析結果を更新できます。</p>

        <button type="submit" className="rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white hover:bg-rakushu-700">
          更新する
        </button>
      </form>
    </section>
  );
}
