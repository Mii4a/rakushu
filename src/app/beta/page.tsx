import type { Metadata } from "next";
import Link from "next/link";

import { BetaIntakeForm } from "@/components/beta-intake-form";

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
    <section className="page-stack bg-[linear-gradient(180deg,#fffdfa_0%,#fdfefe_100%)] px-4 py-8 text-[#17355b] lg:px-8">
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
        <article className="rounded-[28px] border border-[#dce7ee] bg-white p-6 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.28)]">
          <p className="text-sm font-bold text-[#1ea9a4]">SNSから来た人向けの先行案内</p>
          <h2 className="mt-3 text-[2.1rem] font-black leading-tight text-[#17355b]">らくしゅうは、求人票の不安を先に減らしたい人のための案内制β版</h2>
          <p className="mt-4 text-sm leading-8 text-[#4f6a80]">
            ブラック求人の危険信号や、比較しづらい条件差を整理しやすくするための道具を作ってる。
            今は少人数で改善を回したいから、悩みの内容や使い方の相性を見ながら順番に案内している。
          </p>

          <div className="mt-6 rounded-[24px] border border-[#ffe2cf] bg-[#fff8f3] p-5">
            <p className="text-base font-black text-[#17355b]">先に共有しておきたいこと</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-[#35546f]">
              <li>・まだ改善中のβ版です</li>
              <li>・すべての求人媒体や求人文で完全対応しているわけではありません</li>
              <li>・比較材料が薄い求人は「本文未記載」「要確認」が増えることがあります</li>
              <li>・状況を見ながら少人数ずつ順番に案内します</li>
            </ul>
          </div>

          <div className="mt-6 rounded-[24px] bg-[#f7fbfd] p-5">
            <p className="text-base font-black text-[#17355b]">いま拾いたいシグナル</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-[#35546f]">
              <li>・求人票のどこが不安で止まるか</li>
              <li>・比較のたびに手間になるポイントは何か</li>
              <li>・応募管理までつながると本当に楽か</li>
            </ul>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[20px] border border-[#dce7ee] p-4">
              <p className="text-sm font-black text-[#17355b]">向いている人</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#4f6a80]">
                <li>・求人比較で毎回迷う</li>
                <li>・本文を貼って整理する流れを試したい</li>
                <li>・保存や応募管理まで一緒に見たい</li>
              </ul>
            </div>
            <div className="rounded-[20px] border border-[#dce7ee] p-4">
              <p className="text-sm font-black text-[#17355b]">まだ向いていない人</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#4f6a80]">
                <li>・どの求人でも完璧に自動判定してほしい</li>
                <li>・説明なしですぐ公開サービス品質を期待している</li>
                <li>・課金込みの完成版だけを探している</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-sm font-semibold text-[#35546f]">
            <Link href="/" className="text-[#129995] hover:underline">
              ← トップに戻る
            </Link>
            <Link href="/pricing" className="text-[#129995] hover:underline">
              料金プランを見る →
            </Link>
          </div>
        </article>

        <BetaIntakeForm ctaVariant={ctaVariant} utmParams={utmParams} page="/beta" />
      </div>
    </section>
  );
}
