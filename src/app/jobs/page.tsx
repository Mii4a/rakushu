import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";

import type { ParsedJob } from "@/lib/analysis";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";

export const dynamic = "force-dynamic";

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
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1
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

function formatHours(value: number) {
  const hours = Math.trunc(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatRankDetail(label: string, parsed: ParsedJob | null) {
  if (!parsed) return "値なし";

  if (label === "総合") {
    const warningCount = parsed.warnings.value?.length ?? 0;
    return warningCount > 0 ? `警告 ${warningCount}件` : "警告なし";
  }

  if (label === "固定残業") {
    if (parsed.fixedOvertimeHours.status === "none") return "固定残業なし";
    if (parsed.fixedOvertimeHours.value == null) return "時間不明";
    return formatHours(parsed.fixedOvertimeHours.value);
  }

  if (label === "年間休日") {
    return parsed.annualHolidays.value != null ? `${parsed.annualHolidays.value}日` : "日数不明";
  }

  if (label === "休日制度") {
    return parsed.holidayType.value ?? "制度不明";
  }

  if (label === "福利厚生") {
    const count = parsed.benefits.value?.length ?? 0;
    if (count === 0) return "項目なし";
    return `${count}項目`;
  }

  return "値なし";
}

function renderRankBadge(label: string, rank: string | null | undefined, detail: string) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{rank ?? "UNKNOWN"}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function renderWarningBadge(warning: string) {
  return (
    <span key={warning} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
      <ShieldAlert className="size-3.5" />
      {warning}
    </span>
  );
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [{ deleteJobAction }, { requireUser }, { db }, { jobs }] = await Promise.all([
    import("@/actions/job-actions"),
    import("@/lib/auth/require-user"),
    import("@/lib/db/client"),
    import("@/lib/db/schema")
  ]);
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const q = (toSingle(params.q) ?? "").trim().toLowerCase();
  const totalRank = (toSingle(params.totalRank) ?? "").trim().toUpperCase();
  const minHolidayRaw = (toSingle(params.minHoliday) ?? "").trim();
  const sortInput = (toSingle(params.sort) ?? "created_desc").trim() as SortKey;
  const sort = sortInput in SORT_OPTIONS ? sortInput : "created_desc";
  const minHoliday = minHolidayRaw ? Number(minHolidayRaw) : Number.NaN;

  const jobList = await db.query.jobs.findMany({
    where: eq(jobs.userId, user.id),
    orderBy: [desc(jobs.createdAt)]
  });
  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(jobList.map((job) => job.id));
  const jobListWithAnalyses = jobList.map((job) => ({
    ...job,
    analyses: latestAnalysesByJobId.has(job.id) ? [latestAnalysesByJobId.get(job.id)!] : []
  }));

  const filteredList = jobListWithAnalyses.filter((job) => {
    const latest = job.analyses[0];
    const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
    const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "";
    const displayTitle = parsed?.title.value ?? job.title ?? "";
    const matchedQuery =
      !q ||
      [displayCompanyName, displayTitle, job.sourceName ?? ""]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    const matchedRank = !totalRank || latest?.totalRank === totalRank;
    const matchedHoliday = !Number.isFinite(minHoliday) || (parsed?.annualHolidays.value != null && parsed.annualHolidays.value >= minHoliday);

    return matchedQuery && matchedRank && matchedHoliday;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    const aLatest = a.analyses[0];
    const bLatest = b.analyses[0];
    const aParsed = aLatest?.evidenceJson ? (JSON.parse(aLatest.evidenceJson) as ParsedJob) : null;
    const bParsed = bLatest?.evidenceJson ? (JSON.parse(bLatest.evidenceJson) as ParsedJob) : null;
    const aName = aParsed?.companyName.value ?? a.companyName ?? "";
    const bName = bParsed?.companyName.value ?? b.companyName ?? "";

    switch (sort) {
      case "created_asc":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "company_asc":
        return aName.localeCompare(bName, "ja");
      case "company_desc":
        return bName.localeCompare(aName, "ja");
      case "rank_desc":
        return (rankScore[bLatest?.totalRank ?? ""] ?? 0) - (rankScore[aLatest?.totalRank ?? ""] ?? 0);
      case "holidays_desc":
        return (bParsed?.annualHolidays.value ?? -1) - (aParsed?.annualHolidays.value ?? -1);
      case "created_desc":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Jobs</p>
            <h1 className="page-title">求人一覧</h1>
            <p className="page-copy mt-3">保存済みの求人を、総合ランク、評価内訳、警告ワード、選考ステータスの4層で見返せるようにしています。</p>
          </div>
          <Link href="/jobs/new" className="button-primary">
            <Plus className="size-4" />
            求人を登録
          </Link>
        </div>
      </div>

      <form className="panel grid gap-3 md:grid-cols-4">
        <label className="space-y-2 md:col-span-2">
          <span className="field-label">キーワード</span>
          <input name="q" defaultValue={q} placeholder="会社名・職種・情報元で検索" className="field-input" />
        </label>

        <label className="space-y-2">
          <span className="field-label">総合ランク</span>
          <select name="totalRank" defaultValue={totalRank} className="field-input">
            <option value="">指定なし</option>
            <option value="S">S</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="field-label">最低年間休日</span>
          <input name="minHoliday" type="number" min={0} step={1} defaultValue={Number.isFinite(minHoliday) ? minHoliday : ""} placeholder="例: 120" className="field-input" />
        </label>

        <label className="space-y-2">
          <span className="field-label">並び順</span>
          <select name="sort" defaultValue={sort} className="field-input">
            {Object.entries(SORT_OPTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button type="submit" className="button-primary">
            絞り込み
          </button>
          <Link href="/jobs" className="button-secondary">
            クリア
          </Link>
        </div>
      </form>

      {jobListWithAnalyses.length === 0 ? (
        <div className="panel">
          <div className="panel-muted">
            <p className="text-sm leading-6 text-slate-600">まだ求人がありません。まずは本文を貼り付けて、固定残業や休日制度がどう評価されるかを確認してください。</p>
            <Link href="/jobs/new" className="button-primary mt-4">
              最初の求人を解析
            </Link>
          </div>
        </div>
      ) : sortedList.length === 0 ? (
        <div className="panel">
          <div className="panel-muted text-sm text-slate-600">条件に合う求人がありません。検索条件を変更するか、求人を新規登録してください。</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedList.map((job) => {
            const latest = job.analyses[0];
            const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
            const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
            const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";
            const warnings = parsed?.warnings.value ?? [];

            return (
              <article key={job.id} className="panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">{displayCompanyName}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{displayTitle}</p>
                    <p className="mt-2 text-xs text-slate-500">選考ステータス: {statusLabel[job.selectionStatus] ?? "未設定"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/jobs/${job.id}`} className="button-secondary">
                      詳細
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link href={`/jobs/${job.id}/edit`} className="button-secondary">
                      <Pencil className="size-4" />
                      編集
                    </Link>
                    <form action={deleteJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button type="submit" className="button-secondary text-rose-700 hover:text-rose-800">
                        <Trash2 className="size-4" />
                        削除
                      </button>
                    </form>
                  </div>
                </div>

                {latest ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {renderRankBadge("総合", latest.totalRank, formatRankDetail("総合", parsed))}
                      {renderRankBadge("固定残業", latest.salaryRank, formatRankDetail("固定残業", parsed))}
                      {renderRankBadge("年間休日", latest.holidayRank, formatRankDetail("年間休日", parsed))}
                      {renderRankBadge("休日制度", latest.holidayTypeRank, formatRankDetail("休日制度", parsed))}
                      {renderRankBadge("福利厚生", latest.benefitRank, formatRankDetail("福利厚生", parsed))}
                    </div>

                    {warnings.length > 0 ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-900">警告 {warnings.length}件</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {warnings.slice(0, 6).map(renderWarningBadge)}
                          {warnings.length > 6 ? <span className="soft-pill">+{warnings.length - 6}</span> : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">解析結果はまだありません。</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
