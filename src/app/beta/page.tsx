import type { Metadata } from "next";
import Image from "next/image";

import { BetaIntakeForm } from "@/components/beta-intake-form";
import { MockSiteFooter, MockSiteHeader } from "@/components/mock-site-chrome";
import rakumoThumbsUp from "../../../UI-mock/beta/character/rakumo-thumbs-up.png";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "β参加",
  description: "らくしゅうのβ版先行案内。求人票のどこで不安になるか、比較で何に困るかを先に共有できる。",
  alternates: {
    canonical: "/beta"
  },
  openGraph: {
    title: "らくしゅう β参加",
    description: "求人票の見極めに困っている人向けの先行案内フォーム。",
    url: "/beta"
  },
  twitter: {
    title: "らくしゅう β参加",
    description: "求人票の見極めに困っている人向けの先行案内フォーム。"
  }
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

const benefitCards = [
  { title: "限定50名", body: "早期アクセス", icon: "👥" },
  { title: "参加無料", body: "全機能を体験可能", icon: "¥" },
  { title: "安心・安全", body: "個人情報は厳重に保護", icon: "🛡️" }
] as const;

const meritItems = [
  {
    title: "すべての機能をいち早く体験",
    body: "正式リリース前の最新機能をいち早くお試しいただけます。",
    icon: "🚀"
  },
  {
    title: "プロダクト改善に直接参加",
    body: "あなたのフィードバックが、サービスの改善に直結します。",
    icon: "💬"
  },
  {
    title: "正式版リリース時の特典",
    body: "ベータ参加者限定の特典や優先サポートをご用意予定です。",
    icon: "🎁"
  },
  {
    title: "安心してご利用いただけます",
    body: "個人情報は厳重に管理し、外部に公開されることはありません。",
    icon: "✅"
  }
] as const;

const availableFeatures = [
  "AI求人マッチ度診断 β",
  "希望条件の自動設定サポート",
  "求人の自動解析・要約 β",
  "保存した求人の管理",
  "よくある質問（サポート）",
  "フィードバック機能"
] as const;

const flowItems = [
  { title: "使ってみる", body: "実際にサービスを体験してみる", icon: "🖥️" },
  { title: "気づきを送る", body: "フィードバックをお寄せいただく", icon: "💭" },
  { title: "改善に活かす", body: "いただいた声をもとに改善を行う", icon: "⚙️" },
  { title: "より良い体験へ", body: "みんなで、もっと良い就活体験をつくる", icon: "🤝" }
] as const;

const faqItems = [
  "ベータ版とは何ですか？",
  "いつから利用できますか？",
  "途中でやめることはできますか？",
  "料金はかかりますか？"
] as const;

export default async function BetaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctaVariant = firstValue(params.cta_variant);
  const utmParams = {
    utmSource: firstValue(params.utm_source),
    utmMedium: firstValue(params.utm_medium),
    utmCampaign: firstValue(params.utm_campaign),
    utmContent: firstValue(params.utm_content),
    utmTerm: firstValue(params.utm_term)
  };

  return (
    <section className="marketing-surface min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#ffffff_18%,#ffffff_100%)] text-[#1f2937]">
      <MockSiteHeader />

      <div className="mx-auto w-full max-w-[1480px] px-6 pb-10 pt-6 xl:px-10">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_340px_420px] xl:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full bg-[#f1fbf1] px-4 py-2 text-sm font-bold text-[#2f9d47] shadow-[0_12px_30px_-28px_rgba(34,197,94,0.45)]">
              限定50名・参加無料
            </div>
            <div>
              <h1 className="text-[4.1rem] font-black leading-[1.05] tracking-[-0.07em] text-[#111827] xl:text-[4.7rem]">
                らくしゅう ベータ版
                <br />
                <span className="text-[#2fb14a]">参加受付中</span>
              </h1>
              <p className="mt-5 max-w-[620px] text-[1.15rem] font-semibold leading-9 text-[#364152]">
                らくしゅうを、あなたの就活パートナーに。
                <br />
                実際に使っていただき、より良いサービスづくりにご協力いただける
                初期ユーザーの方を募集しています。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {benefitCards.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-[#eceff3] bg-white px-5 py-4 shadow-[0_24px_56px_-46px_rgba(15,23,42,0.18)]">
                  <div className="text-2xl">{item.icon}</div>
                  <p className="mt-3 text-lg font-black text-[#1f8d39]">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-[#546171]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center pt-2">
            <Image src={rakumoThumbsUp} alt="親指を立てるらくしゅうキャラクター" priority className="h-auto w-full max-w-[320px] object-contain" />
            <div className="-mt-2 w-full rounded-[28px] border border-[#eceff3] bg-white px-6 py-5 text-center text-[1.15rem] font-black leading-9 text-[#283241] shadow-[0_24px_56px_-46px_rgba(15,23,42,0.18)]">
              一緒に、<span className="text-[#2fb14a]">もっと使いやすい</span>
              <br />
              サービスをつくりましょう！
            </div>
          </div>

          <div className="xl:row-span-2">
            <BetaIntakeForm ctaVariant={ctaVariant} utmParams={utmParams} page="/beta" />
          </div>

          <div className="grid gap-6 xl:col-span-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <article className="rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-3 text-[#1f8d39]">
                <span className="text-3xl">👑</span>
                <h2 className="text-[2rem] font-black tracking-[-0.04em] text-[#111827]">ベータ版参加のメリット</h2>
              </div>
              <div className="mt-5 space-y-5">
                {meritItems.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eef8ef] text-2xl">{item.icon}</div>
                    <div>
                      <p className="text-[1.2rem] font-black text-[#22a03b]">{item.title}</p>
                      <p className="mt-1 text-sm leading-7 text-[#546171]">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[32px] border border-[#eceff3] bg-[radial-gradient(circle_at_top,#f7fbf3_0%,#fefefb_100%)] p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.16)]">
              <div className="flex items-center gap-3">
                <h2 className="text-[1.9rem] font-black tracking-[-0.04em] text-[#111827]">現在ご利用いただける機能</h2>
                <span className="rounded-full bg-[#e6f6dd] px-3 py-1 text-sm font-black text-[#2ba643]">BETA</span>
              </div>
              <ul className="mt-5 space-y-4 text-[1.07rem] font-semibold text-[#364152]">
                {availableFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#31b14a] text-xs font-black text-white">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-7 text-[#7b8794]">※ 一部機能はベータ版のため、変更される可能性があります。</p>
            </article>

            <article className="rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)] xl:col-span-2">
              <h2 className="text-[2rem] font-black tracking-[-0.04em] text-[#111827]">フィードバックが、サービスを育てます</h2>
              <p className="mt-3 text-[1.05rem] leading-8 text-[#546171]">
                皆さんの声をもとに、らくしゅうは進化していきます。
                気づいたこと、改善してほしいこと、どんなことでもお聞かせください。
              </p>
              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                {flowItems.map((item, index) => (
                  <div key={item.title} className="rounded-[24px] border border-[#eceff3] bg-[#fffefd] p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.14)]">
                    <div className="text-2xl">{item.icon}</div>
                    <p className="mt-4 text-[1.15rem] font-black text-[#1f8d39]">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[#546171]">{item.body}</p>
                    {index < flowItems.length - 1 ? <div className="mt-4 text-xl font-black text-[#8f98a6]">→</div> : null}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-[#7b8794]">※ フィードバックは、アプリ内の「フィードバック」からいつでも送信できます。</p>
            </article>
          </div>
        </div>

        <aside className="mt-6 ml-auto w-full max-w-[420px] rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.7rem] font-black tracking-[-0.04em] text-[#111827]">よくある質問</h2>
            <a href="/about" className="text-base font-bold text-[#2ca44b]">すべて見る →</a>
          </div>
          <ul className="mt-5 space-y-3 text-base font-semibold text-[#364152]">
            {faqItems.map((item) => (
              <li key={item} className="flex items-center justify-between rounded-[18px] border border-[#edf1f4] px-4 py-3">
                <span>{item}</span>
                <span className="text-[#95a1ae]">›</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <MockSiteFooter copy="らくしゅうは、あなたの就活をやさしく、確かなデータでサポートします。" />
    </section>
  );
}
