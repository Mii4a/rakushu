import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { deleteJobAction } from "@/actions/job-actions";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";

const SORT_OPTIONS = {
  created_desc: "登録日が新しい順",
  created_asc: "登録日が古い順",
  company_asc: "会社名A→Z",
  company_desc: "会社名Z→A",
  rank_desc: "総合ランクが高い順",
  holidays_desc: "年間休日が多い順"
} as const;

type SortKey = keyof typeof SORT_OPTIONS;

const rankScore: Record<string, number> = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1
};

const statusLabel: Record<string, string> = {
  saved: "検討中",
  applied: "応募済み",
  screening: "書類選考中",
  interview: "面接中",
  offer: "内定",
  rejected: "見送り"
};

function toSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (toSingle(params.q) ?? "").trim().toLowerCase();
  const totalRank = (toSingle(params.totalRank) ?? "").trim().toUpperCase();
  const minHolidayRaw = (toSingle(params.minHoliday) ?? "").trim();
  const sortInput = (toSingle(params.sort) ?? "created_desc").trim() as SortKey;
  const sort = sortInput in SORT_OPTIONS ? sortInput : "created_desc";
  const minHoliday = minHolidayRaw ? Number(minHolidayRaw) : NaN;

  const jobList = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    orderBy: [desc(jobs.createdAt)],
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  const filteredList = jobList.filter((job) => {
    const latest = job.analyses[0];
    const matchedQuery =
      !q ||
      [job.companyName, job.title, job.sourceName]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q));
    const matchedRank = !totalRank || latest?.totalRank === totalRank;
    const matchedHoliday =
      !Number.isFinite(minHoliday) ||
      (typeof latest?.annualHolidays === "number" && latest.annualHolidays >= minHoliday);

    return matchedQuery && matchedRank && matchedHoliday;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    const aLatest = a.analyses[0];
    const bLatest = b.analyses[0];

    switch (sort) {
      case "created_asc":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "company_asc":
        return (a.companyName ?? "").localeCompare(b.companyName ?? "", "ja");
      case "company_desc":
        return (b.companyName ?? "").localeCompare(a.companyName ?? "", "ja");
      case "rank_desc":
        return (rankScore[bLatest?.totalRank ?? ""] ?? 0) - (rankScore[aLatest?.totalRank ?? ""] ?? 0);
      case "holidays_desc":
        return (bLatest?.annualHolidays ?? -1) - (aLatest?.annualHolidays ?? -1);
      case "created_desc":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人一覧</h1>
        <Link href="/jobs/new" className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
          求人を登録
        </Link>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-slate-700">キーワード</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="会社名・職種・情報元で検索"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-700">総合ランク</span>
          <select name="totalRank" defaultValue={totalRank} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">指定なし</option>
            <option value="S">S</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-700">最低年間休日</span>
          <input
            name="minHoliday"
            type="number"
            min={0}
            step={1}
            defaultValue={Number.isFinite(minHoliday) ? minHoliday : ""}
            placeholder="例: 120"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-700">並び順</span>
          <select name="sort" defaultValue={sort} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            {Object.entries(SORT_OPTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
            絞り込み
          </button>
          <Link href="/jobs" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            クリア
          </Link>
        </div>
      </form>

      {jobList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          まだ求人がありません。まずは求人本文を登録して解析してみましょう。
        </div>
      ) : sortedList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          条件に合う求人がありません。検索条件を変更するか、求人を新規登録してください。
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedList.map((job) => (
            <li key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.companyName ?? "会社名不明"}</p>
                  <p className="text-sm text-slate-600">{job.title ?? "職種不明"}</p>
                  <p className="text-xs text-slate-500">
                    総合ランク: {job.analyses[0]?.totalRank ?? "不明"} / 年間休日: {job.analyses[0]?.annualHolidays ?? "不明"}
                  </p>
                  <p className="text-xs text-slate-500">選考ステータス: {statusLabel[job.selectionStatus] ?? "未設定"}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Link href={`/jobs/${job.id}`} className="text-rakushu-700 underline">
                    詳細
                  </Link>
                  <Link href={`/jobs/${job.id}/edit`} className="text-rakushu-700 underline">
                    編集
                  </Link>
                  <form action={deleteJobAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button type="submit" className="text-rose-700 underline">
                      削除
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
