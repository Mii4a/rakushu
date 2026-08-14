import Image from "next/image";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ChevronRight, LayoutGrid, List, Search } from "lucide-react";

import fileThumbsUp from "../../../UI-mock/jobs/character/rakumo-file-thumbs-up-Photoroom.png";
import { toggleJobFavoriteAction } from "@/actions/job-actions";
import { AppMockSidebarShell } from "@/components/app-mock-sidebar-shell";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { OutlineButton, ScoreRing, SearchIconField, SectionPanel, TinyStatCard, CompanyMark } from "@/components/jobs/jobs-mock-ui";
import { SORT_OPTIONS, type SortKey, coerceDate, formatDate, getMatchScoreFromRank, getScoreFromRank, toSingle } from "@/lib/jobs/mock-helpers";

export const dynamic = "force-dynamic";

type StageKey = "all" | "saved" | "applied" | "interview";

function stageMatches(stage: StageKey, selectionStatus: string) {
  if (stage === "all") return true;
  if (stage === "saved") return selectionStatus === "saved";
  if (stage === "applied") return selectionStatus === "applied";
  if (stage === "interview") return selectionStatus === "screening" || selectionStatus === "interview";
  return true;
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const q = (toSingle(params?.q) ?? "").trim().toLowerCase();
  const location = (toSingle(params?.location) ?? "").trim().toLowerCase();
  const salary = (toSingle(params?.salary) ?? "").trim().toLowerCase();
  const employment = (toSingle(params?.employment) ?? "").trim().toLowerCase();
  const totalRank = (toSingle(params?.totalRank) ?? "").trim().toUpperCase();
  const stage = ((toSingle(params?.stage) ?? "all").trim() as StageKey) || "all";
  const remote = (toSingle(params?.remote) ?? "").trim().toLowerCase();
  const selectedId = (toSingle(params?.selected) ?? "").trim();
  const detailPaneState = (toSingle(params?.detailPane) ?? "").trim();
  const detailsPaneHidden = detailPaneState !== "shown";
  const sortInput = (toSingle(params?.sort) ?? "created_desc").trim() as SortKey;
  const sort = sortInput in SORT_OPTIONS ? sortInput : "created_desc";

  const [jobCountResult, jobList] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, user.id)),
    db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        companyName: jobs.companyName,
        title: jobs.title,
        sourceName: jobs.sourceName,
        sourceUrl: jobs.sourceUrl,
        workAddress: jobs.workAddress,
        nearestStation: jobs.nearestStation,
        commuteMinutes: jobs.commuteMinutes,
        commuteMinutesTypical: jobs.commuteMinutesTypical,
        selectionStatus: jobs.selectionStatus,
        isFavorite: jobs.isFavorite,
        nextActionAt: jobs.nextActionAt,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt
      })
      .from(jobs)
      .where(eq(jobs.userId, user.id))
      .orderBy(sql`${jobs.createdAt} desc`)
  ]);

  const latestAnalysesByJobId = await getLatestAnalysesByJobIds(jobList.map((job) => job.id));
  const jobsWithAnalyses = jobList.map((job) => {
    const latest = latestAnalysesByJobId.get(job.id) ?? null;
    const parsed = parseStoredParsedJob(latest?.evidenceJson, `jobs-page:${job.id}`);
    return { ...job, latest, parsed };
  });

  const filtered = jobsWithAnalyses.filter((job) => {
    const displayCompanyName = job.parsed?.companyName.value ?? job.companyName ?? "";
    const displayTitle = job.parsed?.title.value ?? job.title ?? "";
    const displayLocation = job.parsed?.workAddress.value ?? job.workAddress ?? "";
    const displaySalary = job.parsed?.salaryText.value ?? "";
    const displayEmployment = job.parsed?.employmentType.value ?? "";
    const matchedKeyword = !q || [displayCompanyName, displayTitle, job.sourceName ?? ""].some((value) => value.toLowerCase().includes(q));
    const matchedLocation = !location || displayLocation.toLowerCase().includes(location);
    const matchedSalary = !salary || displaySalary.toLowerCase().includes(salary);
    const matchedEmployment = !employment || displayEmployment.toLowerCase().includes(employment);
    const remoteBenefit = job.parsed?.benefits.value?.some((item) => /リモート|在宅|フルリモート|ハイブリッド/.test(item)) ?? false;
    const matchedRemote = !remote || (remote === "yes" ? remoteBenefit : remote === "no" ? !remoteBenefit : true);
    const matchedRank = !totalRank || job.latest?.totalRank === totalRank;
    const matchedStage = stageMatches(stage, job.selectionStatus);
    return matchedKeyword && matchedLocation && matchedSalary && matchedEmployment && matchedRemote && matchedRank && matchedStage;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aName = a.parsed?.companyName.value ?? a.companyName ?? "";
    const bName = b.parsed?.companyName.value ?? b.companyName ?? "";
    switch (sort) {
      case "created_asc":
        return (coerceDate(a.createdAt)?.getTime() ?? 0) - (coerceDate(b.createdAt)?.getTime() ?? 0);
      case "company_asc":
        return aName.localeCompare(bName, "ja");
      case "company_desc":
        return bName.localeCompare(aName, "ja");
      case "rank_desc":
        return getScoreFromRank(b.latest?.totalRank ?? null) - getScoreFromRank(a.latest?.totalRank ?? null);
      case "rank_asc":
        return getScoreFromRank(a.latest?.totalRank ?? null) - getScoreFromRank(b.latest?.totalRank ?? null);
      case "favorite_desc":
        return Number(b.isFavorite) - Number(a.isFavorite) || (coerceDate(b.updatedAt ?? b.createdAt)?.getTime() ?? 0) - (coerceDate(a.updatedAt ?? a.createdAt)?.getTime() ?? 0);
      case "holidays_desc":
        return (b.parsed?.annualHolidays.value ?? -1) - (a.parsed?.annualHolidays.value ?? -1);
      case "created_desc":
      default:
        return (coerceDate(b.updatedAt ?? b.createdAt)?.getTime() ?? 0) - (coerceDate(a.updatedAt ?? a.createdAt)?.getTime() ?? 0);
    }
  });

  const totalSavedJobs = jobCountResult[0]?.count ?? 0;
  const selectedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    const single = toSingle(value);
    if (single) selectedParams.set(key, single);
  }
  const selectedJob = sorted.find((job) => job.id === selectedId) ?? null;
  const detailPaneParams = new URLSearchParams(selectedParams);
  if (detailsPaneHidden) {
    detailPaneParams.set("detailPane", "shown");
  } else {
    detailPaneParams.delete("detailPane");
  }
  const detailPaneHref = `/jobs${detailPaneParams.toString() ? `?${detailPaneParams.toString()}` : ""}`;
  const scoreValues = jobsWithAnalyses.map((job) => getMatchScoreFromRank(job.latest?.totalRank ?? null));
  const averageScore = scoreValues.length > 0 ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : 68;
  const highMatchCount = scoreValues.filter((value) => value >= 70).length;
  const midMatchCount = scoreValues.filter((value) => value >= 40 && value < 70).length;
  const lowMatchCount = scoreValues.filter((value) => value < 40).length;
  const savedCount = jobsWithAnalyses.filter((job) => job.selectionStatus === "saved").length;
  const appliedCount = jobsWithAnalyses.filter((job) => job.selectionStatus === "applied").length;
  const interviewCount = jobsWithAnalyses.filter((job) => job.selectionStatus === "screening" || job.selectionStatus === "interview").length;

  const stageTabs: Array<{ key: StageKey; label: string; count: number }> = [
    { key: "all", label: "すべて", count: totalSavedJobs },
    { key: "saved", label: "保存済み", count: savedCount },
    { key: "applied", label: "応募済み", count: appliedCount },
    { key: "interview", label: "面接中", count: interviewCount }
  ];

  return (
    <AppMockSidebarShell
      activeKey="saved-jobs"
      frameClassName="jobs-mock-surface"
      itemActions={{
            "saved-jobs": (
              <Link href={detailPaneHref} aria-label={detailsPaneHidden ? "詳細パネルを表示" : "詳細パネルを隠す"} className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe6dc] bg-white text-sm font-black text-[#2f3a32] shadow-[0_10px_20px_-20px_rgba(15,23,42,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2a9c47]">
                {detailsPaneHidden ? "›" : "‹"}
              </Link>
            )
          }}
    >
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#6c7480]">/ jobs</p>
            <h1 className="mt-3 text-[2.45rem] font-black tracking-[-0.04em] text-[#171c20] md:text-[3rem]">求人一覧</h1>
            <p className="mt-2 text-[0.98rem] text-[#5f6771]">チェックして保存した企業の求人一覧です。</p>
          </div>
          <Link href="/jobs/new" className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#17191b] px-6 text-sm font-black text-white shadow-[0_16px_28px_-22px_rgba(15,23,42,.65)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17191b]">
            ＋ 新しく求人をチェック
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {stageTabs.map((tab) => {
            const next = new URLSearchParams(selectedParams);
            next.set("stage", tab.key);
            return (
              <Link
                key={tab.key}
                href={`/jobs?${next.toString()}`}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${stage === tab.key ? "border-[#cfe8cf] bg-[#eef9e8] text-[#1d9b38]" : "border-[#ebeee7] bg-white text-[#3b434b]"}`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-[#f2f4ee] px-2.5 py-0.5 text-sm text-[#6b7480]">{tab.count}</span>
              </Link>
            );
          })}
        </div>

        <SectionPanel className="p-3 lg:p-4">
          <form className="grid gap-3 xl:grid-cols-[minmax(220px,1.6fr)_minmax(120px,.75fr)_minmax(120px,.75fr)_minmax(120px,.75fr)_minmax(120px,.75fr)_minmax(120px,.75fr)_auto]">
            <SearchIconField name="q" defaultValue={q} placeholder="企業名・職種・キーワードで検索" />
            <input name="location" defaultValue={location} placeholder="勤務地" aria-label="勤務地で絞り込み" className="h-12 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-sm text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
            <input name="salary" defaultValue={salary} placeholder="年収" aria-label="年収で絞り込み" className="h-12 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-sm text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
            <input name="employment" defaultValue={employment} placeholder="雇用形態" aria-label="雇用形態で絞り込み" className="h-12 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-sm text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
            <select name="remote" defaultValue={remote} className="h-12 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-sm text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15">
              <option value="">リモート可</option>
              <option value="yes">あり</option>
              <option value="no">なし</option>
            </select>
            <select name="totalRank" defaultValue={totalRank} className="h-12 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-sm text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15">
              <option value="">マッチ度</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
            <select name="stage" defaultValue={stage} className="h-12 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-sm text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15">
              <option value="all">選考状況</option>
              <option value="saved">保存済み</option>
              <option value="applied">応募済み</option>
              <option value="interview">面接中</option>
            </select>
            <div className="flex items-center justify-end gap-3 xl:justify-between">
              <Link href="/jobs" className="text-sm font-bold text-[#2aa33d]">条件をクリア</Link>
              <button type="submit" className="inline-flex h-12 min-w-[104px] items-center justify-center gap-2 rounded-[16px] border border-[#8fd495] bg-white px-5 text-sm font-bold text-[#1d9b38] shadow-[0_10px_20px_-24px_rgba(34,163,59,0.45)]">
                <Search className="size-4" />
                検索する
              </button>
            </div>
            <input type="hidden" name="sort" value={sort} />
          </form>
        </SectionPanel>

        <div className={`grid gap-6 ${detailsPaneHidden ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <h2 className="whitespace-nowrap text-[1.45rem] font-black tracking-tight text-[#171c20]">{sorted.length}件の求人</h2>
                <form className="flex items-center gap-2">
                  <input type="hidden" name="q" value={q} />
                  <input type="hidden" name="location" value={location} />
                  <input type="hidden" name="salary" value={salary} />
                  <input type="hidden" name="employment" value={employment} />
                  <input type="hidden" name="remote" value={remote} />
                  <input type="hidden" name="totalRank" value={totalRank} />
                  <input type="hidden" name="stage" value={stage} />
                  <select name="sort" defaultValue={sort} className="h-12 rounded-[14px] border border-[#e6e9e1] bg-white px-4 text-sm font-semibold text-[#30363c]">
                    {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <button type="submit" className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#e6e9e1] bg-white px-4 text-sm font-bold text-[#4f5a63]">
                    適用
                  </button>
                </form>
              </div>
              <div className="inline-flex items-center gap-2 rounded-[14px] border border-[#ebeee7] bg-white p-1 text-[#606a74]">
                <span className="px-2 text-sm font-semibold">表示切替:</span>
                <span className="inline-flex size-10 items-center justify-center rounded-[12px] bg-[#f5f8f1] text-[#1d9b38]"><List className="size-4" /></span>
                <span className="inline-flex size-10 items-center justify-center rounded-[12px]"><LayoutGrid className="size-4" /></span>
              </div>
            </div>

            {sorted.length === 0 ? (
              <SectionPanel className="p-8 text-center">
                <p className="text-2xl font-black text-[#191d21]">該当する求人がまだありません</p>
                <p className="mt-3 text-[#66707a]">条件を少しゆるめるか、新しい求人を保存してみてください。</p>
                <div className="mt-6">
                  <OutlineButton href="/jobs/new">新しい求人を登録する</OutlineButton>
                </div>
              </SectionPanel>
            ) : (
              <div className="space-y-2 overflow-x-auto rounded-[18px] border border-[#e5e9e4] bg-white p-2">
                <div className="grid min-w-[1040px] grid-cols-[minmax(260px,2fr)_120px_140px_110px_90px_64px_repeat(4,82px)] gap-3 px-5 py-3 text-xs font-bold text-[#69727b]">
                  <span>企業名・職種</span><span>勤務地</span><span>給与</span><span>更新日</span><span>マッチ度</span><span>★</span><span>求人チェック</span><span>企業研究</span><span>レジュメAI</span><span>AI面接</span>
                </div>
                {sorted.map((job, index) => {
                  const displayCompanyName = job.parsed?.companyName.value ?? job.companyName ?? "会社名不明";
                  const displayTitle = job.parsed?.title.value ?? job.title ?? "職種不明";
                  const score = getMatchScoreFromRank(job.latest?.totalRank ?? null);
                  return (
                    <SectionPanel key={job.id} className={`group relative overflow-hidden rounded-[16px] p-0 transition hover:border-[#cfd8cf] hover:bg-[#fcfdfb] ${selectedJob?.id === job.id ? "ring-2 ring-[#bce3bf]" : ""}`}>
                      <Link href={`/jobs/${job.id}`} className="absolute inset-0 z-10" aria-label={`${displayCompanyName} ${displayTitle} の詳細を見る`} />
                      <div className="relative grid min-w-[1040px] grid-cols-[minmax(260px,2fr)_120px_140px_110px_90px_64px_repeat(4,82px)] items-center gap-3 px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <CompanyMark label={displayCompanyName} tone={index} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#252a2f]">{displayCompanyName}</p>
                            <p className="mt-1 truncate text-sm text-[#5f6872]">{displayTitle}</p>
                          </div>
                        </div>
                        <p className="text-sm text-[#4f5963]">{job.parsed?.workAddress.value ?? job.workAddress ?? "未記載"}</p>
                        <p className="truncate text-sm font-semibold text-[#30363c]">{job.parsed?.salaryText.value ?? "未記載"}</p>
                        <p className="text-sm tabular-nums text-[#606a74]">{formatDate(job.updatedAt ?? job.createdAt)}</p>
                        <span className={`justify-self-start rounded-[10px] px-3 py-2 text-sm font-black ${score >= 80 ? "bg-[#d9f3dd] text-[#217d34]" : score >= 70 ? "bg-[#eef3bc] text-[#686d16]" : "bg-[#fff0a9] text-[#75620c]"}`}>{score}%</span>
                        <form action={toggleJobFavoriteAction.bind(null, job.id)} className="relative z-20 text-center">
                          <button type="submit" aria-label={job.isFavorite ? "お気に入りから外す" : "お気に入りに追加"} className="inline-flex size-10 items-center justify-center rounded-full text-xl text-[#20252a] transition hover:bg-[#f0f3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2a9c47]">{job.isFavorite ? "★" : "☆"}</button>
                        </form>
                        <div className="text-center text-xs text-[#5e6871]"><span className="mx-auto mb-1 flex size-6 items-center justify-center rounded-full border border-[#272d32]">✓</span>求人チェック</div>
                        <div className="text-center text-xs text-[#5e6871]"><span className="mx-auto mb-1 block size-6 rounded-full border-2 border-[#dce1e3] border-r-[#2a9c47]" />企業研究</div>
                        <div className="text-center text-xs text-[#5e6871]"><span className="mx-auto mb-1 block size-6 rounded-full border-2 border-[#dce1e3]" />レジュメAI</div>
                        <div className="text-center text-xs text-[#5e6871]"><span className="mx-auto mb-1 block size-6 rounded-full border-2 border-[#dce1e3]" />AI面接</div>
                      </div>
                    </SectionPanel>
                  );
                })}
              </div>
            )}
          </div>

          {detailsPaneHidden ? null : (
          <div className="space-y-5">
            <SectionPanel className="p-5">
              <h2 className="text-[1.8rem] font-black tracking-tight text-[#171c20]">保存した求人のサマリー</h2>
              <div className="mt-5 grid gap-5 xl:grid-cols-[160px_minmax(0,1fr)] xl:items-center">
                <ScoreRing score={averageScore} label="平均マッチ度" size={132} />
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-[#2f343a]"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#2faa45]" /> 高マッチ（70%以上）</span><span>{highMatchCount}件</span></div>
                  <div className="flex items-center justify-between text-sm font-semibold text-[#2f343a]"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e6b927]" /> 中マッチ（40〜69%）</span><span>{midMatchCount}件</span></div>
                  <div className="flex items-center justify-between text-sm font-semibold text-[#2f343a]"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#ff8c25]" /> 低マッチ（〜39%）</span><span>{lowMatchCount}件</span></div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <TinyStatCard label="保存済み" value={`${savedCount}件`} />
                <TinyStatCard label="応募済み" value={`${appliedCount}件`} />
                <TinyStatCard label="面接中" value={`${interviewCount}件`} />
              </div>
              <div className="mt-5 text-center">
                <Link href="/criteria" className="inline-flex items-center gap-2 text-sm font-bold text-[#1d9b38]">保存した求人を比較する <ChevronRight className="size-4" /></Link>
              </div>
            </SectionPanel>

            <SectionPanel className="overflow-hidden p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[1.8rem] font-black tracking-tight text-[#171c20]">選択中の求人</h2>
                <span className="text-sm font-semibold text-[#5f6872]">{selectedJob ? "詳細表示中" : "未選択"}</span>
              </div>
              <div className="mt-2 flex justify-center">
                <div className="relative h-[210px] w-[230px]">
                  <Image src={fileThumbsUp} alt="比較ガイドのキャラクター" fill className="object-contain object-bottom" />
                </div>
              </div>
              <p className="-mt-1 text-center text-[1.85rem] font-black tracking-tight text-[#1c2126]">求人を選択して比較しましょう</p>
              <p className="mt-2 text-center text-sm leading-7 text-[#69737c]">カードをクリックすると求人詳細を開いて、そのまま比較や応募管理に進めます。</p>
              {selectedJob ? (
                <Link href={`/jobs/${selectedJob.id}`} className="mt-6 inline-flex w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#dcefd8_0%,#cee7c8_100%)] px-5 py-4 text-base font-bold text-[#1b8c34]">
                  選択中の求人を見る
                </Link>
              ) : (
                <div className="mt-6 inline-flex w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#dfe8d7_0%,#d5dfcd_100%)] px-5 py-4 text-base font-bold text-[#95a090]">一覧から1件開く</div>
              )}
            </SectionPanel>
          </div>
          )}
        </div>

          <SectionPanel className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#4f5a63]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#edf7e7] text-[#249b3a]">✓</span>
            らくしゅうのAIがあなたの希望に合う求人を自動でスコアリングしています。条件を保存すると、より精度の高いおすすめが届きます。
          </div>
          <OutlineButton href="/criteria">希望条件を見直す</OutlineButton>
        </SectionPanel>
      </div>
    </AppMockSidebarShell>
  );
}
