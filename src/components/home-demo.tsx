"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  Lock,
  Plus,
  Search,
  Sparkles,
  Star
} from "lucide-react";

import { parseJobText, scoreParsedJob } from "@/lib/analysis";
import { getTextLengthBucket, getUtmParams, sendMarketingEvent } from "@/lib/marketing/client";
import { MarketingEventTracker } from "@/components/marketing-event-tracker";
import walletCoinsIcon from "../../UI-mock/home-demo/icons/wallet-coins.png";
import clockIcon from "../../UI-mock/home-demo/icons/clock.png";
import calendarIcon from "../../UI-mock/home-demo/icons/calender.png";
import giftIcon from "../../UI-mock/home-demo/icons/gift.png";
import shieldCheckIcon from "../../UI-mock/home-demo/icons/shield-check-red.png";
import shieldLockIcon from "../../UI-mock/home-demo/icons/shield-lock-blue.png";
import rakumoPointingGuide from "../../UI-mock/home-demo/character/rakumo-pointing-guide.png";

const initialText = "";
const demoSampleTexts: readonly string[] = [`株式会社サンプルテック
【WEBエンジニア】自社サービスの開発・運用を担当。

必須要件：
・Webアプリケーション開発経験3年以上
・チームでの開発経験

給与：月給28万円〜（固定残業代45時間分、70,000円を含む）
※超過分は別途支給

年間休日125日
完全週休2日制（土日祝）
賞与 年2回
退職金制度あり
有給休暇、夏季休暇、年末年始休暇、慶弔休暇
社会保険完備、交通費支給、住宅手当、資格取得支援制度、
書籍購入補助、リモートワーク可`, `北浜オフィスサポート株式会社
【事務】受発注データの入力と社内サポートを担当。

必須要件：
・PCでの入力業務経験
・社内外とのメール対応経験

給与：月給24万5,000円〜（固定残業代なし）

年間休日128日
完全週休2日制（土日祝）
賞与 年2回
退職金制度あり
有給休暇、夏季休暇、年末年始休暇
社会保険完備、交通費支給、服装自由、時短勤務相談可`, `みなとデザイン合同会社
【Webデザイナー】LPとバナー制作、更新業務を担当。

歓迎要件：
・FigmaまたはAdobe XDの利用経験
・チームでのデザインレビュー経験

給与：月給30万円〜（固定残業代30時間分、58,000円を含む）
※超過分は別途支給

年間休日123日
完全週休2日制（土日祝）
賞与 年1回
有給休暇、夏季休暇、年末年始休暇
社会保険完備、交通費支給、書籍購入補助、資格取得支援制度、リモートワーク可`] as const;

const fallbackParsed = parseJobText(demoSampleTexts[0]);
const fallbackScored = scoreParsedJob(fallbackParsed);

const navItems = [
  { href: "/#how-to", label: "使い方" },
  { href: "/#features", label: "機能" },
  { href: "/pricing", label: "料金" },
  { href: "/#faq", label: "よくある質問" }
] as const;

const savedJobCards = [
  {
    badge: "マッチ度 78%",
    badgeTone: "bg-[#e9f8ed] text-[#2c9b4f]",
    company: "らくしゅう株式会社",
    role: "Webエンジニア（自社プロダクト）",
    salary: "450〜700万円",
    location: "東京都渋谷区",
    type: "正社員",
    status: "選考中",
    statusTone: "bg-[#eef6ff] text-[#2d6bcc]",
    updated: "最終更新 2日前"
  },
  {
    badge: "マッチ度 65%",
    badgeTone: "bg-[#fff5e8] text-[#f08b20]",
    company: "ソフトウェーブ株式会社",
    role: "バックエンドエンジニア",
    salary: "500〜800万円",
    location: "東京都千代田区",
    type: "正社員",
    status: "書類選考",
    statusTone: "bg-[#fff4df] text-[#d27d14]",
    updated: "最終更新 5日前"
  },
  {
    badge: "マッチ度 40%",
    badgeTone: "bg-[#fff0f0] text-[#e15b67]",
    company: "テックスタートアップ株式会社",
    role: "フルスタックエンジニア",
    salary: "600〜900万円",
    location: "フルリモート",
    type: "業務委託",
    status: "保存済み",
    statusTone: "bg-[#f4f6f8] text-[#64748b]",
    updated: "最終更新 1週間前"
  }
] as const;

function pickRandomSampleText(currentText: string) {
  if (demoSampleTexts.length === 0) return initialText;
  if (demoSampleTexts.length === 1) return demoSampleTexts[0];

  const candidates = demoSampleTexts.filter((sample) => sample !== currentText);
  const pool = candidates.length > 0 ? candidates : demoSampleTexts;
  return pool[Math.floor(Math.random() * pool.length)] ?? demoSampleTexts[0];
}

function formatCurrencyForHero(value: number | null) {
  if (value == null) return "450万円";
  const annual = Math.round((value * 16) / 10000);
  return `${annual}万円`;
}

function formatOvertimeForHero(hours: number | null) {
  if (hours == null) return "月 20 時間";
  return `月 ${Math.trunc(hours)} 時間`;
}

function formatHolidayForHero(days: number | null) {
  if (days == null) return "年間 125 日";
  return `年間 ${days} 日`;
}

function totalRankToScore(rank: string) {
  switch (rank) {
    case "S":
      return 94;
    case "A":
      return 86;
    case "B":
      return 78;
    case "C":
      return 68;
    case "D":
      return 58;
    case "E":
      return 44;
    default:
      return 72;
  }
}

function buildMatchBars(score: number) {
  const annual = Math.max(48, Math.min(92, score + 2));
  const workStyle = Math.max(42, Math.min(95, score + 12));
  const holidays = Math.max(36, Math.min(88, score - 8));
  const benefits = Math.max(34, Math.min(86, score - 8));
  const growth = Math.max(28, Math.min(82, score - 18));

  return [
    { label: "年収", value: annual, tone: "bg-[#4caf50]" },
    { label: "働き方", value: workStyle, tone: "bg-[#51b75b]" },
    { label: "休日・休暇", value: holidays, tone: "bg-[#f5b12f]" },
    { label: "福利厚生", value: benefits, tone: "bg-[#f3b039]" },
    { label: "成長環境", value: growth, tone: "bg-[#ff922e]" }
  ] as const;
}

const mockMatchBars = [
  { label: "年収", value: 80, tone: "bg-[#4caf50]" },
  { label: "働き方", value: 90, tone: "bg-[#51b75b]" },
  { label: "休日・休暇", value: 70, tone: "bg-[#f5b12f]" },
  { label: "福利厚生", value: 70, tone: "bg-[#f3b039]" },
  { label: "成長環境", value: 60, tone: "bg-[#ff922e]" }
] as const;

function AutoOrganizeCard({
  icon,
  title,
  value,
  note
}: {
  icon: StaticImageData;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#ebedf0] bg-white px-4 py-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.18)] xl:px-4 xl:py-3.5">
      <div className="relative mx-auto flex h-[74px] w-[74px] items-center justify-center xl:h-[78px] xl:w-[78px]">
        <Image src={icon} alt="" width={80} height={80} className="h-auto w-auto object-contain" />
      </div>
      <div className="mt-2.5 text-center">
        <p className="text-[0.96rem] font-bold text-[#283241] xl:text-[0.98rem]">{title}</p>
        <p className="mt-1.5 text-[1.18rem] font-extrabold leading-[1.2] tracking-[-0.03em] text-[#1e293b] xl:text-[1.26rem]">{value}</p>
        <p className="mt-1.5 text-[0.88rem] leading-6 text-[#677487]">{note}</p>
      </div>
    </div>
  );
}

export function HomeDemo() {
  const [rawText, setRawText] = useState(initialText);
  const [sourceUrl, setSourceUrl] = useState("");
  const searchParams = useSearchParams();
  const hasInput = rawText.trim().length > 0;
  const parsed = hasInput ? parseJobText(rawText) : fallbackParsed;
  const scored = hasInput ? scoreParsedJob(parsed) : fallbackScored;
  const utmParams = useMemo(() => getUtmParams(searchParams), [searchParams]);
  const demoStartedRef = useRef(false);
  const jobPastedRef = useRef(false);
  const analysisCompletedRef = useRef(false);

  useEffect(() => {
    if (!hasInput || demoStartedRef.current) return;
    demoStartedRef.current = true;

    void sendMarketingEvent({
      eventType: "demo_interaction_started",
      page: "/",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      ...utmParams
    });
  }, [hasInput, utmParams]);

  useEffect(() => {
    const trimmedLength = rawText.trim().length;
    if (trimmedLength === 0 || jobPastedRef.current) return;
    jobPastedRef.current = true;

    void sendMarketingEvent({
      eventType: "job_text_pasted",
      page: "/",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      textLengthBucket: getTextLengthBucket(trimmedLength),
      ...utmParams
    });
  }, [rawText, utmParams]);

  useEffect(() => {
    if (!hasInput || analysisCompletedRef.current) return;
    analysisCompletedRef.current = true;

    void sendMarketingEvent({
      eventType: "analysis_completed",
      page: "/",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      totalRank: scored.totalRank,
      ...utmParams
    });
  }, [hasInput, scored.totalRank, utmParams]);

  const organizeCards = useMemo(() => {
    const benefitsLabel = hasInput ? parsed.benefits.value?.slice(0, 2).join("、") || "住宅手当、退職金" : "住宅手当、退職金";
    const warningLabel = hasInput ? parsed.warnings.value?.slice(0, 2).join("、") || "成果主義、若手活躍中" : "成果主義、若手活躍中";

    return [
      {
        icon: walletCoinsIcon,
        title: "年収・給与",
        value: hasInput ? formatCurrencyForHero(parsed.baseSalaryMin.value) : "450万円",
        note: "想定年収"
      },
      {
        icon: clockIcon,
        title: "残業時間",
        value: hasInput ? formatOvertimeForHero(parsed.fixedOvertimeHours.value) : "月 20 時間",
        note: hasInput ? (parsed.fixedOvertimeHours.status === "none" ? "固定残業なし" : "平均残業") : "平均残業"
      },
      {
        icon: calendarIcon,
        title: "休日・休暇",
        value: formatHolidayForHero(parsed.annualHolidays.value),
        note: parsed.holidayType.value ?? "完全週休2日制"
      },
      {
        icon: giftIcon,
        title: "福利厚生",
        value: benefitsLabel,
        note: "資格支援 など"
      },
      {
        icon: shieldCheckIcon,
        title: "注意したい表現",
        value: warningLabel,
        note: "アットホーム など"
      }
    ] as const;
  }, [hasInput, parsed]);

  const matchScore = hasInput ? totalRankToScore(scored.totalRank) : 78;
  const matchBars = useMemo(() => (hasInput ? buildMatchBars(matchScore) : mockMatchBars), [hasInput, matchScore]);
  const circleLength = 2 * Math.PI * 78;
  const circleOffset = circleLength * (1 - matchScore / 100);

  const handleLoadFromUrl = () => {
    setRawText((current) => current || pickRandomSampleText(current));
  };

  const handleAnalyze = () => {
    if (rawText.trim()) return;
    setRawText(pickRandomSampleText(rawText));
  };

  return (
    <section className="home-demo-shell min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#ffffff_20%,#ffffff_100%)] text-[#1f2937]">
      <MarketingEventTracker eventType="lp_view" />
      <div className="mx-auto w-full max-w-[1480px] px-6 pb-10 pt-5 xl:px-10">
        <header className="grid items-center gap-5 border-b border-[#ececec] pb-5 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <Link href="/" className="whitespace-nowrap text-[3.8rem] font-black tracking-[-0.06em] text-[#19a34a]">
            らくしゅう
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-8 text-[1.05rem] font-semibold text-[#2f3747] lg:gap-12">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-[#17a34a]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              aria-label="通知"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e9eaee] bg-white text-[#1f2937] shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)]"
            >
              <Bell className="h-5 w-5" />
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 rounded-full border border-[#e8eaef] bg-white px-3 py-2 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.35)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f5d7c2_0%,#f0b388_100%)] text-sm font-bold text-[#673b2d]">
                山
              </div>
              <span className="text-base font-semibold text-[#374151]">山田 花子</span>
              <ChevronDown className="h-4 w-4 text-[#6b7280]" />
            </Link>
          </div>
        </header>

        <section className="grid gap-8 pt-10 lg:grid-cols-[minmax(380px,0.8fr)_minmax(640px,1.25fr)_290px] lg:items-start xl:grid-cols-[minmax(390px,0.82fr)_minmax(650px,1.28fr)_300px] xl:gap-9">
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f1fbf1] px-4 py-2 text-sm font-bold text-[#3b934f] shadow-[0_12px_30px_-28px_rgba(34,197,94,0.45)]">
              <Check className="h-4 w-4" />
              AIで求人チェック、転職をもっとスマートに
            </div>
            <h1 className="mt-8 max-w-[450px] text-[3.42rem] font-black leading-[0.97] tracking-[-0.072em] text-[#111827] xl:max-w-[480px] xl:text-[4.05rem]">
              求人選びを、
              <br />
              もっと<span className="text-[#43b649]">ラク</span>に。
            </h1>
            <p className="mt-6 max-w-[470px] text-[1.08rem] font-semibold leading-[1.88] text-[#313a49] xl:max-w-[500px] xl:text-[1.16rem]">
              求人票を貼り付けるだけで、AI が条件・待遇・注意点を自動で整理。
              <br />
              あなたの希望に合うか、ひと目でわかります。
            </p>
          </div>

          <div className="rounded-[34px] border border-[#eceff3] bg-white px-7 py-7 shadow-[0_34px_80px_-56px_rgba(15,23,42,0.24)] xl:px-8 xl:py-7">
            <p className="text-[1.42rem] font-bold tracking-[-0.028em] text-[#1f2937] xl:text-[1.6rem]">求人票のテキストやURLを貼り付けてください</p>
            <div className="mt-5 rounded-[24px] border border-[#e4e7ec] bg-[#fffdfb] px-5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="w-full border-none bg-transparent text-[1.02rem] text-[#8a7467] outline-none placeholder:text-[#bca899] xl:text-[1.05rem]"
                placeholder="例)  https://example.com/job/123"
              />
              <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={4}
                className="mt-3 min-h-[100px] w-full resize-none border-none bg-transparent text-[1.02rem] leading-8 text-[#4b5563] outline-none placeholder:text-[#bca899] xl:min-h-[108px] xl:text-[1.04rem]"
                placeholder="または、求人票のテキストをここに貼り付け"
              />
            </div>
            <div className="mt-5 flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
              <button
                type="button"
                onClick={handleLoadFromUrl}
                className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-full border border-[#e5e7eb] bg-white px-7 text-[1.02rem] font-bold text-[#424b5a] shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]"
              >
                <Search className="h-5 w-5" />
                URLを読み込む
              </button>
              <div className="text-[1.02rem] font-semibold text-[#a1a1aa]">または</div>
              <button
                type="button"
                onClick={handleAnalyze}
                className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#52be56_0%,#3fae4c_100%)] px-8 text-[1.04rem] font-bold text-white shadow-[0_24px_50px_-34px_rgba(63,174,76,0.75)]"
              >
                <Sparkles className="h-5 w-5" />
                AIで求人を解析する
              </button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[0.98rem] font-medium text-[#7a6f67]">
              <Lock className="h-4 w-4" />
              入力した情報は公開されません。
            </p>
          </div>

          <div className="pt-2">
            <div className="ml-auto max-w-[284px] rounded-[24px] border border-[#eceff3] bg-white px-6 py-4 text-[1.04rem] font-bold leading-8 text-[#444b5a] shadow-[0_26px_60px_-46px_rgba(15,23,42,0.22)] xl:max-w-[296px]">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#50b84d] text-white">
                  <Check className="h-5 w-5" />
                </div>
                <p>
                  らくしゅうが
                  <br />
                  やさしくサポート！
                </p>
              </div>
            </div>
            <div className="relative mx-auto mt-3 max-w-[286px] xl:max-w-[296px]">
              <Image src={rakumoPointingGuide} alt="ガイドするらくしゅうキャラクター" priority className="h-auto w-full object-contain" />
            </div>
          </div>
        </section>

        <section id="features" className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.96fr)_420px] xl:items-start">
          <div className="rounded-[34px] border border-[#eceff2] bg-white p-5 shadow-[0_32px_80px_-58px_rgba(15,23,42,0.24)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[2.22rem] font-black tracking-[-0.05em] text-[#111827] xl:text-[2.3rem]">AIが求人を自動で整理</h2>
              <Link href="/criteria" className="text-[1.1rem] font-bold text-[#26a244] hover:text-[#14873a]">
                すべての項目を見る →
              </Link>
            </div>
            <div className="mt-5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-5 xl:gap-3">
              {organizeCards.map((item) => (
                <AutoOrganizeCard key={item.title} icon={item.icon} title={item.title} value={item.value} note={item.note} />
              ))}
            </div>
          </div>

          <aside className="rounded-[34px] border border-[#eceff2] bg-white p-5 shadow-[0_32px_80px_-58px_rgba(15,23,42,0.24)] xl:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.34rem] font-black leading-[1.24] tracking-[-0.04em] text-[#111827] xl:text-[1.46rem]">あなたの希望との相性スコア</h2>
              <Link href="/login" className="text-[0.98rem] font-bold text-[#2ca44b] hover:text-[#14873a]">
                設定を編集 →
              </Link>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[140px_minmax(0,1fr)] md:items-center xl:grid-cols-[136px_minmax(0,1fr)]">
              <div className="relative mx-auto h-[138px] w-[138px] xl:h-[142px] xl:w-[142px]">
                <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                  <circle cx="90" cy="90" r="78" fill="none" stroke="#edf0f4" strokeWidth="12" />
                  <circle
                    cx="90"
                    cy="90"
                    r="78"
                    fill="none"
                    stroke="#51b657"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circleLength}
                    strokeDashoffset={circleOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#3da649]">
                  <span className="text-[3.48rem] font-extrabold leading-none tracking-[-0.06em]">{matchScore}</span>
                  <span className="mt-1 text-[1.1rem] font-bold text-[#5a6577]">/100</span>
                </div>
              </div>

              <div>
                <p className="text-[1.5rem] font-black tracking-[-0.04em] text-[#2ea044] xl:text-[1.62rem]">良いマッチ度です！</p>
                <p className="mt-1.5 text-[0.98rem] font-semibold leading-7 text-[#4b5563]">条件の多くを満たしています</p>
                <div className="mt-5 space-y-3.5">
                  {matchBars.map((item) => (
                    <div key={item.label} className="grid grid-cols-[84px_minmax(0,1fr)_56px] items-center gap-3 text-[0.96rem] font-semibold text-[#495466]">
                      <span>{item.label}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-[#edf0f4]">
                        <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} />
                      </div>
                      <span className="text-right text-[#3f4654]">{item.value}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section id="how-to" className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.96fr)_420px] xl:items-start">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-[2.18rem] font-black tracking-[-0.05em] text-[#111827] xl:text-[2.26rem]">保存した求人・選考中</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-[#5b6472]">
                <span className="rounded-full bg-[#f5f2ef] px-4 py-2 text-[#2b313c]">すべて 12</span>
                <span className="rounded-full bg-[#f9f7f5] px-4 py-2">保存済み 8</span>
                <span className="rounded-full bg-[#f9f7f5] px-4 py-2">選考中 4</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3.5 lg:grid-cols-3">
              {savedJobCards.map((item) => (
                <article
                  key={`${item.company}-${item.role}`}
                  className="rounded-[28px] border border-[#eceef2] bg-white px-4 py-3.5 shadow-[0_28px_70px_-56px_rgba(15,23,42,0.24)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${item.badgeTone}`}>{item.badge}</span>
                    <button type="button" aria-label="保存済み" className="text-[#6b7280]">
                      <Bookmark className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f7fb] text-base font-black text-[#7b8798]">
                      {item.company.slice(0, 1)}
                    </div>
                    <p className="text-[0.98rem] font-bold leading-7 text-[#3f4755]">{item.company}</p>
                  </div>
                  <h3 className="mt-3 min-h-[2.8rem] text-[1.16rem] font-black leading-[1.24] tracking-[-0.03em] text-[#111827]">{item.role}</h3>
                  <dl className="mt-3.5 space-y-1 text-[0.92rem] text-[#4b5563]">
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
                      <dt className="font-semibold text-[#667085]">年収</dt>
                      <dd className="font-semibold text-[#1f2937]">{item.salary}</dd>
                    </div>
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
                      <dt className="font-semibold text-[#667085]">勤務地</dt>
                      <dd>{item.location}</dd>
                    </div>
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
                      <dt className="font-semibold text-[#667085]">雇用形態</dt>
                      <dd>{item.type}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef0f3] pt-3">
                    <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${item.statusTone}`}>{item.status}</span>
                    <span className="text-sm font-medium text-[#7c8594]">{item.updated}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[34px] border border-[#edf1ea] bg-[radial-gradient(circle_at_top,#f7fbf3_0%,#fdfdf9_100%)] px-6 py-4.5 shadow-[0_28px_70px_-56px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-[1.52rem] font-black leading-[1.32] tracking-[-0.04em] text-[#2e7f2f]">
                  希望条件を登録して
                  <br />
                  より精度の高いスコアを
                </h2>
                <ul className="mt-3.5 space-y-2 text-[0.96rem] font-semibold text-[#485665]">
                  <li className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-[#53b34d]" />
                    年収・働き方の希望を設定
                  </li>
                  <li className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-[#53b34d]" />
                    譲れない条件を優先評価
                  </li>
                  <li className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-[#53b34d]" />
                    非公開求人の提案も可能に
                  </li>
                </ul>
              </div>
              <div className="w-[124px] shrink-0 pt-2">
                <Image src={shieldLockIcon} alt="安全な設定を表すシールドアイコン" className="h-auto w-full object-contain" />
              </div>
            </div>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-[58px] w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#53be56_0%,#42ae4e_100%)] px-7 text-[1.04rem] font-bold text-white shadow-[0_24px_52px_-36px_rgba(66,174,78,0.78)]"
            >
              希望条件を設定する
              <Plus className="h-5 w-5" />
            </Link>
          </aside>
        </section>

        <section id="faq" className="mt-10">
          <div className="rounded-[28px] border border-[#eceff3] bg-white px-6 py-5 text-center text-[1.4rem] font-semibold leading-9 text-[#6b7280] shadow-[0_24px_64px_-54px_rgba(15,23,42,0.18)]">
            らくしゅうは、あなたの転職活動をやさしく、確かなデータでサポートします。
          </div>
        </section>
      </div>
    </section>
  );
}
