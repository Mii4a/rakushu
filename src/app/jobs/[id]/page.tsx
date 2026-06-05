import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChevronRight, CircleAlert, Clock3, Gift, MapPin, Pencil, ShieldAlert, Trash2, Wallet } from "lucide-react";

import fileThumbsUp from "../../../../UI-mock/jobs/character/rakumo-file-thumbs-up-Photoroom.png";
import { buildMissingItemSummary } from "@/lib/analysis/missing-items";
import { parseStoredMissingItemSummary } from "@/lib/analysis/storage";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { JobDeleteForm } from "@/components/job-delete-form";
import { JobsMockHeader, JobsMockShell, ScoreRing, SectionPanel, MatchBar, CompanyMark, JobMetaChip, OutlineButton } from "@/components/jobs/jobs-mock-ui";
import { getChecklistItems } from "@/components/jobs/JobCheckList";
import { MissingItemStatusExplainer } from "@/components/missing-item-status-explainer";
import { SelectionProgressForm } from "@/components/selection-progress-form";
import { requireUser } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";
import { formatCommuteRangeDetail } from "@/lib/commute/fields";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
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

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [{ deleteJobAction }, user, session] = await Promise.all([
    import("@/actions/job-actions"),
    requireUser(),
    getSession()
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

  const displayName = session?.user?.name ?? "山田 花子";
  const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
  const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";

  const extractCards = [
    { icon: Wallet, label: "年収・給与", value: parsed?.salaryText.value ?? "不明", subvalue: parsed?.baseSalaryMin.value ? `月給換算の基準: ${formatMetricValue(parsed.baseSalaryMin.value, "円")}` : undefined },
    { icon: MapPin, label: "勤務地", value: job.workAddress ?? "不明", subvalue: job.workAddress ? `${job.workAddress}${job.nearestStation ? ` / ${job.nearestStation}` : ""}` : formatCommuteRangeDetail(job) },
    { icon: BriefcaseBusiness, label: "雇用形態", value: parsed?.employmentType.value ?? getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "employmentType"), subvalue: parsed?.employmentType.evidence ?? undefined },
    { icon: Clock3, label: "残業時間", value: parsed?.fixedOvertimeHours.value != null ? `月 ${parsed.fixedOvertimeHours.value} 時間程度` : getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "fixedOvertimeHours"), subvalue: parsed?.fixedOvertimeHours.status === "none" ? "固定残業制度は見当たりませんでした" : "平均残業時間の目安" },
    { icon: CalendarDays, label: "休日・休暇", value: parsed?.annualHolidays.value != null ? `年間 ${parsed.annualHolidays.value} 日` : getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "annualHolidays"), subvalue: parsed?.holidayType.value ?? "完全週休2日制など" },
    { icon: Gift, label: "福利厚生", value: parsed?.benefits.value && parsed?.benefits.value.length > 0 ? "充実" : "要確認", subvalue: parsed?.benefits.value?.slice(0, 3).join(" / ") || "住居手当・資格支援など" },
    { icon: CalendarDays, label: "賞与", value: parsed?.bonusCount.value != null ? `年 ${parsed.bonusCount.value} 回` : getMissingAwareText(missingSummary ?? { missingInRawText: [], ambiguousButVisible: [], thinInput: false, thinInputReason: [] }, "bonusCount"), subvalue: parsed?.bonusPerformanceLinked.status === "found" ? "業績連動あり" : "賞与制度の回数" },
    { icon: Gift, label: "退職金・住宅系", value: parsed?.retirementAllowance.status === "found" ? "退職金あり" : parsed?.housingAllowance.status === "found" ? "住宅手当あり" : "要確認", subvalue: parsed?.companyHousing.status === "found" ? "社宅制度あり" : "住居支援・退職金制度" }
  ];

  return (
    <JobsMockShell>
      <JobsMockHeader displayName={displayName} />
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-7 px-6 py-8 lg:px-10 lg:py-10">
        <Link href={`/jobs?selected=${job.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#1f9d39]">
          <ArrowLeft className="size-4" />
          求人一覧に戻る
        </Link>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px_360px] xl:items-start">
          <div className="xl:col-span-2">
            <h1 className="text-[4.8rem] font-black tracking-[-0.055em] text-[#171c20]">求人解析結果</h1>
            <p className="mt-4 text-[1.05rem] text-[#5f6771]">AIが求人票を解析し、あなたの希望との一致度や注意点をまとめました。</p>
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
                      <h2 className="mt-2 text-[2.8rem] font-black tracking-tight text-[#171c20]">{displayTitle}</h2>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {parsed?.employmentType.value ? <JobMetaChip>{parsed.employmentType.value}</JobMetaChip> : null}
                        {job.workAddress ? <JobMetaChip>{job.workAddress}</JobMetaChip> : null}
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
                <p className="text-sm leading-7 text-[#67707a]">保存した求人は「応募管理」でまとめて管理できます。なお、/jobs/[id] 専用の mock character 素材は未提供だったため、同系統の jobs character を代替使用しています。</p>
              </div>
            </SectionPanel>
          </div>
        </div>
      </div>
    </JobsMockShell>
  );
}
