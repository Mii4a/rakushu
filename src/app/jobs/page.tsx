import Image from "next/image";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { Bookmark, ChevronRight, LayoutGrid, List, Search } from "lucide-react";

import fileThumbsUp from "../../../UI-mock/jobs/character/rakumo-file-thumbs-up-Photoroom.png";
import { requireUser } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { JobsMockHeader, JobsMockShell, OutlineButton, PageAccentTitle, ScoreRing, SearchIconField, SectionPanel, TinyStatCard, CompanyMark, JobMetaChip, CompareCheckboxVisual } from "@/components/jobs/jobs-mock-ui";
import { SORT_OPTIONS, type SortKey, coerceDate, formatDate, getMatchScoreFromRank, getScoreFromRank, statusBadgeClassName, statusLabel, toSingle } from "@/lib/jobs/mock-helpers";

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

  const [user, session, params] = await Promise.all([requireUser(), getSession(), searchParams]);
  const q = (toSingle(params?.q) ?? "").trim().toLowerCase();
  const location = (toSingle(params?.location) ?? "").trim().toLowerCase();
  const salary = (toSingle(params?.salary) ?? "").trim().toLowerCase();
  const employment = (toSingle(params?.employment) ?? "").trim().toLowerCase();
  const totalRank = (toSingle(params?.totalRank) ?? "").trim().toUpperCase();
  const stage = ((toSingle(params?.stage) ?? "all").trim() as StageKey) || "all";
  const remote = (toSingle(params?.remote) ?? "").trim().toLowerCase();
  const selectedId = (toSingle(params?.selected) ?? "").trim();
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
    const displayLocation = job.workAddress ?? "";
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
      case "holidays_desc":
        return (b.parsed?.annualHolidays.value ?? -1) - (a.parsed?.annualHolidays.value ?? -1);
      case "created_desc":
      default:
        return (coerceDate(b.updatedAt ?? b.createdAt)?.getTime() ?? 0) - (coerceDate(a.updatedAt ?? a.createdAt)?.getTime() ?? 0);
    }
  });

  const displayName = session?.user?.name ?? "山田 花子";
  const totalSavedJobs = jobCountResult[0]?.count ?? 0;
  const selectedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    const single = toSingle(value);
    if (single) selectedParams.set(key, single);
  }
  const selectedJob = sorted.find((job) => job.id === selectedId) ?? null;
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
    <JobsMockShell>
      <JobsMockHeader displayName={displayName} />
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
        <PageAccentTitle
          title="保存した求人一覧"
          description="保存した求人を確認・管理できます。気になる求人を比較したり、選考状況を整理しましょう。"
          cta={<OutlineButton href="/criteria">お気に入り条件を保存</OutlineButton>}
        />

        <div className="flex flex-wrap gap-3">
          {stageTabs.map((tab) => {
            const next = new URLSearchParams(selectedParams);
            next.set("stage", tab.key);
            return (
              <Link
                key={tab.key}
                href={`/jobs?${next.toString()}`}
                className={`inline-flex items-center gap-3 rounded-t-[18px] border border-[#ebeee7] px-6 py-4 text-[1rem] font-bold ${stage === tab.key ? "border-b-[#3db347] bg-white text-[#1d9b38] shadow-[inset_0_-3px_0_0_#3db347]" : "bg-[#fbfbf7] text-[#3b434b]"}`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-[#f2f4ee] px-2.5 py-0.5 text-sm text-[#6b7480]">{tab.count}</span>
              </Link>
            );
          })}
        </div>

        <SectionPanel className="p-5 lg:p-6">
          <form className="grid gap-4 xl:grid-cols-4">
            <SearchIconField name="q" defaultValue={q} placeholder="企業名・職種・キーワードで検索" />
            <input name="location" defaultValue={location} placeholder="勤務地" className="h-14 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
            <input name="salary" defaultValue={salary} placeholder="年収" className="h-14 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
            <input name="employment" defaultValue={employment} placeholder="雇用形態" className="h-14 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
            <select name="remote" defaultValue={remote} className="h-14 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15">
              <option value="">リモート可</option>
              <option value="yes">あり</option>
              <option value="no">なし</option>
            </select>
            <select name="totalRank" defaultValue={totalRank} className="h-14 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15">
              <option value="">マッチ度</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
            <select name="stage" defaultValue={stage} className="h-14 rounded-[16px] border border-[#e6e9e1] bg-white px-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15">
              <option value="all">選考状況</option>
              <option value="saved">保存済み</option>
              <option value="applied">応募済み</option>
              <option value="interview">面接中</option>
            </select>
            <div className="flex items-center justify-end gap-4 xl:justify-between">
              <Link href="/jobs" className="text-sm font-bold text-[#2aa33d]">条件をクリア</Link>
              <button type="submit" className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-[16px] border border-[#8fd495] bg-white px-7 py-3 text-sm font-bold text-[#1d9b38] shadow-[0_10px_20px_-24px_rgba(34,163,59,0.45)]">
                <Search className="size-4" />
                検索する
              </button>
            </div>
            <input type="hidden" name="sort" value={sort} />
          </form>
        </SectionPanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-[2rem] font-black tracking-tight text-[#171c20]">{sorted.length}件の求人</h2>
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
              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {sorted.map((job, index) => {
                  const displayCompanyName = job.parsed?.companyName.value ?? job.companyName ?? "会社名不明";
                  const displayTitle = job.parsed?.title.value ?? job.title ?? "職種不明";
                  const score = getMatchScoreFromRank(job.latest?.totalRank ?? null);
                  const status = statusLabel[job.selectionStatus] ?? "保存済み";
                  const statusClass = statusBadgeClassName[job.selectionStatus] ?? statusBadgeClassName.saved;
                  return (
                    <SectionPanel key={job.id} className={`p-5 ${selectedJob?.id === job.id ? "ring-2 ring-[#bce3bf]" : ""}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <CompareCheckboxVisual checked={selectedJob?.id === job.id} />
                          <CompanyMark label={displayCompanyName} tone={index} />
                          <div>
                            <p className="text-sm text-[#5f6872]">{displayCompanyName}</p>
                            <h3 className="mt-1 text-[1.9rem] font-black leading-tight tracking-tight text-[#171c20]">{displayTitle}</h3>
                          </div>
                        </div>
                        <Bookmark className="size-5 text-[#22a33b]" />
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[1.6rem] font-black text-[#1d2329]">{job.parsed?.salaryText.value ?? "給与未記載"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {job.workAddress ? <JobMetaChip>{job.workAddress}</JobMetaChip> : null}
                            {job.parsed?.employmentType.value ? <JobMetaChip>{job.parsed.employmentType.value}</JobMetaChip> : null}
                            {job.parsed?.benefits.value?.some((item) => /リモート|在宅/.test(item)) ? <JobMetaChip>リモート可</JobMetaChip> : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#f0a100]">マッチ度</p>
                          <p className={`mt-1 text-[2rem] font-black ${score >= 70 ? "text-[#28a43c]" : score >= 50 ? "text-[#f0a100]" : "text-[#f07a23]"}`}>{score}%</p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eef1e9] pt-4">
                        <div>
                          <p className="text-sm text-[#87919a]">更新日: {formatDate(job.updatedAt ?? job.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusClass}`}>{status}</span>
                          <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-[#1f9d39]">
                            詳細
                            <ChevronRight className="size-4" />
                          </Link>
                        </div>
                      </div>
                    </SectionPanel>
                  );
                })}
              </div>
            )}
          </div>

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
                <span className="text-sm font-semibold text-[#5f6872]">{selectedJob ? "1件選択中" : "0件選択中"}</span>
              </div>
              <div className="mt-2 flex justify-center">
                <div className="relative h-[210px] w-[230px]">
                  <Image src={fileThumbsUp} alt="比較ガイドのキャラクター" fill className="object-contain object-bottom" />
                </div>
              </div>
              <p className="-mt-1 text-center text-[1.85rem] font-black tracking-tight text-[#1c2126]">求人を選択して比較しましょう</p>
              <p className="mt-2 text-center text-sm leading-7 text-[#69737c]">チェックボックスを選択すると、最大3件まで比較できます。</p>
              {selectedJob ? (
                <Link href={`/jobs/${selectedJob.id}`} className="mt-6 inline-flex w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#dcefd8_0%,#cee7c8_100%)] px-5 py-4 text-base font-bold text-[#1b8c34]">
                  選択中の求人を見る
                </Link>
              ) : (
                <div className="mt-6 inline-flex w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#dfe8d7_0%,#d5dfcd_100%)] px-5 py-4 text-base font-bold text-[#95a090]">比較する</div>
              )}
            </SectionPanel>
          </div>
        </div>

        <SectionPanel className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#4f5a63]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#edf7e7] text-[#249b3a]">✓</span>
            らくしゅうのAIがあなたの希望に合う求人を自動でスコアリングしています。条件を保存すると、より精度の高いおすすめが届きます。
          </div>
          <OutlineButton href="/criteria">希望条件を見直す</OutlineButton>
        </SectionPanel>
      </div>
    </JobsMockShell>
  );
}
