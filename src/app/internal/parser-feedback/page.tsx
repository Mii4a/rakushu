import Link from "next/link";

import { requireUser } from "@/lib/auth/require-user";
import { getLatestAnalysisFeedback, type FeedbackSeverity, type FeedbackStatus } from "@/lib/jobs/latest-analysis-feedback";

export const dynamic = "force-dynamic";

function toSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function InternalParserFeedbackPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  const params = (await searchParams) ?? {};
  const status = (toSingle(params.status) ?? "open") as FeedbackStatus | "";
  const severity = (toSingle(params.severity) ?? "") as FeedbackSeverity | "";

  const items = await getLatestAnalysisFeedback({ status, severity, limit: 100 });

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Internal</p>
        <h1 className="text-3xl font-black text-slate-900">Parser feedback</h1>
        <p className="text-sm leading-7 text-slate-600">
          高シグナルな解析失敗だけを一覧で見返すためのページ。fixture 化や parser 改修の優先度付けに使う。
        </p>
      </div>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-[220px_220px_auto]">
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>status</span>
          <select name="status" defaultValue={status} className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm">
            <option value="">all</option>
            <option value="open">open</option>
            <option value="reviewed">reviewed</option>
            <option value="fixture_added">fixture_added</option>
            <option value="ignored">ignored</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>severity</span>
          <select name="severity" defaultValue={severity} className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm">
            <option value="">all</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
          </select>
        </label>

        <div className="flex items-end gap-3">
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white">
            絞り込む
          </button>
          <Link href="/internal/parser-feedback" className="text-sm font-semibold text-slate-600">
            クリア
          </Link>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        件数: <span className="font-bold text-slate-900">{items.length}</span>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500">
            条件に合う feedback はまだない。
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">{item.severity}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{item.status}</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{item.source}</span>
                    {item.failureTypes.map((failureType) => (
                      <span key={failureType} className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                        {failureType}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{item.summaryText}</h2>
                  <p className="text-sm text-slate-600">
                    {item.companyName ?? "会社名未取得"} / {item.sourceName ?? "source unknown"} / parser {item.parserVersion}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <p>{formatDateTime(item.createdAt)}</p>
                  <p>analysis: {item.jobAnalysisId}</p>
                  <p>job: {item.jobId}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">raw excerpt</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{item.rawExcerpt}</pre>
                  </div>

                  <details className="rounded-2xl border border-slate-200 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-bold text-slate-800">parsed snapshot を見る</summary>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                      {JSON.stringify(item.parsedSnapshot, null, 2)}
                    </pre>
                  </details>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">quick checks</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li>会社名: {item.parsedSnapshot?.companyName.status ?? "unknown"}</li>
                      <li>雇用形態: {item.parsedSnapshot?.employmentType.status ?? "unknown"}</li>
                      <li>給与: {item.parsedSnapshot?.salaryText.status ?? "unknown"}</li>
                      <li>休日: {item.parsedSnapshot?.annualHolidays.status ?? "unknown"}</li>
                      <li>福利厚生件数: {item.parsedSnapshot?.benefits.value?.length ?? 0}</li>
                      <li>warning件数: {item.parsedSnapshot?.warnings.value?.length ?? 0}</li>
                    </ul>
                  </div>

                  <Link
                    href={`/jobs/${item.jobId}`}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
                  >
                    元の求人を見る
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
