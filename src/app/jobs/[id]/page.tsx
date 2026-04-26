import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { deleteJobAction, rerunAnalysisAction } from "@/actions/job-actions";
import { SelectionProgressForm } from "@/components/selection-progress-form";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";

function renderBadge(label: string, value: string | number | null | undefined) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value ?? "不明"}</p>
    </div>
  );
}

const statusLabel: Record<string, string> = {
  saved: "検討中",
  applied: "応募済み",
  screening: "書類選考中",
  interview: "面接中",
  offer: "内定",
  rejected: "見送り"
};

function toDateInputValue(value: Date | null): string {
  if (!value) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const job = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, id), eq(jobs.userId, user.id)),
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  if (!job) {
    notFound();
  }

  const latest = job.analyses[0];
  const evidence = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as Record<string, { evidence?: string | null }>) : {};
  const nextActionDate = toDateInputValue(job.nextActionAt);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{job.companyName ?? "会社名不明"}</h1>
          <p className="text-slate-600">{job.title ?? "職種不明"}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs" className="text-sm text-rakushu-700 underline">
            一覧へ
          </Link>
          <Link href={`/jobs/${job.id}/edit`} className="text-sm text-rakushu-700 underline">
            編集
          </Link>
          <form action={deleteJobAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <button type="submit" className="text-sm text-rose-700 underline">
              削除
            </button>
          </form>
          <form action={rerunAnalysisAction.bind(null, job.id)}>
            <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
              再解析
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">選考進捗</h2>
        <p className="mt-1 text-sm text-slate-600">現在ステータス: {statusLabel[job.selectionStatus] ?? "未設定"}</p>

        <SelectionProgressForm
          jobId={job.id}
          selectionStatus={job.selectionStatus}
          nextActionDate={nextActionDate}
          selectionMemo={job.selectionMemo ?? ""}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">抽出値</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renderBadge("雇用形態", latest?.employmentType)}
          {renderBadge("基本給最小", latest?.baseSalaryMin)}
          {renderBadge("基本給最大", latest?.baseSalaryMax)}
          {renderBadge("固定残業時間", latest?.fixedOvertimeHours)}
          {renderBadge("固定残業代", latest?.fixedOvertimePay)}
          {renderBadge("年間休日", latest?.annualHolidays)}
          {renderBadge("休日制度", latest?.holidayType)}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">ランク</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {renderBadge("固定残業ランク", latest?.salaryRank)}
          {renderBadge("休日ランク", latest?.holidayRank)}
          {renderBadge("福利厚生ランク", latest?.benefitRank)}
          {renderBadge("総合ランク", latest?.totalRank)}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">根拠文（evidence）</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.entries(evidence).map(([key, value]) => (
            <li key={key} className="rounded border border-slate-200 bg-slate-50 p-3">
              <span className="font-medium text-slate-800">{key}: </span>
              <span className="text-slate-600">{value?.evidence ?? "根拠なし"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">求人本文（生データ）</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{job.rawText}</pre>
      </div>
    </section>
  );
}
