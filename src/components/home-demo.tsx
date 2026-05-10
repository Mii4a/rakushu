"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  CreditCard,
  FileSearch,
  Lock,
  Menu,
  Scale,
  Search,
  Sparkles
} from "lucide-react";

import { DEFAULT_RANK_SETTINGS, parseJobText, scoreParsedJob } from "@/lib/analysis";
import rakumoHappy from "../../yuru-chara/rakumo_happy.jpg";
import rakumoNeutral from "../../yuru-chara/rakumo_neutral.jpg";

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

const navItems = [
  { href: "#features", label: "機能" },
  { href: "#criteria", label: "判断基準" },
  { href: "/pricing", label: "料金プラン" },
  { href: "#faq", label: "よくある質問" }
];

const stepItems = [
  {
    number: "1",
    title: "求人をランク付け",
    copy: "求人票を入力すると、自動で解析して5つの観点からランクを付けます。",
    icon: FileSearch
  },
  {
    number: "2",
    title: "基準を作る・借りる",
    copy: "自分の基準を作ったり、公開されている基準を借りて使うことができます。",
    icon: Scale
  },
  {
    number: "3",
    title: "良い求人だけ保存",
    copy: "気になる求人だけを保存して、就活の整理と管理を進められます。",
    icon: ClipboardList
  }
] as const;

const benefitItems = [
  {
    title: "総合ランク",
    value: "A",
    copy: "働きやすさを客観的に可視化",
    tone: "text-[#15a6a0]"
  },
  {
    title: "検出警告",
    value: "4件",
    copy: "見落としがちなリスクに気づける",
    tone: "text-[#f29e32]"
  },
  {
    title: "チェック項目を自動評価",
    value: "",
    copy: "5つの観点から総合的に判定",
    tone: "text-[#15a6a0]"
  }
] as const;

const savedValueItems = [
  {
    title: "良い求人だけ保存して管理",
    copy: "気になる求人を厳選してストック。後から見返しやすくなります。",
    icon: ClipboardList
  },
  {
    title: "気になる求人だけ残す",
    copy: "比較して、納得できる求人に集中。迷いを減らします。",
    icon: Search
  },
  {
    title: "応募状況を記録する",
    copy: "ステータスやメモで進捗を見える化。やるべきことが明確に。",
    icon: CheckCircle2
  },
  {
    title: "次の確認日を置いておく",
    copy: "リマインド設定で、やるべきことを忘れない。就活を計画的に進められます。",
    icon: CircleAlert
  }
] as const;

const faqItems = [
  {
    question: "無料でどこまで使えますか？",
    answer: "トップのデモ確認とログイン開始までは無料です。保存や管理、プラン機能はログイン後に利用できます。"
  },
  {
    question: "判断基準は自分用に変えられますか？",
    answer: "ログイン後はプランに応じて固定残業や年間休日などの基準を自分用に調整できます。"
  },
  {
    question: "良い求人だけを残せますか？",
    answer: "はい。ランク付け後に残したい求人だけ保存し、応募状況まで一貫して管理できます。"
  }
] as const;

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

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] border-b border-[#dce7ee] text-sm last:border-b-0">
      <div className="bg-[#f9fcfd] px-4 py-3 font-semibold text-[#17355b]">{label}</div>
      <div className={`px-4 py-3 ${highlight ? "font-semibold text-[#ef5a39]" : "text-[#35546f]"}`}>{value}</div>
    </div>
  );
}

function CriteriaPanel({
  icon,
  title,
  lines
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lines: readonly string[];
}) {
  const Icon = icon;

  return (
    <div className="rounded-[24px] border border-[#dce7ee] bg-white px-5 py-5 shadow-[0_12px_24px_-26px_rgba(22,53,91,0.35)]">
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#f4fbfb] text-[#6d90af]">
          <Icon className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="text-[1.45rem] font-black leading-tight text-[#17355b]">{title}</p>
          {lines.map((line) => (
            <p key={line} className="text-sm leading-7 text-[#35546f]">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeDemo() {
  const [rawText, setRawText] = useState(initialText);
  const [showExtracted, setShowExtracted] = useState(false);
  const deferredText = useDeferredValue(rawText);
  const parsed = parseJobText(deferredText);
  const scored = scoreParsedJob(parsed);

  const rankItems = [
    { label: "固定残業ランク", rank: scored.fixedOvertimeRank, note: "やや注意" },
    { label: "年間休日ランク", rank: scored.holidayRank, note: "良好" },
    { label: "休日制度ランク", rank: scored.holidayTypeRank, note: "良好" },
    { label: "福利厚生ランク", rank: scored.benefitRank, note: "標準的" }
  ];

  const criteriaItems = [
    {
      title: "固定残業の閾値",
      icon: CircleAlert,
      lines: [
        `A：〜${DEFAULT_RANK_SETTINGS.fixedOvertime.aMaxHours}時間`,
        `B：〜${DEFAULT_RANK_SETTINGS.fixedOvertime.bMaxHours}時間`,
        `C：〜${DEFAULT_RANK_SETTINGS.fixedOvertime.cMaxHours}時間`,
        `D：${DEFAULT_RANK_SETTINGS.fixedOvertime.dMaxHours}時間超`
      ]
    },
    {
      title: "年間休日の閾値",
      icon: ClipboardList,
      lines: [
        `S：${DEFAULT_RANK_SETTINGS.annualHolidays.sMinDays}日以上`,
        `A：${DEFAULT_RANK_SETTINGS.annualHolidays.aMinDays}日以上`,
        `B：${DEFAULT_RANK_SETTINGS.annualHolidays.bMinDays}日以上`,
        `D：${DEFAULT_RANK_SETTINGS.annualHolidays.dMinDays}日未満`
      ]
    },
    {
      title: "休日制度の判定",
      icon: Sparkles,
      lines: [
        "完全週休2日制や土日祝休み、",
        "長期休暇制度の有無などを",
        "総合的に評価します。"
      ]
    },
    {
      title: "福利厚生の判定",
      icon: CheckCircle2,
      lines: [
        "手当・補助・制度の充実度を、",
        "項目ごとに評価し、総合して",
        "ランクを付けます。"
      ]
    }
  ] as const;

  return (
    <section className="home-demo-shell bg-[linear-gradient(180deg,#fffdfa_0%,#fdfefe_100%)] text-[#17355b]">
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-8 pt-4 lg:px-8">
        <header className="rounded-[28px] border border-[#dce7ee] bg-white/95 px-5 py-4 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative size-14 overflow-hidden rounded-full border border-[#ffe4c6] bg-[#fff9f0]">
                <Image src={rakumoNeutral} alt="らくしゅうのマスコット" fill className="object-cover" sizes="56px" />
              </div>
              <div>
                <p className="text-[2rem] font-black leading-none text-[#25b0a9]">らくしゅう</p>
                <p className="mt-1 text-sm font-semibold text-[#35546f]">求人を見極めて、就活を整える</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <nav className="hidden items-center gap-10 lg:flex">
                {navItems.map((item) => (
                  <Link key={item.label} href={item.href} className="text-base font-bold text-[#17355b] hover:text-[#25b0a9]">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#23b4ae_0%,#189c97_100%)] px-6 py-3 text-base font-black text-white shadow-[0_18px_30px_-24px_rgba(24,156,151,0.8)]"
              >
                ログイン
              </Link>
              <button
                type="button"
                aria-label="ナビゲーションメニュー"
                className="inline-flex size-12 items-center justify-center rounded-xl border border-[#dce7ee] text-[#0f6e78] lg:hidden"
              >
                <Menu className="size-7" />
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <section className="rounded-[30px] border border-[#dce7ee] bg-white px-6 py-7 shadow-[0_20px_40px_-30px_rgba(22,53,91,0.28)] md:px-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_270px] xl:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-[#ebfbfb] px-4 py-2 text-sm font-bold text-[#1ea9a4]">
                  求人をランクで見極める就活ワークスペース
                </p>
                <h1 className="mt-5 text-[2.6rem] font-black leading-[1.18] tracking-tight text-[#15345b] md:text-[4rem]">
                  求人をランク付けして、
                  <br />
                  そのまま就活の整理まで進める
                </h1>
                <p className="mt-5 max-w-[760px] text-lg leading-9 text-[#35546f]">
                  求人票を入力するだけで、休日・福利厚生・固定残業などを自動で解析。
                  客観的なランクで見極めて、気になる求人だけを保存・管理できます。
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex min-h-[74px] items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#24b4ae_0%,#129995_100%)] px-7 py-4 text-lg font-black text-white shadow-[0_20px_34px_-24px_rgba(18,153,149,0.92)]"
                  >
                    <ClipboardList className="size-5" />
                    <span>
                      ランク付けを試す（無料）
                      <span className="mt-1 block text-sm font-semibold text-white/90">ログインして使い始める →</span>
                    </span>
                  </Link>
                  <Link
                    href="/criteria"
                    className="inline-flex min-h-[74px] items-center justify-center gap-3 rounded-2xl border border-[#bdd1de] bg-white px-7 py-4 text-lg font-black text-[#17355b] shadow-[0_18px_28px_-26px_rgba(22,53,91,0.35)]"
                  >
                    <BookOpen className="size-5 text-[#2d577a]" />
                    <span>
                      基準の仕組みを見る
                      <span className="mt-1 block text-sm font-semibold text-[#35546f]">判断基準の一覧へ →</span>
                    </span>
                  </Link>
                </div>

                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#506b82]">
                  <Lock className="size-4" />
                  保存・応募状況の管理にはログインが必要です
                </p>
              </div>

              <div className="relative mx-auto w-full max-w-[280px]">
                <div className="pointer-events-none absolute -left-5 top-12 text-[#ffd58c]">
                  <Sparkles className="size-6" />
                </div>
                <div className="pointer-events-none absolute -right-4 top-6 text-[#ffd58c]">
                  <Sparkles className="size-5" />
                </div>
                <div className="pointer-events-none absolute -left-2 bottom-16 text-[#ffd58c]">
                  <Sparkles className="size-4" />
                </div>
                <div className="relative aspect-square overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_50%_35%,#fff8ef_0%,#fffdfa_70%)]">
                  <Image src={rakumoHappy} alt="虫眼鏡を持つらくしゅうのマスコット" fill className="object-contain p-2" sizes="280px" priority />
                </div>
              </div>
            </div>
          </section>

          <aside id="features" className="space-y-4">
            <h2 className="px-2 text-[2rem] font-black text-[#17355b]">らくしゅうで得られること</h2>
            {benefitItems.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-[#e1edf2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfefe_100%)] px-5 py-5 shadow-[0_16px_28px_-28px_rgba(22,53,91,0.3)]">
                <div className="flex items-start gap-4">
                  <div className={`flex size-16 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white text-[2rem] font-black ${item.tone}`}>
                    {item.value || <Check className="size-8" />}
                  </div>
                  <div>
                    <p className="text-[1.6rem] font-black leading-tight text-[#17355b]">
                      {item.title} {item.value ? <span className={item.tone}>{item.value}</span> : null}
                    </p>
                    <p className="mt-2 text-base leading-7 text-[#4f6a80]">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </aside>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-center gap-4 text-center">
            <span className="text-[#25b0a9]">⌁</span>
            <h2 className="text-[2rem] font-black text-[#17355b]">使い方はカンタン、3ステップ</h2>
            <span className="text-[#25b0a9]">⌁</span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)_42px_minmax(0,1fr)] xl:items-center">
            {stepItems.map((item, index) => {
              const Icon = item.icon;
              const card = (
                <div className="rounded-[26px] border border-[#dce7ee] bg-white px-5 py-5 shadow-[0_16px_30px_-28px_rgba(22,53,91,0.28)]">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#20aba5] text-lg font-black text-white">
                      {item.number}
                    </div>
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-[20px] bg-[#f8fbfd] text-[#6e8cab]">
                      <Icon className="size-9" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[1.55rem] font-black leading-tight text-[#17355b]">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#4f6a80]">{item.copy}</p>
                    </div>
                    <ArrowRight className="ml-auto hidden size-5 shrink-0 text-[#23b1aa] xl:block" />
                  </div>
                </div>
              );

              if (index === stepItems.length - 1) {
                return <div key={item.title}>{card}</div>;
              }

              return (
                <div key={item.title} className="contents">
                  {card}
                  <div className="hidden text-center text-[2rem] font-light text-[#28b3ac] xl:block">›</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#dce7ee] bg-white px-5 py-5 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.28)] md:px-6">
          <div className="flex items-center gap-3 text-[#17355b]">
            <Sparkles className="size-5 text-[#f3b44a]" />
            <h2 className="text-[2rem] font-black">実際に試してみる（サンプルでデモ体験）</h2>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.7fr)_minmax(0,0.92fr)_320px]">
            <div className="rounded-[24px] border border-[#dce7ee] bg-white px-4 py-4">
              <p className="text-[1.35rem] font-black text-[#17355b]">① 求人票のテキストを入力</p>
              <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={14}
                className="mt-4 min-h-[360px] w-full rounded-[18px] border border-[#c8d7e0] px-4 py-4 text-sm leading-7 text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
                placeholder="求人票テキストを入力"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRawText(demoSampleText)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#24b4ae_0%,#129995_100%)] px-5 py-3 text-base font-black text-white"
                >
                  <ClipboardList className="size-4" />
                  サンプル文を入力
                </button>
                <button
                  type="button"
                  onClick={() => setRawText(initialText)}
                  className="inline-flex items-center justify-center rounded-xl border border-[#c8d7e0] px-5 py-3 text-base font-black text-[#21a8a3]"
                >
                  クリア
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dce7ee] bg-white px-4 py-4">
              <p className="text-[1.35rem] font-black text-[#17355b]">② 解析結果（デモ）</p>
              <div className="mt-4 rounded-[18px] border border-[#dce7ee] bg-[linear-gradient(180deg,#f9fcfd_0%,#ffffff_100%)] px-5 py-5 text-center">
                <p className="text-sm font-semibold text-[#35546f]">総合ランク</p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="text-[4.6rem] font-black leading-none text-[#20ada6]">{scored.totalRank}</span>
                  <span className="rounded-full bg-[#dff6f4] px-4 py-2 text-sm font-bold text-[#1f9d98]">働きやすさ高め</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {rankItems.map((item) => (
                  <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_54px_88px] items-center gap-3 rounded-[16px] border border-[#dce7ee] px-4 py-3">
                    <p className="text-sm font-semibold text-[#17355b]">{item.label}</p>
                    <span className={`inline-flex justify-center rounded-lg px-3 py-1 text-lg font-black ${
                      item.rank.startsWith("A") || item.rank.startsWith("S")
                        ? "bg-[#ebfbfb] text-[#20a9a4]"
                        : "bg-[#fff6ea] text-[#f09d34]"
                    }`}>
                      {item.rank}
                    </span>
                    <span className="text-sm font-semibold text-[#6c8192]">{item.note}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowExtracted((current) => !current)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#bfe4e1] px-4 py-3 text-base font-black text-[#20a9a4] xl:hidden"
              >
                ③ 抽出された主な情報を表示
                <span>{showExtracted ? "▲" : "▼"}</span>
              </button>
            </div>

            <div className={`${showExtracted ? "block" : "hidden"} rounded-[24px] border border-[#dce7ee] bg-white xl:block`}>
              <div className="px-4 py-4">
                <p className="text-[1.35rem] font-black text-[#17355b]">③ 抽出された主な情報</p>
              </div>
              <div className="border-t border-[#dce7ee]">
                <InfoRow label="会社名" value={parsed.companyName.value ?? "株式会社サンプルテック"} />
                <InfoRow label="職種" value={parsed.title.value ?? "Webエンジニア"} />
                <InfoRow label="基本給（最小）" value={formatYen(parsed.baseSalaryMin.value)} />
                <InfoRow label="固定残業時間" value={formatHours(parsed.fixedOvertimeHours.value, parsed.fixedOvertimeHours.status)} />
                <InfoRow label="固定残業代" value={parsed.fixedOvertimePay.status === "none" ? "固定残業制なし" : formatYen(parsed.fixedOvertimePay.value)} />
                <InfoRow label="年間休日" value={formatDays(parsed.annualHolidays.value)} />
                <InfoRow label="休日制度" value={parsed.holidayType.value ?? "完全週休2日制（土日祝）"} />
                <InfoRow
                  label="主な制度・福利厚生"
                  value={parsed.benefits.value?.length ? parsed.benefits.value.join("、") : "リモートワーク可、住宅手当、資格取得支援、書籍購入補助 など"}
                />
                <InfoRow
                  label="抽出された警告"
                  value={parsed.warnings.value?.length ? parsed.warnings.value.join(" / ") : "固定残業時間が長め（45時間） / リモートワークの頻度が不明"}
                  highlight
                />
              </div>
            </div>

            <aside id="criteria" className="space-y-3">
              <div className="rounded-[26px] border border-[#dce7ee] bg-white px-5 py-5 shadow-[0_16px_28px_-28px_rgba(22,53,91,0.26)]">
                <h2 className="text-[2rem] font-black text-[#17355b]">らくしゅうの判断基準（一例）</h2>
                <div className="mt-4 space-y-3">
                  {criteriaItems.map((item) => (
                    <CriteriaPanel key={item.title} icon={item.icon} title={item.title} lines={item.lines} />
                  ))}
                </div>
                <Link
                  href="/criteria"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#bfe4e1] px-5 py-3 text-base font-black text-[#20a9a4]"
                >
                  すべての基準を見る
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="rounded-[30px] border border-[#dce7ee] bg-white px-6 py-6 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.28)]">
            <h2 className="text-center text-[2.3rem] font-black text-[#17355b]">良い求人だけを保存して、就活をもっとスマートに</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {savedValueItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="flex gap-4 rounded-[22px] border border-[#e4edf2] bg-[#fffefe] px-5 py-5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-[#f7fbfd] text-[#6f8ead]">
                      <Icon className="size-7" />
                    </div>
                    <div>
                      <p className="text-[1.35rem] font-black leading-tight text-[#17355b]">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#4f6a80]">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#dce7ee] bg-[linear-gradient(180deg,#ffffff_0%,#fffef7_100%)] px-6 py-6 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[2rem] font-black leading-tight text-[#17355b]">
                  今すぐ、らくしゅうで
                  <br />
                  就活を整理しよう！
                </p>
              </div>
              <div className="relative size-28 shrink-0 overflow-hidden rounded-full bg-[#fff8ef]">
                <Image src={rakumoHappy} alt="応援するマスコット" fill className="object-cover" sizes="112px" />
              </div>
            </div>

            <Link
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#23b4ae_0%,#149995_100%)] px-6 py-5 text-xl font-black text-white shadow-[0_20px_36px_-26px_rgba(18,153,149,0.82)]"
            >
              <ClipboardList className="size-5" />
              <span>
                ランク付けを試す（無料）
                <span className="mt-1 block text-sm font-semibold text-white/90">ログインして使い始める →</span>
              </span>
            </Link>
          </div>
        </section>

        <section id="faq" className="mt-8 rounded-[30px] border border-[#dce7ee] bg-white px-6 py-6 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.22)]">
          <h2 className="text-[2rem] font-black text-[#17355b]">よくある質問</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-[24px] border border-[#e2edf2] bg-[#fcfefe] px-5 py-5">
                <p className="text-[1.25rem] font-black leading-tight text-[#17355b]">{item.question}</p>
                <p className="mt-3 text-sm leading-7 text-[#4f6a80]">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 rounded-[28px] border border-[#dce7ee] bg-white px-6 py-6 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.18)]">
          <div className="flex flex-col items-center gap-5 text-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative size-16 overflow-hidden rounded-full border border-[#ffe4c6] bg-[#fff9f0]">
                <Image src={rakumoNeutral} alt="らくしゅうのマスコット" fill className="object-cover" sizes="64px" />
              </div>
              <div className="text-left">
                <p className="text-[2rem] font-black leading-none text-[#25b0a9]">らくしゅう</p>
                <p className="mt-1 text-sm font-semibold text-[#35546f]">求人を見極めて、就活を整える</p>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {navItems.map((item) => (
                <Link key={`footer-${item.label}`} href={item.href} className="text-lg font-bold text-[#17355b] hover:text-[#25b0a9]">
                  {item.label}
                </Link>
              ))}
            </nav>

            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg font-bold text-[#17355b]">
              <Link href="/legal/commerce">特定商取引法に基づく表記</Link>
              <Link href="/legal/terms">利用規約</Link>
              <Link href="/legal/privacy">プライバシーポリシー</Link>
              <Link href="/legal/refund">返金ポリシー</Link>
            </nav>

            <p className="text-base font-semibold text-[#6b8092]">© 2024 らくしゅう</p>
          </div>
        </footer>
      </div>
    </section>
  );
}
