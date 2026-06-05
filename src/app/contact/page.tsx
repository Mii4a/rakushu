import type { Metadata } from "next";
import Image from "next/image";

import { BetaIntakeForm } from "@/components/beta-intake-form";
import { MockSiteFooter, MockSiteHeader } from "@/components/mock-site-chrome";
import supportHeadphoneIcon from "../../../UI-mock/about/icons/headphone.png";
import rakumoThumbsUp from "../../../UI-mock/beta/character/rakumo-thumbs-up.png";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "らくしゅうへのお問い合わせ・β版参加のご相談ページ。導入前の不安やご質問をまとめて送れます。",
  alternates: {
    canonical: "/contact"
  },
  openGraph: {
    title: "らくしゅう お問い合わせ",
    description: "らくしゅうへのお問い合わせ・β版参加のご相談ページ。",
    url: "/contact"
  },
  twitter: {
    title: "らくしゅう お問い合わせ",
    description: "らくしゅうへのお問い合わせ・β版参加のご相談ページ。"
  }
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

const contactReasons = [
  {
    title: "導入前の不安を相談したい",
    body: "求人の見方や、どこまで比較できるかを事前に確認できます。"
  },
  {
    title: "β版に参加してみたい",
    body: "今の就活状況に合わせて、先行案内の対象かどうかをご案内します。"
  },
  {
    title: "要望やフィードバックを送りたい",
    body: "こうしてほしい、ここが不安、という声をそのまま届けられます。"
  }
] as const;

const reassuranceItems = [
  "通常3営業日以内にご連絡します",
  "入力内容はご案内と改善のためだけに使用します",
  "営業色の強い連絡は行いません"
] as const;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctaVariant = firstValue(params.cta_variant) ?? "contact-page";
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

      <div className="mx-auto w-full max-w-[1480px] px-6 pb-10 pt-8 xl:px-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_430px] xl:items-start">
          <div className="space-y-7">
            <section className="grid gap-7 xl:grid-cols-[minmax(0,0.64fr)_minmax(280px,0.36fr)] xl:items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eef9ef] px-4 py-2 text-sm font-black text-[#2f9f48] shadow-[0_14px_34px_-28px_rgba(34,197,94,0.42)]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2faa45] text-xs text-white">✓</span>
                  お問い合わせ・先行案内
                </div>
                <div>
                  <h1 className="text-[3.5rem] font-black leading-[1.02] tracking-[-0.08em] text-[#111827] md:text-[4.45rem]">
                    気になることを
                    <br />
                    <span className="text-[#26ad45]">まとめて相談</span>
                  </h1>
                  <p className="mt-6 max-w-[620px] text-[1.12rem] font-semibold leading-9 text-[#374151]">
                    らくしゅうの導入前に不安なこと、β版への参加相談、
                    <br />
                    要望やフィードバックまで、このページからまとめて送れます。
                  </p>
                </div>
              </div>

              <div className="flex justify-center xl:justify-end">
                <div className="w-full max-w-[300px]">
                  <Image src={rakumoThumbsUp} alt="案内するらくしゅうキャラクター" priority className="h-auto w-full object-contain drop-shadow-[0_24px_50px_rgba(15,23,42,0.12)]" />
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#edf1f4] bg-white/95 p-6 shadow-[0_34px_90px_-64px_rgba(15,23,42,0.22)] sm:p-7 xl:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-[2rem] font-black tracking-[-0.05em] text-[#111827]">こんなときに使えます</h2>
                  <p className="mt-2 text-[1rem] font-medium leading-8 text-[#64748b]">フォーム送信前に、相談のイメージをつかめるようにしました。</p>
                </div>
                <div className="relative flex h-[94px] w-[94px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#ffffff_0%,#f7faf9_100%)] shadow-[0_26px_55px_-40px_rgba(15,23,42,0.18)]">
                  <Image src={supportHeadphoneIcon} alt="サポートのヘッドセットアイコン" className="h-auto w-[56px] object-contain" />
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {contactReasons.map((item, index) => (
                  <article key={item.title} className="rounded-[24px] border border-[#ebeff3] bg-[#fcfdfc] px-5 py-5 shadow-[0_20px_48px_-42px_rgba(15,23,42,0.12)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef9ef] text-[1rem] font-black text-[#28a745]">0{index + 1}</div>
                    <h3 className="mt-4 text-[1.18rem] font-black tracking-[-0.03em] text-[#17202a]">{item.title}</h3>
                    <p className="mt-2 text-[0.98rem] font-medium leading-8 text-[#475569]">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#e3efe1] bg-[linear-gradient(180deg,#f8fcf7_0%,#f3faf2_100%)] px-6 py-6 shadow-[0_22px_56px_-42px_rgba(34,197,94,0.18)] sm:px-7">
              <h2 className="text-[1.55rem] font-black tracking-[-0.04em] text-[#111827]">安心して送って大丈夫です</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {reassuranceItems.map((item) => (
                  <div key={item} className="rounded-[20px] border border-[#dfeadb] bg-white px-4 py-4 text-[0.98rem] font-semibold leading-7 text-[#4f8b57]">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="xl:pt-2">
            <BetaIntakeForm ctaVariant={ctaVariant} utmParams={utmParams} page="/contact" />
          </aside>
        </div>
      </div>

      <MockSiteFooter copy="気になることを相談しやすいように、らくしゅうは導入前の不安もフィードバックも、同じ窓口で受け止めます。" />
    </section>
  );
}