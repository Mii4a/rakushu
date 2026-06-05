"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Mail, Search, ShieldCheck } from "lucide-react";

import { MockSiteFooter, MockSiteHeader } from "@/components/mock-site-chrome";
import supportHeadphoneIcon from "../../UI-mock/about/icons/headphone.png";
import faqThinkingCharacter from "../../UI-mock/about/character/rakumo_thinking_question.png";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const faqItems: readonly FaqItem[] = [
  {
    id: "privacy",
    question: "求人の情報は公開されますか？",
    answer:
      "いいえ、公開されません。らくしゅうに貼り付けていただいた求人のテキストやURLは、あなたのアカウント内での解析・管理に使われ、第三者に公開されることはありません。安心してご利用ください。"
  },
  {
    id: "url-only",
    question: "URLだけでも解析できますか？",
    answer:
      "現状は、求人URLに加えて求人本文や要点があると、より安定して評価できます。媒体や掲載形式によってはURLだけでは十分な情報を取得できないため、本文も一緒に入れていただくのがおすすめです。"
  },
  {
    id: "free-plan",
    question: "無料プランでどこまで使えますか？",
    answer:
      "無料プランでも求人の貼り付け、基本的な解析、保存済み求人の確認までは試せます。保存件数や一部の高度な比較・管理機能は、今後のプランに応じて制限される場合があります。"
  },
  {
    id: "auto-apply",
    question: "企業に応募は自動で行われますか？",
    answer:
      "いいえ、らくしゅうが企業へ自動応募することはありません。あくまで求人内容の整理・比較・判断補助のためのサービスで、応募操作そのものはご自身で行っていただきます。"
  },
  {
    id: "match-score",
    question: "マッチ度は何を基準にしていますか？",
    answer:
      "給与、休日、雇用形態、固定残業、福利厚生など、求人票から読み取れる条件をもとに判断します。あなたが重視したい条件と照らし合わせて、見落としを減らすための参考スコアとして表示しています。"
  }
] as const;

function FaqRow({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <article className="rounded-[26px] border border-[#ebeff3] bg-white px-6 py-5 shadow-[0_24px_60px_-52px_rgba(15,23,42,0.12)] sm:px-7">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef9ef] text-[1.3rem] font-black text-[#28a745]">
          Q
        </span>
        <span className="flex-1 text-[1.12rem] font-black tracking-[-0.03em] text-[#17202a] sm:text-[1.26rem]">{item.question}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#2fb14a] transition ${open ? "rotate-180" : "rotate-0"}`}>
          <ChevronDown className="h-6 w-6" />
        </span>
      </button>

      {open ? (
        <div className="mt-5 flex items-start gap-4 border-t border-[#eef2f5] pt-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2fae4a] text-sm font-black text-white">
            A
          </span>
          <p className="max-w-[880px] text-[1rem] font-medium leading-9 text-[#334155] sm:text-[1.05rem]">{item.answer}</p>
        </div>
      ) : null}
    </article>
  );
}

export function AboutFaqPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>(faqItems[0]?.id ?? "");

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [...faqItems];
    return faqItems.filter((item) => {
      return item.question.toLowerCase().includes(normalized) || item.answer.toLowerCase().includes(normalized);
    });
  }, [query]);

  const hasResults = filteredFaqs.length > 0;

  return (
    <section className="marketing-surface min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#ffffff_18%,#ffffff_100%)] text-[#1f2937]">
      <MockSiteHeader activeHref="/about" />

      <div className="mx-auto w-full max-w-[1480px] px-6 pb-10 pt-8 xl:px-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_345px] xl:items-start">
          <div>
            <section className="grid gap-8 xl:grid-cols-[minmax(0,0.58fr)_minmax(320px,0.42fr)] xl:items-center">
              <div className="space-y-5 py-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eef9ef] px-4 py-2 text-sm font-black text-[#2f9f48] shadow-[0_14px_34px_-28px_rgba(34,197,94,0.42)]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2faa45] text-xs text-white">?</span>
                  疑問を解決して、もっとラクに。
                </div>
                <div>
                  <h1 className="text-[3.6rem] font-black leading-[1.02] tracking-[-0.08em] text-[#111827] md:text-[4.65rem]">
                    よくある<span className="text-[#26ad45]">質問</span>
                  </h1>
                  <p className="mt-6 max-w-[560px] text-[1.15rem] font-semibold leading-9 text-[#374151]">
                    らくしゅうの使い方や機能、プランについて、
                    <br />
                    よくいただくご質問をまとめました。
                  </p>
                </div>
              </div>

              <div className="flex justify-center xl:justify-end">
                <Image
                  src={faqThinkingCharacter}
                  alt="疑問を考えているらくしゅうキャラクター"
                  priority
                  className="h-auto w-full max-w-[420px] object-contain drop-shadow-[0_24px_50px_rgba(15,23,42,0.12)]"
                />
              </div>
            </section>

            <section id="faq-list" className="mt-2 rounded-[34px] border border-[#edf1f4] bg-white/95 p-6 shadow-[0_34px_90px_-64px_rgba(15,23,42,0.22)] sm:p-7 xl:p-8">
              <div className="rounded-[20px] border border-[#e8edf2] bg-white px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <label htmlFor="faq-search" className="flex items-center gap-3 text-[#8b97a6]">
                  <Search className="h-6 w-6 shrink-0" />
                  <input
                    id="faq-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="キーワードで検索（例：求人の公開、プラン、応募）"
                    className="w-full border-none bg-transparent text-[1.05rem] font-semibold text-[#1f2937] outline-none placeholder:text-[#98a2b3]"
                  />
                </label>
              </div>

              <div className="mt-5 space-y-3.5">
                {hasResults ? (
                  filteredFaqs.map((item) => (
                    <FaqRow key={item.id} item={item} open={openId === item.id} onToggle={() => setOpenId((current) => (current === item.id ? "" : item.id))} />
                  ))
                ) : (
                  <div className="rounded-[26px] border border-dashed border-[#d9e2ea] bg-[#fcfdfc] px-6 py-10 text-center">
                    <p className="text-[1.2rem] font-black text-[#1f2937]">該当する質問が見つかりませんでした</p>
                    <p className="mt-2 text-[0.98rem] font-medium leading-8 text-[#64748b]">キーワードを変えるか、下のサポート導線からご相談ください。</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col items-center gap-4 pb-2 pt-4 text-center">
                <div className="flex w-full max-w-[420px] items-center gap-4 text-sm font-semibold text-[#7d8896]">
                  <span className="h-px flex-1 bg-[#e7ecf0]" />
                  <span className="inline-flex items-center gap-2"><span className="text-base">◌</span>まだ質問が見つからない場合</span>
                  <span className="h-px flex-1 bg-[#e7ecf0]" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setOpenId(faqItems[0]?.id ?? "");
                  }}
                  className="inline-flex items-center gap-3 rounded-[18px] border border-[#dfe7de] bg-white px-8 py-4 text-[1.12rem] font-black text-[#27a845] shadow-[0_18px_42px_-34px_rgba(34,197,94,0.28)] hover:bg-[#f9fdf8]"
                >
                  <Search className="h-5 w-5" />
                  すべての質問を見る
                  <span aria-hidden>→</span>
                </button>
              </div>
            </section>
          </div>

          <aside className="space-y-5 xl:pt-[248px]">
            <section className="rounded-[30px] border border-[#edf1f4] bg-white p-6 text-center shadow-[0_30px_80px_-58px_rgba(15,23,42,0.2)] sm:p-7">
              <div className="relative mx-auto flex h-[142px] w-[142px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#ffffff_0%,#f7faf9_100%)] shadow-[0_26px_55px_-40px_rgba(15,23,42,0.18)]">
                <Image src={supportHeadphoneIcon} alt="サポートのヘッドセットアイコン" className="h-auto w-[86px] object-contain" />
                <span className="absolute left-3 top-9 text-[1.6rem] text-[#ffb300]">✦</span>
                <span className="absolute right-3 top-2 text-[1.5rem] text-[#ffb300]">✦</span>
                <span className="absolute right-0 top-10 text-[1.6rem] text-[#ffb300]">✦</span>
              </div>

              <h2 className="mt-6 text-[2rem] font-black tracking-[-0.05em] text-[#111827]">解決しない場合</h2>
              <p className="mt-4 text-[1rem] font-medium leading-9 text-[#475569]">
                ご不明点が解決しない場合は、
                <br />
                お気軽にご案内ページからご連絡ください。
                <br />
                導入前の不安整理もお手伝いします。
              </p>

              <Link
                href="/contact"
                className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-[16px] bg-[linear-gradient(180deg,#34af4d_0%,#269e3f_100%)] px-5 py-4 text-[1.2rem] font-black text-white shadow-[0_24px_55px_-34px_rgba(34,197,94,0.52)]"
              >
                <Mail className="h-5 w-5" />
                お問い合わせ
              </Link>
              <p className="mt-3 text-sm font-semibold text-[#94a3b8]">通常24時間以内にご返信します</p>

              <Link
                href="/#how-to"
                className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-[16px] border border-[#dce4ea] bg-white px-5 py-4 text-[1.1rem] font-black text-[#1f2937] shadow-[0_14px_34px_-32px_rgba(15,23,42,0.12)]"
              >
                <BookOpen className="h-5 w-5" />
                使い方を見る
              </Link>
            </section>

            <section className="rounded-[24px] border border-[#e3efe1] bg-[linear-gradient(180deg,#f8fcf7_0%,#f3faf2_100%)] px-5 py-5 shadow-[0_22px_56px_-42px_rgba(34,197,94,0.18)] sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#30a94a] shadow-[0_18px_40px_-34px_rgba(34,197,94,0.35)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[0.98rem] font-bold leading-8 text-[#4f8b57]">安心してご利用いただけるよう
                    <br />セキュリティとプライバシーを
                    <br />最優先にしています。</p>
                  <Link href="/legal/privacy" className="mt-5 inline-flex items-center gap-2 text-[1rem] font-black text-[#29a645]">
                    プライバシーポリシーを見る
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <MockSiteFooter copy="気になることをすぐ確認できるように、らくしゅうは情報のわかりやすさと安心感を大切にしています。" />
    </section>
  );
}
