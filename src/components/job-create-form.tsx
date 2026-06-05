"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Gift, Globe, Info, Link2, MapPin, ShieldCheck, Sparkles, Wallet, BriefcaseBusiness, Clock3, LoaderCircle } from "lucide-react";

import checklistMagnifier from "../../UI-mock/jobs/new/character/rakumo-checklist-magnifier-Photoroom.png";
import { createJobAction, type JobActionState } from "@/actions/job-actions";
import { parseJobText, scoreParsedJob } from "@/lib/analysis";
import { AnalysisLimitModal } from "@/components/analysis-limit-modal";
import { ScoreRing, SectionPanel } from "@/components/jobs/jobs-mock-ui";

const initialState: JobActionState = {
  status: "idle"
};

const sampleText = `【職種名】シニアソフトウェアエンジニア（バックエンド）
【仕事内容】自社プロダクトのバックエンド開発・運用をお任せします。大規模なSaaSプロダクトのアーキテクチャ設計から、設計・開発・テスト・リリース・運用保守まで一貫して担当いただきます。
【主な業務】
・新機能の設計・開発・テスト・リリース
・既存システムの改善・リファクタリング
・スクラム開発でのチーム連携
【必須スキル】
・Webアプリケーション開発経験（3年以上）
・Python / Go / Java / Node.js いずれかの経験
・RDB / PostgreSQL / MySQL の利用経験
【勤務地】東京都渋谷区（原則リモートワーク、週1〜2回出社）
【雇用形態】正社員
【給与】500万円〜800万円
【勤務時間】フレックスタイム制（コアタイム11:00〜15:00）
【休日】完全週休2日制（土日祝）、年間休日125日
【福利厚生】各種社会保険完備、交通費支給、書籍購入補助、リモートワーク手当、健康診断`;

function PreviewField({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#edf0e7] py-3 last:border-b-0">
      <Icon className="size-4 text-[#7e8791]" />
      <span className="text-sm font-semibold text-[#67707a]">{label}</span>
      <span className="text-right text-sm font-bold text-[#1e2429]">{value}</span>
    </div>
  );
}

function ExtractedTile({ icon: Icon, title, value }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#ebeee7] bg-white px-4 py-4 shadow-[0_8px_18px_-24px_rgba(15,23,42,0.18)]">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#f3faf1] text-[#1ea03a]">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[1rem] font-black text-[#171c20]">{title}</p>
          <p className="mt-1 text-sm text-[#67707a]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function JobCreateForm() {
  const [state, formAction, isPending] = useActionState(createJobAction, initialState);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [rawText, setRawText] = useState(sampleText);

  useEffect(() => {
    if (state.status === "error" && state.code === "analysis_limit") {
      setIsModalOpen(true);
    }
  }, [state]);

  const showAnalysisLimitModal = state.status === "error" && state.code === "analysis_limit" && isModalOpen;

  const preview = useMemo(() => {
    const text = rawText.trim().length >= 20 ? rawText : sampleText;
    const parsed = parseJobText(text);
    const scored = scoreParsedJob(parsed);
    const scoreMap: Record<string, number> = { S: 92, A: 82, B: 74, C: 61, D: 48, E: 34 };
    return {
      parsed,
      score: scoreMap[scored.totalRank] ?? 68,
      mood: (scoreMap[scored.totalRank] ?? 68) >= 80 ? "良いマッチ度が期待できます！" : (scoreMap[scored.totalRank] ?? 68) >= 60 ? "比較しながら判断しやすい求人です" : "注意点も含めて確認しましょう"
    };
  }, [rawText]);

  const extractedTiles = [
    { icon: Wallet, title: "年収・給与", value: preview.parsed.salaryText.value ?? "金額・レンジ" },
    { icon: MapPin, title: "勤務地", value: "勤務地は登録後に住所から保持" },
    { icon: BriefcaseBusiness, title: "雇用形態", value: preview.parsed.employmentType.value ?? "正社員・契約など" },
    { icon: Globe, title: "働き方", value: preview.parsed.benefits.value?.find((item) => /リモート|在宅|出社/.test(item)) ?? "リモート・出社など" },
    { icon: CalendarDays, title: "休日・休暇", value: preview.parsed.annualHolidays.value != null ? `年間 ${preview.parsed.annualHolidays.value} 日` : "年間休日・休暇制度" },
    { icon: Gift, title: "福利厚生", value: preview.parsed.benefits.value?.slice(0, 2).join(" / ") || "手当・制度・補助" },
    { icon: Sparkles, title: "賞与", value: preview.parsed.bonusCount.value != null ? `年 ${preview.parsed.bonusCount.value} 回` : "賞与制度・回数" },
    { icon: CheckCircle2, title: "退職金・住宅系", value: preview.parsed.retirementAllowance.status === "found" ? "退職金あり" : preview.parsed.housingAllowance.status === "found" ? "住宅手当あり" : "退職金・住宅手当" },
    { icon: Clock3, title: "残業時間", value: preview.parsed.fixedOvertimeHours.value != null ? `月 ${preview.parsed.fixedOvertimeHours.value} 時間前後` : "平均残業時間など" }
  ];

  return (
    <>
      <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-5">
          <SectionPanel className="p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-[2rem] font-black tracking-tight text-[#171c20]">1. 求人本文を貼り付け</h2>
                <span className="inline-flex rounded-full bg-[#eef9ec] px-3 py-1 text-sm font-bold text-[#249a39]">必須</span>
              </div>
              <label className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#ebeee7] bg-white px-4 py-3 lg:w-[360px]">
                <span className="shrink-0 text-sm font-semibold text-[#4f5963]">求人URL（任意）</span>
                <input name="sourceUrl" placeholder="https://example.com/recruit/123456" className="min-w-0 flex-1 bg-transparent text-sm text-[#1f252a] outline-none" />
                <Link2 className="size-4 shrink-0 text-[#7e8791]" />
              </label>
            </div>

            <textarea
              name="rawText"
              required
              minLength={20}
              rows={18}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              className="mt-5 min-h-[34rem] w-full rounded-[18px] border border-[#86d58a] bg-white px-5 py-4 text-[1rem] leading-8 text-[#1c2227] outline-none focus:ring-4 focus:ring-[#86d58a]/15"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-3 text-[#62707a]">
                <span>文字数: <strong className="text-[#229b39]">{rawText.length.toLocaleString()}</strong> 文字</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eef9ec] px-3 py-1 font-semibold text-[#249a39]"><ShieldCheck className="size-4" /> 個人情報は自動で除外</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-3 py-1 font-semibold text-[#2f7df6]"><Info className="size-4" /> 公開されません</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setRawText(sampleText)} className="rounded-[16px] border border-[#e4e9df] bg-white px-6 py-3 text-base font-bold text-[#2f363d]">サンプルを入力</button>
                <button type="button" onClick={() => setRawText("")} className="rounded-[16px] border border-[#e4e9df] bg-white px-6 py-3 text-base font-bold text-[#2f363d]">クリア</button>
                <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-[16px] bg-[#2aa63d] px-7 py-3 text-base font-black text-white shadow-[0_14px_28px_-22px_rgba(42,166,61,0.8)] disabled:opacity-60">
                  {isPending ? <LoaderCircle className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                  {isPending ? "AIで解析中..." : "AIで解析する"}
                </button>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel className="p-4 lg:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[1.25rem] font-black tracking-tight text-[#171c20]">2. 追加情報（任意）</h3>
                <p className="mt-1 text-sm text-[#67707a]">あとで比較精度を上げたいときだけ入力します。</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-bold text-[#2f363c]">会社名（任意）</span>
                <input name="companyName" className="h-12 w-full rounded-[14px] border border-[#e6e9e1] px-4 text-sm outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-[#2f363c]">職種（任意）</span>
                <input name="title" className="h-12 w-full rounded-[14px] border border-[#e6e9e1] px-4 text-sm outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-[#2f363c]">情報元（任意）</span>
                <input name="sourceName" className="h-12 w-full rounded-[14px] border border-[#e6e9e1] px-4 text-sm outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-[#2f363c]">勤務地住所（任意）</span>
                <input name="workAddress" className="h-12 w-full rounded-[14px] border border-[#e6e9e1] px-4 text-sm outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-[#2f363c]">最寄り駅（任意）</span>
                <input name="nearestStation" className="h-12 w-full rounded-[14px] border border-[#e6e9e1] px-4 text-sm outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-[#2f363c]">参考通勤時間（分・任意）</span>
                <input name="commuteMinutes" type="number" min={1} max={240} className="h-12 w-full rounded-[14px] border border-[#e6e9e1] px-4 text-sm outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[#67707a]">
              <p className="flex items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0 text-[#6d7882]" /> 求人本文は 20 文字以上で入力してください</p>
              <p className="flex items-start gap-2"><Info className="mt-0.5 size-4 shrink-0 text-[#6d7882]" /> URL は入力する場合のみ正しい形式で入力します</p>
            </div>
            {state.status === "error" && state.code !== "analysis_limit" ? <p className="mt-4 text-sm font-medium text-rose-700">{state.message}</p> : null}
          </SectionPanel>

          <SectionPanel className="p-5 lg:p-6">
            <h3 className="text-[1.6rem] font-black tracking-tight text-[#171c20]">解析後に抽出される項目</h3>
            <p className="mt-2 text-sm text-[#67707a]">自動で整理される予定の情報です。アイコンは mock 専用素材が未提供のため、近い意味のものを代替で使っています。</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {extractedTiles.map((tile) => (
                <ExtractedTile key={tile.title} icon={tile.icon} title={tile.title} value={tile.value} />
              ))}
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel className="p-5">
            <h3 className="text-[1.7rem] font-black tracking-tight text-[#171c20]">AIプレビュー（解析イメージ）</h3>
            <div className="mt-5 grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-center">
              <ScoreRing score={preview.score} label="予測マッチ度" size={146} />
              <div>
                <div className="rounded-[14px] bg-[#f2faf0] px-4 py-3 text-sm font-bold text-[#2c9f3d]">{preview.mood}</div>
                <div className="mt-3 rounded-[18px] border border-[#edf0e7] bg-white px-4 py-2">
                  <PreviewField icon={Wallet} label="年収・給与" value={preview.parsed.salaryText.value ?? "未抽出"} />
                  <PreviewField icon={MapPin} label="勤務地" value="登録後に勤務地住所へ反映" />
                  <PreviewField icon={BriefcaseBusiness} label="雇用形態" value={preview.parsed.employmentType.value ?? "未抽出"} />
                  <PreviewField icon={Globe} label="働き方" value={preview.parsed.benefits.value?.find((item) => /リモート|在宅|出社/.test(item)) ?? "要確認"} />
                  <PreviewField icon={CalendarDays} label="休日・休暇" value={preview.parsed.annualHolidays.value != null ? `${preview.parsed.annualHolidays.value}日` : "要確認"} />
                </div>
                <div className="mt-4 rounded-[16px] border border-[#d6ead2] bg-white px-5 py-3 text-center text-sm font-bold text-[#1f9c39]">詳細な解析結果を表示する →</div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel className="p-5">
            <h3 className="text-[1.7rem] font-black tracking-tight text-[#171c20]">登録までの3ステップ</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "貼り付け", "求人本文を貼る"],
                ["2", "解析", "AIが自動で整理"],
                ["3", "保存・比較", "保存して比較する"]
              ].map(([step, title, body]) => (
                <div key={step} className="rounded-[18px] border border-[#ebeee7] bg-white px-4 py-4 text-center">
                  <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-[#2aa63d] text-sm font-black text-white">{step}</div>
                  <p className="mt-3 text-[1rem] font-black text-[#171c20]">{title}</p>
                  <p className="mt-1 text-sm text-[#67707a]">{body}</p>
                </div>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel className="relative overflow-hidden p-5">
            <div className="max-w-[12rem] rounded-[18px] border border-[#cfe8c8] bg-white px-4 py-3 text-[1rem] font-bold leading-6 text-[#283037] shadow-[0_10px_20px_-20px_rgba(15,23,42,0.2)]">求人本文を貼るだけでOK！</div>
            <p className="mt-4 max-w-[13rem] text-sm leading-7 text-[#67707a]">AIが自動で項目を抽出して、あなたの希望条件と比較してくれるよ。</p>
            <div className="absolute bottom-0 right-1 h-[196px] w-[196px]">
              <Image src={checklistMagnifier} alt="ガイドキャラクター" fill className="object-contain object-right-bottom" />
            </div>
          </SectionPanel>

          <SectionPanel className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef9ec] text-[#259c39]"><ShieldCheck className="size-5" /></div>
              <div>
                <h3 className="text-[1.5rem] font-black tracking-tight text-[#171c20]">安心してご利用いただけます</h3>
                <p className="mt-3 text-sm leading-7 text-[#67707a]">貼り付けた求人内容はあなたのアカウント内でのみ解析され、第三者には公開されません。AIが自動で個人情報を検出・除外します。</p>
                <p className="mt-4 text-sm font-bold text-[#1f9c39]">プライバシーポリシーを見る →</p>
              </div>
            </div>
          </SectionPanel>
        </div>
      </form>

      {showAnalysisLimitModal ? <AnalysisLimitModal message={state.message} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
