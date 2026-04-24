"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";

import { DEFAULT_RANK_SETTINGS, parseJobText, scoreParsedJob } from "@/lib/analysis";

const initialText = "";
const demoSampleTexts = [`募集職種
クラウド運用サポート

仕事内容
クラウド環境の監視・運用・障害一次対応を担当します。手順書に沿った対応から始められます。

休日・休暇
完全週休2日制（土日祝）
年間休日123日

給与
月給：260,000円
※固定残業代は10時間分18,000円、時間超過分は追加支給

福利厚生
社会保険完備
交通費全額支給
資格取得支援制度
通信費補助

会社名
青葉クラウドサポート株式会社

連絡先
採用担当`,
`募集職種
SNS運用アシスタント

仕事内容
未経験歓迎。SNS投稿、画像編集、ライブ配信サポート、数値入力などをお任せします。
アットホームな環境で若手活躍中。やりがいのある仕事です。

休日・休暇
週休2日制
年間休日108日

給与
月給：280,000円
※固定残業代は30時間分55,000円、時間超過分は追加支給

福利厚生
社会保険完備
美容クリニック割引
社員旅行

会社名
ネクストバズ株式会社

連絡先
採用担当`,
`募集職種
営業サポート

仕事内容
人物重視の採用です。成長できる環境で裁量が大きく、風通しが良い職場です。
資料作成、顧客対応、社内調整を担当します。

休日・休暇
完全週休2日制（土日）
年間休日112日

給与
月給：250,000円
固定残業代制は採用しておりません。

福利厚生
社会保険完備
交通費支給

会社名
フロントラインパートナーズ株式会社

連絡先
採用担当`,
`募集職種
カスタマーサポート

仕事内容
問い合わせ対応、データ入力、マニュアル更新などを担当します。

休日・休暇
完全週休2日制（土日祝）
年間休日130日

給与
月給：240,000円

福利厚生
社会保険完備
交通費全額支給

会社名
みなとカスタマーサービス株式会社

連絡先
採用担当`];

function formatYen(value: number | null) {
  if (value == null) return "不明";
  return `￥${value.toLocaleString("ja-JP")}`;
}

function formatHours(value: number | null, status: "found" | "none" | "unknown") {
  if (status === "none") return "固定残業制なし";
  if (value == null) return "不明";

  const hours = Math.trunc(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatDays(value: number | null) {
  if (value == null) return "不明";
  return `${value}日`;
}

function formatExtractedValue(value: string | number | boolean | string[] | null | undefined) {
  if (value == null) return "不明";
  if (Array.isArray(value)) return value.length > 0 ? value.join(" / ") : "なし";
  if (typeof value === "boolean") return value ? "あり" : "なし";
  return String(value);
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function RankCard({ label, rank, detail }: { label: string; rank: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.38)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className="rounded-full bg-rakushu-50 px-2.5 py-1 text-xs font-semibold text-rakushu-700">{rank}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function CriteriaCard({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export function HomeDemo() {
  const [rawText, setRawText] = useState(initialText);
  const deferredText = useDeferredValue(rawText);
  const parsed = parseJobText(deferredText);
  const scored = scoreParsedJob(parsed);
  const fixedOvertimeDetail =
    parsed.fixedOvertimeHours.status === "none"
      ? "固定残業なし"
      : `固定残業時間: ${formatHours(parsed.fixedOvertimeHours.value, parsed.fixedOvertimeHours.status)} / 固定残業代: ${parsed.fixedOvertimePay.status === "none" ? "固定残業制なし" : formatYen(parsed.fixedOvertimePay.value)}`;
  const holidayDetail = `年間休日: ${formatDays(parsed.annualHolidays.value)}`;
  const holidayTypeDetail = `休日制度: ${formatExtractedValue(parsed.holidayType.value)}`;
  const benefitDetail = `福利厚生: ${formatExtractedValue(parsed.benefits.value)}`;
  const totalDetail = `警告: ${formatExtractedValue(parsed.warnings.value)}`;

  const fillRandomSample = () => {
    const index = Math.floor(Math.random() * demoSampleTexts.length);
    setRawText(demoSampleTexts[index] ?? "");
  };

  return (
    <section className="page-stack">
      <div className="page-hero page-hero-split overflow-hidden">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="eyebrow">
              <Sparkles className="size-4" />
              求人票の温度感まで見える解析ワークスペース
            </p>
            <div className="space-y-3">
              <h1 className="page-title text-balance">らくしゅう</h1>
              <p className="page-copy">
                求人本文を貼るだけで、固定残業、休日、福利厚生、注意ワードを同じ視点で整理します。保存、比較、基準の共有までを一本の画面体験にまとめた就活向けワークスペースです。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="button-primary">
              ログインして使う
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/pricing" className="button-secondary">
              料金を見る
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="panel-muted">
              <ScanSearch className="size-5 text-rakushu-600" />
              <p className="mt-3 text-sm font-medium text-slate-900">抽出と要点整理</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">会社名、職種、給与、休日制度、福利厚生を構造化します。</p>
            </div>
            <div className="panel-muted">
              <ShieldCheck className="size-5 text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-slate-900">警告ワードの可視化</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">曖昧な訴求や誇張の兆候をまとめて見返せます。</p>
            </div>
            <div className="panel-muted">
              <ClipboardList className="size-5 text-amber-600" />
              <p className="mt-3 text-sm font-medium text-slate-900">判断基準の持ち運び</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">自分用のランク閾値や公開基準を基に見極めを統一できます。</p>
            </div>
          </div>
        </div>

        <div className="panel bg-slate-950 text-white shadow-[0_32px_80px_-36px_rgba(15,23,42,0.8)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rakushu-200">Live preview</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">入力から数秒で、求人票の輪郭が揃います。</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/8 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">総合ランク</p>
                  <p className="mt-2 text-2xl font-semibold">A</p>
                </div>
                <div className="rounded-xl bg-white/8 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">検出警告</p>
                  <p className="mt-2 text-2xl font-semibold">4件</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {["固定残業と年間休日を同じ基準で比較", "休日制度と福利厚生を別ランクで表示", "保存後は一覧と詳細で同じ見方を維持"].map((line) => (
                <div key={line} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <p className="text-sm leading-6 text-slate-200">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="panel">
          <div className="section-heading">
            <div className="min-w-0">
              <h2 className="section-title">解析デモ</h2>
              <p className="section-copy">求人文を貼ると、右側のランクと抽出値がリアルタイムで更新されます。</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={fillRandomSample}
                className="button-secondary"
              >
                サンプル文を入力
              </button>
              <button
                type="button"
                onClick={() => setRawText(initialText)}
                className="button-secondary"
              >
                クリア
              </button>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={22}
            className="field-textarea mt-5 min-h-[34rem]"
            placeholder="ここに求人・職務内容を全てコピー＆ペーストしてください"
          />
        </div>

        <div className="space-y-4">
          <div className="panel">
            <div className="section-heading">
              <div>
                <h2 className="section-title">ランク</h2>
                <p className="section-copy">抽出値に基づいて各観点を独立評価します。</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RankCard label="総合" rank={scored.totalRank} detail={totalDetail} />
              <RankCard label="固定残業" rank={scored.fixedOvertimeRank} detail={fixedOvertimeDetail} />
              <RankCard label="年間休日" rank={scored.holidayRank} detail={holidayDetail} />
              <RankCard label="休日制度" rank={scored.holidayTypeRank} detail={holidayTypeDetail} />
              <RankCard label="福利厚生" rank={scored.benefitRank} detail={benefitDetail} />
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">抽出値</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard label="会社名" value={parsed.companyName.value ?? "不明"} />
              <InfoCard label="職種" value={parsed.title.value ?? "不明"} />
              <InfoCard label="基本給最小" value={formatYen(parsed.baseSalaryMin.value)} />
              <InfoCard label="固定残業時間" value={formatHours(parsed.fixedOvertimeHours.value, parsed.fixedOvertimeHours.status)} />
              <InfoCard
                label="固定残業代"
                value={
                  parsed.fixedOvertimePay.status === "none"
                    ? "固定残業制なし"
                    : formatYen(parsed.fixedOvertimePay.value)
                }
              />
              <InfoCard label="年間休日" value={formatDays(parsed.annualHolidays.value)} />
              <InfoCard label="休日制度" value={parsed.holidayType.value ?? "不明"} />
              <InfoCard label="警告" value={parsed.warnings.value?.length ? parsed.warnings.value.join(" / ") : "なし"} />
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">ランク基準</h2>
            <p className="section-copy mt-2">初期設定では以下の閾値で評価します。ログイン後はプランに応じて自分用基準に変更できます。</p>
            <div className="mt-4 grid gap-3">
              <CriteriaCard
                label="固定残業"
                lines={[
                  "なし = S",
                  `${DEFAULT_RANK_SETTINGS.fixedOvertime.aMaxHours}時間以下 = A / ${DEFAULT_RANK_SETTINGS.fixedOvertime.bMaxHours}時間以下 = B`,
                  `${DEFAULT_RANK_SETTINGS.fixedOvertime.cMaxHours}時間以下 = C / ${DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours}時間以下 = D`,
                  `${DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours}時間超 = E`
                ]}
              />
              <CriteriaCard
                label="年間休日"
                lines={[
                  `${DEFAULT_RANK_SETTINGS.annualHolidays.sMinDays}日以上 = S / ${DEFAULT_RANK_SETTINGS.annualHolidays.aMinDays}日以上 = A`,
                  `${DEFAULT_RANK_SETTINGS.annualHolidays.bMinDays}日以上 = B / ${DEFAULT_RANK_SETTINGS.annualHolidays.cMinDays}日以上 = C`,
                  `${DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays}日以上 = D`,
                  `${DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays - 1}日以下 = E`
                ]}
              />
              <CriteriaCard
                label="休日制度"
                lines={[
                  "完全週休2日制 = A",
                  "週休2日制 = C",
                  "それ以外 = UNKNOWN"
                ]}
              />
              <CriteriaCard
                label="福利厚生"
                lines={[
                  "福利厚生項目 + 住宅手当 + 社宅制度を加点",
                  "6点以上 = S / 5点 = A / 4点 = B",
                  "3点 = C / 1-2点 = D",
                  "項目なし = UNKNOWN"
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
