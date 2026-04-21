"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function RankCard({ label, rank, detail }: { label: string; rank: string; detail: string }) {
  return (
    <div className="rounded-xl border border-rakushu-200 bg-rakushu-50 p-4">
      <p className="text-xs text-rakushu-700">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{rank}</p>
      <p className="mt-2 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

function CriteriaCard({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <div className="mt-2 space-y-1 text-xs text-slate-600">
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
    <section className="space-y-8">
      <div className="space-y-4">
        <p className="inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-rakushu-700 shadow-sm">
          求人説明をその場で解析
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">らくしゅう</h1>
        <p className="max-w-3xl text-slate-700">
          求人説明を貼ると、会社名・職種・固定残業・休日などを自動で抽出します。ログインすると保存して管理できます。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white transition hover:bg-rakushu-700"
          >
            ログイン・登録
          </Link>
          <Link href="/pricing" className="rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-100">
            料金を見る
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">解析デモ</h2>
              <p className="mt-1 text-sm text-slate-600">求人文を貼り付けると、基本給・休日数・固定残業・福利厚生・注意キーワードを抽出し、ランクを付けます。</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={fillRandomSample}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm whitespace-nowrap hover:bg-slate-100"
              >
                サンプル文を入力
              </button>
              <button
                type="button"
                onClick={() => setRawText(initialText)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm whitespace-nowrap hover:bg-slate-100"
              >
                クリア
              </button>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={22}
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-rakushu-500"
            placeholder="ここに求人・職務内容を全てコピー＆ペーストしてください"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">ランク</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <RankCard label="総合" rank={scored.totalRank} detail={totalDetail} />
              <RankCard label="固定残業" rank={scored.fixedOvertimeRank} detail={fixedOvertimeDetail} />
              <RankCard label="年間休日" rank={scored.holidayRank} detail={holidayDetail} />
              <RankCard label="休日制度" rank={scored.holidayTypeRank} detail={holidayTypeDetail} />
              <RankCard label="福利厚生" rank={scored.benefitRank} detail={benefitDetail} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">抽出値</h2>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">ランク基準（デフォルト）</h2>
            <p className="mt-1 text-sm text-slate-600">抽出値に応じて、次の基準でランクを付けています。</p>
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
