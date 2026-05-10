"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { DEFAULT_RANK_SETTINGS, parseJobText, scoreParsedJob } from "@/lib/analysis";

const initialText = "";
const demoSampleText = `株式会社サンプルテック
【WEBエンジニア】自社サービスの開発・運用を担当。

必須要件：
・Webアプリケーション開発経験3年以上
・チームでの開発経験

給与：月給28万円〜（固定残業代45時間分、70,000円を含む）
※超過分は別途支給

年間休日125日
完全週休2日制（土日祝）
有給休暇、夏季休暇、年末年始休暇、慶弔休暇
社会保険完備、交通費支給、住宅手当、資格取得支援制度、
書籍購入補助、リモートワーク可`;

function formatYen(value: number | null) {
  if (value == null) return "不明";
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatHours(value: number | null, status: "found" | "none" | "unknown") {
  if (status === "none") return "なし";
  if (value == null) return "不明";
  return `${Math.trunc(value)}時間`;
}

function formatDays(value: number | null) {
  if (value == null) return "不明";
  return `${value}日`;
}

export function HomeDemo() {
  const [rawText, setRawText] = useState(initialText);
  const deferredText = useDeferredValue(rawText);
  const parsed = parseJobText(deferredText);
  const scored = scoreParsedJob(parsed);

  const badges = [
    { title: "総合ランク", value: scored.totalRank, text: "働きやすさを客観的に可視化" },
    { title: "検出警告", value: `${parsed.warnings.value?.length ?? 0}件`, text: "見落としがちなリスクに気づける" },
    { title: "チェック項目を自動評価", value: "✓", text: "5つの観点から総合的に判定" }
  ];

  const criteria = [
    ["固定残業の閾値", `A: ～${DEFAULT_RANK_SETTINGS.fixedOvertime.aMaxHours}時間`, `C: ～${DEFAULT_RANK_SETTINGS.fixedOvertime.cMaxHours}時間`, `D: ～${DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours}時間超`],
    ["年間休日の閾値", `S: ${DEFAULT_RANK_SETTINGS.annualHolidays.sMinDays}日以上`, `A: ${DEFAULT_RANK_SETTINGS.annualHolidays.aMinDays}日以上`, `C: ${DEFAULT_RANK_SETTINGS.annualHolidays.cMinDays}日以上`],
    ["休日制度の判定", "完全週休2日制を高評価", "週休2日制は中評価", "記載なしは不明扱い"],
    ["福利厚生の判定", "項目数＋住宅/社宅を加点", "合計点でランク化", "証跡を保持して表示"]
  ];

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6 px-4 py-8 text-[#123052] lg:px-8">
      <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-8 shadow-sm lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#e9f8f6] px-4 py-2 text-sm font-semibold text-[#0f9d9a]"><Sparkles className="size-4"/>求人をランクで見極める就活ワークスペース</p>
            <h1 className="mt-5 text-4xl font-black leading-tight">求人をランク付けして、<br/>そのまま就活の整理まで進める</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">求人票を入力するだけで、休日・福利厚生・固定残業などを自動で解析。客観的なランクで見極めて、気になる求人だけを保存・管理できます。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#18a9a3] px-6 py-3 font-bold text-white">ランク付けを試す（無料）<ArrowRight className="size-4"/></Link>
              <Link href="/criteria" className="inline-flex items-center rounded-xl border border-[#9ac3d7] px-6 py-3 font-bold text-[#163861]">基準の仕組みを見る</Link>
            </div>
            <p className="mt-3 text-sm text-slate-500">保存・応募状況の管理にはログインが必要です</p>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black">らくしゅうで得られること</h2>
            {badges.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-[#f7fbfd] p-4">
                <p className="text-lg font-bold text-[#1f446d]">{item.title} <span className="text-[#0ea5a1]">{item.value}</span></p>
                <p className="text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {["求人をランク付け", "基準を作る・借りる", "良い求人だけ保存"].map((t, i) => (
          <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-[#13a9a4]">{i + 1}</p>
            <p className="mt-1 text-lg font-bold">{t}</p>
            <p className="mt-2 text-sm text-slate-600">{i===0?"求人票を入力すると自動で解析して5つの観点からランク付けします。":i===1?"自分の基準を作ったり、公開されている基準を使えます。":"気になる求人だけを保存して、就活の整理と管理を進められます。"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-bold">① 求人票のテキストを入力</p>
          <textarea value={rawText} onChange={(e)=>setRawText(e.target.value)} rows={15} className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="求人票テキストを入力" />
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-[#18a9a3] px-4 py-2 text-sm font-bold text-white" onClick={()=>setRawText(demoSampleText)}>サンプル文を入力</button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold" onClick={()=>setRawText("")}>クリア</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-bold">② 解析結果（デモ）</p>
          <div className="mt-3 rounded-xl bg-[#eff8f8] p-4 text-center">
            <p className="text-sm">総合ランク</p>
            <p className="text-6xl font-black text-[#18a9a3]">{scored.totalRank}</p>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between rounded-lg border p-2"><span>固定残業ランク</span><span>{scored.fixedOvertimeRank}</span></div>
            <div className="flex justify-between rounded-lg border p-2"><span>年間休日ランク</span><span>{scored.holidayRank}</span></div>
            <div className="flex justify-between rounded-lg border p-2"><span>休日制度ランク</span><span>{scored.holidayTypeRank}</span></div>
            <div className="flex justify-between rounded-lg border p-2"><span>福利厚生ランク</span><span>{scored.benefitRank}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-bold">③ 抽出された主な情報</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between border-b pb-1"><span>会社名</span><span>{parsed.companyName.value ?? "不明"}</span></div>
            <div className="flex justify-between border-b pb-1"><span>職種</span><span>{parsed.title.value ?? "不明"}</span></div>
            <div className="flex justify-between border-b pb-1"><span>基本給（最小）</span><span>{formatYen(parsed.baseSalaryMin.value)}</span></div>
            <div className="flex justify-between border-b pb-1"><span>固定残業時間</span><span>{formatHours(parsed.fixedOvertimeHours.value, parsed.fixedOvertimeHours.status)}</span></div>
            <div className="flex justify-between border-b pb-1"><span>固定残業代</span><span>{formatYen(parsed.fixedOvertimePay.value)}</span></div>
            <div className="flex justify-between border-b pb-1"><span>年間休日</span><span>{formatDays(parsed.annualHolidays.value)}</span></div>
            <div className="pt-1 text-red-600">⚠ {parsed.warnings.value?.join(" / ") || "警告なし"}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xl font-black">らくしゅうの判断基準（一例）</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {criteria.map((row) => (
              <div key={row[0]} className="rounded-xl bg-[#f8fbfd] p-3 text-sm">
                <p className="font-bold">{row[0]}</p>
                <p className="mt-1 text-slate-600">{row[1]}</p><p className="text-slate-600">{row[2]}</p><p className="text-slate-600">{row[3]}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-black">良い求人だけを保存して、就活をもっとスマートに</p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 text-[#18a9a3]"/>良い求人だけ保存して管理</div>
            <div className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 text-[#18a9a3]"/>気になる求人だけ残す</div>
            <div className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 text-[#18a9a3]"/>応募状況を記録する</div>
            <div className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 text-[#18a9a3]"/>次の確認日を置いておく</div>
          </div>
        </div>
      </div>
    </section>
  );
}
