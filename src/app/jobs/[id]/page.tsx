import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChevronRight, CircleAlert, Clock3, Gift, MapPin, Pencil, ShieldAlert, Trash2, Wallet } from "lucide-react";

import fileThumbsUp from "../../../../UI-mock/jobs/character/rakumo-file-thumbs-up-Photoroom.png";
import { AppMockSidebarShell } from "@/components/app-mock-sidebar-shell";
import { buildMissingItemSummary } from "@/lib/analysis/missing-items";
import { parseStoredMissingItemSummary } from "@/lib/analysis/storage";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { JobDeleteForm } from "@/components/job-delete-form";
import { ScoreRing, SectionPanel, MatchBar, CompanyMark, JobMetaChip, OutlineButton } from "@/components/jobs/jobs-mock-ui";
import { getChecklistItems } from "@/components/jobs/JobCheckList";
import { MissingItemStatusExplainer } from "@/components/missing-item-status-explainer";
import { SelectionProgressForm } from "@/components/selection-progress-form";
import { requireUser } from "@/lib/auth/require-user";
import { formatCommuteRangeDetail } from "@/lib/commute/fields";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { db } from "@/lib/db/client";
import { aiInterviewSessions, companyResearches, jobs, resumeProfiles } from "@/lib/db/schema";
import { getLatestAnalysesByJobIds } from "@/lib/jobs/latest-analyses";
import { buildAnalysisNotes, buildRankReasonLabel, formatDateInputValue, formatMetricValue, getCompareBars, getMatchScoreFromRank, getMissingAwareText } from "@/lib/jobs/mock-helpers";

export const dynamic = "force-dynamic";

function ExtractInfoCard({ icon: Icon, label, value, subvalue }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; subvalue?: string }) {
  return (
    <div className="rounded-[20px] border border-[#ebeee7] bg-white px-4 py-4 shadow-[0_8px_18px_-24px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-[#f4faf2] text-[#1f9f3a]"><Icon className="size-5" /></div>
        <div>
          <p className="text-sm font-semibold text-[#6d7680]">{label}</p>
          <p className="mt-1 text-[1.55rem] font-black leading-tight text-[#171c20]">{value}</p>
          {subvalue ? <p className="mt-2 text-sm text-[#67707a]">{subvalue}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default async function JobDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [{ deleteJobAction }, user] = await Promise.all([
    import("@/actions/job-actions"),
    requireUser()
  ]);
  const { id } = (await params) ?? {};
  if (!id) notFound();

  const job = (await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, user.id))).limit(1))[0];
  if (!job) notFound();

  const latest = (await getLatestAnalysesByJobIds([job.id])).get(job.id) ?? null;
  const parsed = parseStoredParsedJob(latest?.evidenceJson, `job-detail:${job.id}`);
  const warnings = parsed?.warnings.value ?? [];
  const missingSummary = parseStoredMissingItemSummary(latest?.missingItemSummaryJson) ?? (parsed ? buildMissingItemSummary(parsed, null) : null);
  const checklist = getChecklistItems(parsed ?? null, missingSummary);
  const notes = buildAnalysisNotes(parsed ?? null, warnings, missingSummary ?? undefined);
  const rankReasonLabel = missingSummary ? buildRankReasonLabel(missingSummary, warnings) : null;
  const score = getMatchScoreFromRank(latest?.totalRank ?? null);
  const compareBars = getCompareBars({
    latest: latest ? { salaryRank: latest.salaryRank, holidayRank: latest.holidayRank, benefitRank: latest.benefitRank, totalRank: latest.totalRank } : null,
    parsed,
    commuteMinutes: job.commuteMinutes,
    commuteMinutesTypical: job.commuteMinutesTypical,
    warnings
  });

  const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
  const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";
  const requestedTab = (await searchParams).tab ?? "checker";
  const activeTab = ["checker", "research", "resume", "interview"].includes(requestedTab) ? requestedTab : "checker";
  const [researchRecord, resumeRecord, interviewRecord] = await Promise.all([
    db.select({ id: companyResearches.id }).from(companyResearches).where(and(eq(companyResearches.userId, user.id), eq(companyResearches.companyName, displayCompanyName))).limit(1),
    db.select({ id: resumeProfiles.id }).from(resumeProfiles).where(eq(resumeProfiles.userId, user.id)).limit(1),
    db.select({ id: aiInterviewSessions.id }).from(aiInterviewSessions).where(and(eq(aiInterviewSessions.userId, user.id), eq(aiInterviewSessions.targetCompany, displayCompanyName))).limit(1)
  ]);
  const workspaceTabs = [
    { key: "checker", label: "求人チェック", done: true, href: `/jobs/${job.id}` },
    { key: "research", label: "企業研究", done: researchRecord.length > 0, href: `/jobs/${job.id}?tab=research` },
    { key: "resume", label: "レジュメAI", done: resumeRecord.length > 0, href: `/jobs/${job.id}?tab=resume` },
    { key: "interview", label: "AI面接", done: interviewRecord.length > 0, href: `/jobs/${job.id}?tab=interview` }
  ] as const;
  const activeWorkspaceTab = workspaceTabs.find((tab) => tab.key === activeTab) ?? workspaceTabs[0];
  const normalizeRank = (rank: string | null | undefined) => ["S", "A", "B", "C", "D"].includes(rank ?? "") ? rank as "S" | "A" | "B" | "C" | "D" : "D";
  const rankItems = [
    { label: "固定残業時間", rank: normalizeRank(latest?.salaryRank), detail: parsed?.fixedOvertimeHours.value != null ? `${parsed.fixedOvertimeHours.value}時間` : "本文未記載" },
    { label: "年間休日", rank: normalizeRank(latest?.holidayRank), detail: parsed?.annualHolidays.value != null ? `${parsed.annualHolidays.value}日` : "本文未記載" },
    { label: "休日制度", rank: normalizeRank(latest?.holidayTypeRank), detail: parsed?.holidayType.value ?? "本文未記載" },
    { label: "賞与制度", rank: normalizeRank(latest?.bonusRank), detail: parsed?.bonusCount.value != null ? `年${parsed.bonusCount.value}回` : "本文未記載" },
    { label: "退職金", rank: normalizeRank(latest?.retirementAllowanceRank), detail: parsed?.retirementAllowance.status === "found" ? "制度あり" : "本文未記載" },
    { label: "福利厚生", rank: normalizeRank(latest?.benefitRank), detail: parsed?.benefits.value?.length ? `${parsed.benefits.value.length}項目` : "本文未記載" }
  ];

  const extractCards = [
    { icon: Wallet, label: "年収・給与", value: parsed?.salaryText.value ?? "不明", subvalue: parsed?.baseSalaryMin.value ? `月給換算の基準: ${formatMetricValue(parsed.baseSalaryMin.value, "円")}` : undefined },
    { icon: MapPin, label: "勤務地", value: parsed?.workAddress.value ?? job.workAddress ?? "不明", subvalue: parsed?.workAddress.value ?? job.workAddress ? `${parsed?.workAddress.value ?? job.workAddress}${job.nearestStation ? ` / ${job.nearestStation}` : ""}` : formatCommuteRangeDetail(job) },
    { icon: BriefcaseBusiness, label: "雇用形態", value: parsed?.employmentType.value ?? getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "employmentType"), subvalue: parsed?.employmentType.evidence ?? undefined },
    { icon: Clock3, label: "残業時間", value: parsed?.fixedOvertimeHours.value != null ? `月 ${parsed.fixedOvertimeHours.value} 時間程度` : getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "fixedOvertimeHours"), subvalue: parsed?.fixedOvertimeHours.status === "none" ? "固定残業制度は見当たりませんでした" : "平均残業時間の目安" },
    { icon: CalendarDays, label: "休日・休暇", value: parsed?.annualHolidays.value != null ? `年間 ${parsed.annualHolidays.value} 日` : getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "annualHolidays"), subvalue: parsed?.holidayType.value ?? "完全週休2日制など" },
    { icon: Gift, label: "福利厚生", value: parsed?.benefits.value && parsed?.benefits.value.length > 0 ? "充実" : "要確認", subvalue: parsed?.benefits.value?.slice(0, 3).join(" / ") || "住居手当・資格支援など" },
    { icon: CalendarDays, label: "賞与", value: parsed?.bonusCount.value != null ? `年 ${parsed.bonusCount.value} 回` : getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "bonusCount"), subvalue: parsed?.bonusPerformanceLinked.status === "found" ? "業績連動あり" : "賞与制度の回数" },
    { icon: Gift, label: "退職金・住宅系", value: parsed?.retirementAllowance.status === "found" ? "退職金あり" : parsed?.housingAllowance.status === "found" ? "住宅手当あり" : "要確認", subvalue: parsed?.companyHousing.status === "found" ? "社宅制度あり" : "住居支援・退職金制度" }
  ];

  return (
    <AppMockSidebarShell activeKey="saved-jobs" frameClassName="jobs-mock-surface">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-7">
        <Link href={`/jobs?selected=${job.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#1f9d39]">
          <ArrowLeft className="size-4" />
          求人一覧に戻る
        </Link>

        <div className="overflow-x-auto rounded-[18px] border border-[#e5e9e4] bg-white p-2 shadow-[0_14px_30px_-28px_rgba(15,23,42,.25)]" role="tablist" aria-label={`${displayCompanyName}の選考準備`}>
          <div className="grid min-w-[720px] grid-cols-4 gap-2">
            {workspaceTabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                role="tab"
                aria-selected={activeWorkspaceTab.key === tab.key}
                className={`flex items-center justify-between rounded-[13px] px-4 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f9d39] ${activeWorkspaceTab.key === tab.key ? "bg-[#151719] text-white" : "text-[#4f5963] hover:bg-[#f4f6f3]"}`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] ${tab.done ? "bg-[#e5f5e7] text-[#23833a]" : "bg-[#f0f1f2] text-[#7a828a]"}`}>{tab.done ? "完了" : "未実施"}</span>
              </Link>
            ))}
          </div>
        </div>

        {activeWorkspaceTab.key !== "checker" ? (
          <SectionPanel className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a838c]">Next step</p>
              <h2 className="mt-2 text-[1.65rem] font-black text-[#171c20]">{activeWorkspaceTab.label}{activeWorkspaceTab.done ? "の結果があります" : "はまだ行われていません"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#66707a]">{activeWorkspaceTab.done ? "保存済みの内容を確認し、次の準備へ進めます。" : "この企業の情報を引き継いで開始できます。必要な入力を最小限にして、選考準備を一つずつ進めましょう。"}</p>
            </div>
            <Link href={activeWorkspaceTab.key === "research" ? `/company-research?jobId=${job.id}` : activeWorkspaceTab.key === "resume" ? `/resume?jobId=${job.id}` : `/ai-interview?jobId=${job.id}`} className="inline-flex h-12 shrink-0 items-center justify-center rounded-[13px] bg-[#17191b] px-6 text-sm font-black text-white">
              {activeWorkspaceTab.done ? `${activeWorkspaceTab.label}を開く` : `${activeWorkspaceTab.label}を始める`}
            </Link>
          </SectionPanel>
        ) : null}

        {activeWorkspaceTab.key === "checker" ? (
          <div className="contents">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px_360px] xl:items-start">
          <div className="xl:col-span-2">
            <h1 className="text-[2.15rem] font-black tracking-[-0.04em] text-[#171c20] md:text-[2.65rem]">求人チェックレポート</h1>
            <p className="mt-4 text-[1.05rem] text-[#5f6771]">AIが求人票を解析し、あなたの希望との一致度や注意点をまとめました。未記載項目は最低点寄りとして扱います。</p>
          </div>
          <div className="relative overflow-hidden rounded-[24px] border border-[#ebeee7] bg-white px-4 py-4 shadow-[0_10px_24px_-26px_rgba(15,23,42,0.18)]">
            <div className="absolute left-4 top-5 max-w-[12rem] rounded-[18px] border border-[#ebeee7] bg-white px-4 py-3 text-[1rem] font-bold leading-7 text-[#2b3238] shadow-[0_10px_20px_-20px_rgba(15,23,42,0.2)]">解析が完了しました！<br />詳細を確認して、応募判断にお役立てください。</div>
            <div className="relative ml-auto h-[232px] w-[232px]">
              <Image src={fileThumbsUp} alt="解析結果を案内するキャラクター" fill className="object-contain object-right-bottom" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <SectionPanel className="p-5 lg:p-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
                <div>
                  <div className="flex items-start gap-4">
                    <CompanyMark label={displayCompanyName} tone={1} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#6c7480]">
                        <span>{displayCompanyName}</span>
                        {job.sourceUrl ? <Link href={job.sourceUrl} target="_blank" className="inline-flex items-center gap-1 text-[#1f9d39]">外部求人 <ArrowUpRight className="size-3.5" /></Link> : null}
                      </div>
                      <h2 className="mt-2 text-[2rem] font-black tracking-tight text-[#171c20] md:text-[2.25rem]">{displayTitle}</h2>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {parsed?.employmentType.value ? <JobMetaChip>{parsed.employmentType.value}</JobMetaChip> : null}
                        {parsed?.workAddress.value ?? job.workAddress ? <JobMetaChip>{parsed?.workAddress.value ?? job.workAddress}</JobMetaChip> : null}
                        {parsed?.salaryText.value ? <JobMetaChip>{parsed.salaryText.value}</JobMetaChip> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[22px] border border-[#e8efe2] bg-[#fbfff8] px-5 py-5">
                    <p className="text-[1.25rem] font-black text-[#1d9e39]">AIサマリー</p>
                    <p className="mt-3 text-base leading-8 text-[#31383f]">{notes[0] ?? "あなたの希望と高い一致度があります。条件の強みと注意点をあわせて確認しましょう。"}</p>
                    {rankReasonLabel ? <p className="mt-3 text-sm font-bold text-[#cb7a2f]">{rankReasonLabel}</p> : null}
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#1d9e39]">もっと詳しく見る <ChevronRight className="size-4" /></div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#eef1e9] bg-white px-5 py-5 text-center">
                  <p className="text-lg font-bold text-[#2f363c]">総合マッチ度</p>
                  <div className="mt-4"><ScoreRing score={score} size={176} /></div>
                  <p className="mt-4 text-[1.25rem] font-black text-[#1f9d39]">{score >= 80 ? "良いマッチ度です！" : score >= 60 ? "比較しやすい求人です" : "慎重に見たい求人です"}</p>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel className="p-5 lg:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div><h3 className="text-[1.8rem] font-black tracking-tight text-[#171c20]">チェック基準別スコア</h3><p className="mt-2 text-sm text-[#68727c]">S 最高・A 良い・B 標準・C やや弱い・D 弱い。本文未記載はDとして最低点寄りに扱います。</p></div>
                <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-[#e5f5e7] px-3 py-1 text-[#207f35]">S 最高</span><span className="rounded-full bg-[#edf7e9] px-3 py-1 text-[#2b8840]">A 良い</span><span className="rounded-full bg-[#edf2f7] px-3 py-1 text-[#51606f]">B 標準</span><span className="rounded-full bg-[#fff4d8] px-3 py-1 text-[#9a6811]">C やや弱い</span><span className="rounded-full bg-[#fff0e8] px-3 py-1 text-[#a74f23]">D 弱い</span></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rankItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-[#e8ece6] bg-white px-4 py-4">
                    <div><p className="font-bold text-[#1d2328]">{item.label}</p><p className={`mt-1 text-sm ${item.detail === "本文未記載" ? "font-semibold text-[#b65e31]" : "text-[#6a747d]"}`}>{item.detail}</p></div>
                    <span className={`flex size-12 items-center justify-center rounded-[14px] text-xl font-black ${item.rank === "S" || item.rank === "A" ? "bg-[#e8f6e8] text-[#27823a]" : item.rank === "B" ? "bg-[#edf2f7] text-[#4f6171]" : item.rank === "C" ? "bg-[#fff3d4] text-[#986511]" : "bg-[#fff0e8] text-[#a64d22]"}`}>{item.rank}</span>
                  </div>
                ))}
              </div>
            </SectionPanel>

            <SectionPanel className="p-5 lg:p-6">
              <h3 className="text-[1.8rem] font-black tracking-tight text-[#171c20]">求人から抽出した情報</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {extractCards.map((card) => (
                  <ExtractInfoCard key={card.label} icon={card.icon} label={card.label} value={card.value} subvalue={card.subvalue} />
                ))}
              </div>
            </SectionPanel>

            <SectionPanel className="p-5 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#fff5df] text-[#f29f05]"><CircleAlert className="size-5" /></div>
                <div>
                  <h3 className="text-[1.8rem] font-black tracking-tight text-[#171c20]">注意したい表現</h3>
                  <p className="text-sm text-[#68727c]">AIが気になる表現を抽出しました。条件や文化を確認しましょう。</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {(warnings.length > 0 ? warnings : ["その他のキーワード", "柔軟な働き方", "成長志向の強い環境", "自由度の高い裁量"]).slice(0, 4).map((warning) => (
                  <div key={warning} className="rounded-[18px] border border-[#f7dfbd] bg-[#fffaf2] px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#f29f05]"><ShieldAlert className="size-4" /> 注意</div>
                    <p className="mt-3 text-base font-semibold leading-7 text-[#2f363c]">{warning}</p>
                  </div>
                ))}
              </div>
            </SectionPanel>

            <SectionPanel className="p-5 lg:p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[1.8rem] font-black tracking-tight text-[#171c20]">チェックポイント</h3>
                <span className="text-sm font-semibold text-[#67707a]">求人の見落とし防止</span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 rounded-[16px] border border-[#ebeee7] px-4 py-4">
                    <div>
                      <p className="font-bold text-[#171c20]">{item.label}</p>
                      <p className="mt-1 text-sm text-[#67707a]">{item.value}</p>
                    </div>
                    <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white ${item.tone === "good" ? "bg-[#2faa45]" : item.tone === "neutral" ? "bg-[#aeb6bf]" : "bg-[#ff9c1a]"}`}>•</span>
                  </div>
                ))}
              </div>
            </SectionPanel>
          </div>

          <div className="space-y-5">
            <SectionPanel className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[1.65rem] font-black tracking-tight text-[#171c20]">あなたの希望との比較</h3>
                <OutlineButton href="/criteria">希望条件を編集</OutlineButton>
              </div>
              <div className="mt-5 space-y-4">
                {compareBars.map((item) => (
                  <MatchBar key={item.label} label={item.label} score={item.score} tone={item.tone} />
                ))}
              </div>
              <div className="mt-5 rounded-[16px] border border-[#d7ead0] bg-white px-5 py-3 text-center text-sm font-bold text-[#1f9d39]">詳細な比較を見る <ChevronRight className="inline size-4" /></div>
            </SectionPanel>

            <SectionPanel className="p-5">
              <h3 className="text-[1.65rem] font-black tracking-tight text-[#171c20]">次のアクション</h3>
              <div className="mt-5 space-y-3">
                <Link href={`/jobs?selected=${job.id}`} className="inline-flex h-14 w-full items-center justify-center rounded-[16px] bg-[#2aa63d] px-5 text-lg font-black text-white">保存する</Link>
                <Link href={`/jobs?selected=${job.id}`} className="inline-flex h-14 w-full items-center justify-center rounded-[16px] border border-[#8fd495] bg-white px-5 text-lg font-black text-[#249a39]">求人を比較する</Link>
                <Link href={`/jobs?selected=${job.id}#progress`} className="inline-flex h-14 w-full items-center justify-center rounded-[16px] border border-[#8fd495] bg-white px-5 text-lg font-black text-[#249a39]">応募管理に追加する</Link>
              </div>
            </SectionPanel>

            <SectionPanel className="p-5">
              <div className="space-y-4">
                <h3 className="text-[1.55rem] font-black tracking-tight text-[#171c20]">進捗・管理</h3>
                <div id="progress" className="space-y-4">
                  <SelectionProgressForm
                    jobId={job.id}
                    selectionStatus={job.selectionStatus}
                    nextActionDate={formatDateInputValue(job.nextActionAt)}
                    selectionMemo={job.selectionMemo ?? ""}
                  />
                </div>
                <div className="rounded-[16px] border border-[#eef1e7] bg-[#fbfff8] p-4">
                  <MissingItemStatusExplainer title="求人結果の見方" className="bg-transparent p-0 shadow-none" />
                  {missingSummary?.thinInput ? (
                    <div className="mt-4 rounded-[16px] border border-[#ffd6bf] bg-[#fff7f1] p-4 text-sm leading-7 text-[#4d5760]">
                      この求人は採点に必要な情報の一部が本文に記載されていません。未記載項目は最低点候補として扱います。
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href={`/jobs/${job.id}/edit`} className="inline-flex h-14 w-full items-center justify-center rounded-[16px] border border-[#8fd495] bg-white px-5 text-base font-black text-[#249a39]"><Pencil className="mr-2 size-5" /> 編集する</Link>
                  <JobDeleteForm
                    action={deleteJobAction}
                    jobId={job.id}
                    buttonClassName="inline-flex h-14 w-full items-center justify-center rounded-[16px] border border-[#ff9d9d] bg-white px-5 text-base font-black text-[#ef4c4c]"
                    confirmMessage={`「${displayCompanyName}」を削除しますか？この操作は元に戻せません。`}
                  >
                    <Trash2 className="mr-2 size-5" />
                    削除
                  </JobDeleteForm>
                </div>
                <p className="text-sm leading-7 text-[#67707a]">保存した求人は一覧からまとめて管理できます。勤務地や職種が取りづらい形式は parser を継続改善中ですが、抽出できた項目はこの画面で確認しやすく整えています。</p>
              </div>
            </SectionPanel>
          </div>
        </div>
          </div>
        ) : null}
      </div>
    </AppMockSidebarShell>
  );
}
