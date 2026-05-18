import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [{ updateJobAction }, { requireUser }, { db }, { jobs }] = await Promise.all([
    import("@/actions/job-actions"),
    import("@/lib/auth/require-user"),
    import("@/lib/db/client"),
    import("@/lib/db/schema")
  ]);
  const { getPrimaryCommuteMinutes } = await import("@/lib/commute/fields");
  const user = await requireUser();
  const { id } = (await params) ?? {};

  if (!id) {
    notFound();
  }

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
        <Link href={`/jobs?selected=${job.id}`} className="text-sm text-rakumo-ink underline decoration-rakumo-mint underline-offset-2">
          詳細に戻る
        </Link>
      </div>

      <form action={updateJobAction} className="space-y-4 rounded-[28px] border border-rakumo-border bg-white p-6 shadow-[0_16px_32px_-28px_rgba(45,58,74,0.24)]">
        <input type="hidden" name="jobId" value={job.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-rakumo-ink/85">会社名（任意）</span>
            <input name="companyName" defaultValue={job.companyName ?? ""} className="field-input" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-rakumo-ink/85">職種（任意）</span>
            <input name="title" defaultValue={job.title ?? ""} className="field-input" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-rakumo-ink/85">情報元（任意）</span>
            <input
              name="sourceName"
              placeholder="例: リクナビ"
              defaultValue={job.sourceName ?? ""}
              className="field-input"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-rakumo-ink/85">URL（任意）</span>
            <input
              name="sourceUrl"
              placeholder="https://..."
              defaultValue={job.sourceUrl ?? ""}
              className="field-input"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-rakumo-ink/85">勤務地住所（任意）</span>
            <input
              name="workAddress"
              placeholder="例: 東京都渋谷区..."
              defaultValue={job.workAddress ?? ""}
              className="field-input"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-rakumo-ink/85">最寄り駅（任意）</span>
            <input
              name="nearestStation"
              placeholder="例: 渋谷駅"
              defaultValue={job.nearestStation ?? ""}
              className="field-input"
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-rakumo-ink/85">参考通勤時間（分・任意）</span>
          <input
            name="commuteMinutes"
            type="number"
            min={1}
            max={240}
            defaultValue={getPrimaryCommuteMinutes(job) ?? ""}
            className="field-input"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-rakumo-ink/85">求人本文（必須）</span>
          <textarea name="rawText" required minLength={20} rows={12} defaultValue={job.rawText} className="field-textarea min-h-0" />
        </label>

        <p className="text-xs text-rakumo-ink/65">編集後に「再解析」を実行すると、新しい本文をもとに解析結果を更新できます。</p>

        <button type="submit" className="button-primary">
          更新する
        </button>
      </form>
    </section>
  );
}
