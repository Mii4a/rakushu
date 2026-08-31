"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Clock3,
  FileText,
  HelpCircle,
  Mic,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  X
} from "lucide-react";

import { GoogleLoginButton } from "@/components/google-login-button";
import { MarketingEventTracker } from "@/components/marketing-event-tracker";
import { writeTopDemoIntent, type TopDemoFeature } from "@/lib/top-demo-intent";

const productNavItems = [
  { key: "job-checker", label: "求人チェッカー", icon: Search },
  { key: "company-research", label: "企業研究", icon: Building2 }
] as const;

type ProductPreviewTab = (typeof productNavItems)[number]["key"];

const companyResearchItems = [
  { title: "会社概要", body: "企業の基本情報や沿革、規模などを整理", icon: Building2 },
  { title: "事業内容", body: "事業・サービスの内容や強みを分析", icon: BriefcaseBusiness },
  { title: "競合", body: "競合企業や業界内での立ち位置を分析", icon: Clock3 },
  { title: "社風", body: "企業の価値観や働く環境の特徴を分析", icon: UsersRound },
  { title: "志望動機に使えるポイント", body: "選考で使える魅力や強みを整理", icon: Star }
] as const;

const proofItems = [
  { title: "安心のセキュリティ", body: "ISO/IEC 27001 準拠", icon: ShieldCheck },
  { title: "就活特化のAI", body: "最新AIが徹底サポート", icon: Sparkles },
  { title: "多くの就活生が利用", body: "累計登録者数 20万人以上", icon: UsersRound }
] as const;

const featureCards = [
  { title: "求人チェッカー", body: "求人票をAIが分析し、あなたとの相性や注意点をチェックします。", icon: ClipboardCheck },
  { title: "企業研究", body: "企業の強みや事業内容をAIが分析。深い理解で志望動機を強化します。", icon: Building2 },
  { title: "履歴書 AI", body: "魅力が伝わる自己PRをAIが提案。通過率の高い書類を作成します。", icon: FileText },
  { title: "AI 面接", body: "本番さながらの面接練習で、自信を持って本番に臨めます。", icon: Mic }
] as const;

function FeatureCard({ title, body, icon: Icon }: (typeof featureCards)[number]) {
  return (
    <article className="flex min-h-[126px] items-center gap-6 rounded-[8px] border border-[#e3e6eb] bg-white px-7 py-6 text-left shadow-[0_18px_42px_-34px_rgba(15,23,42,0.24)]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f4f5f6] text-[#0b0b0b]" aria-hidden="true">
        <Icon className="h-9 w-9 stroke-[1.9]" />
      </div>
      <div>
        <h3 className="text-[1.55rem] font-black tracking-[-0.04em] text-[#0b0b0b]">{title}</h3>
        <p className="mt-2 text-[0.98rem] font-medium leading-7 text-[#3f4652]">{body}</p>
      </div>
    </article>
  );
}

function ProductPreview({ onLoginRequired }: { onLoginRequired: (event: MouseEvent<HTMLButtonElement>, feature: TopDemoFeature) => void }) {
  const [activeTab, setActiveTab] = useState<ProductPreviewTab>("job-checker");
  const [jobText, setJobText] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const isCompanyResearch = activeTab === "company-research";

  const openLoginForJobChecker = (event: MouseEvent<HTMLButtonElement>) => {
    writeTopDemoIntent({
      source: "top-demo",
      feature: "job-checker",
      payload: { jobText },
      createdAt: Date.now()
    });
    onLoginRequired(event, "job-checker");
  };

  const openLoginForCompanyResearch = (event: MouseEvent<HTMLButtonElement>) => {
    writeTopDemoIntent({
      source: "top-demo",
      feature: "company-research",
      payload: { companyUrl },
      createdAt: Date.now()
    });
    onLoginRequired(event, "company-research");
  };

  return (
    <aside aria-label={isCompanyResearch ? "企業研究のプレビュー" : "求人チェッカーのプレビュー"} className="overflow-hidden rounded-[18px] border border-[#dfe3e8] bg-white shadow-[0_24px_62px_-44px_rgba(15,23,42,0.36)]">
      <div className="grid min-h-[492px] lg:grid-cols-[282px_minmax(0,1fr)]">
        <div className="border-b border-[#e5e7eb] bg-white p-8 lg:border-b-0 lg:border-r">
          <p className="text-[1.25rem] font-black tracking-[-0.04em] text-[#0b0b0b]">らくしゅう</p>
          <nav className="mt-9 space-y-3" aria-label="プレビュー内ナビゲーション">
            {productNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeTab;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveTab(item.key)}
                  className={`relative flex min-h-[56px] w-full items-center gap-4 rounded-[8px] px-5 text-left text-[1rem] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827] ${active ? "bg-[#f1f6fc] text-[#111827] before:absolute before:left-[-24px] before:top-1/2 before:h-9 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[#2387e8]" : "text-[#1f2937] hover:bg-[#f7f9fb]"}`}
                >
                  <Icon className="h-6 w-6 stroke-[1.8]" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-14 border-t border-[#e5e7eb] pt-10">
            <div className="flex items-center justify-between gap-4 text-[#111827]">
              <div className="flex items-center gap-4">
                <MessageSquare className="h-7 w-7 stroke-[1.8]" aria-hidden="true" />
                <span className="text-[1rem] font-bold">みんなで知恵袋</span>
              </div>
              <span className="text-[1.6rem] leading-none" aria-hidden="true">›</span>
            </div>
            <p className="mt-3 text-[0.88rem] font-medium text-[#8b949e]">就活の悩みをみんなに相談</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.04em] text-[#0b0b0b]">{isCompanyResearch ? "企業研究" : "求人チェッカー"}</h2>
              <p className="mt-2 text-[0.95rem] font-medium text-[#555f6d]">{isCompanyResearch ? "企業URLを入力して分析" : "求人票を貼り付けてチェック"}</p>
            </div>
            <Link href="#features" className="inline-flex items-center gap-1 text-[0.92rem] font-bold text-[#2c82c9] hover:text-[#165f9e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              使い方
            </Link>
          </div>

          {isCompanyResearch ? (
            <div className="mt-5">
              <label htmlFor="top-company-url" className="text-[0.95rem] font-bold text-[#111827]">
                企業のURL
              </label>
              <input
                id="top-company-url"
                type="url"
                aria-label="企業のURL"
                value={companyUrl}
                onChange={(event) => setCompanyUrl(event.target.value)}
                placeholder="https://company.example.com"
                className="mt-2 h-[50px] w-full rounded-[8px] border border-[#cfd5dd] bg-white px-4 text-[0.95rem] font-medium text-[#111827] outline-none placeholder:text-[#8b949e] focus:border-[#1d6ed1] focus:ring-2 focus:ring-[#1d6ed1]/20"
              />
              <p className="mt-2 text-[0.82rem] font-medium text-[#555f6d]">企業の公式サイトのURLを入力してください</p>

              <p className="mt-7 text-[0.95rem] font-bold text-[#111827]">分析する内容（自動で調査・分析します）</p>
              <div className="mt-3 overflow-hidden rounded-[8px] border border-[#cfd5dd] bg-white">
                <div className="grid sm:grid-cols-2">
                  {companyResearchItems.map((item, index) => {
                    const Icon = item.icon;
                    const fullWidth = index === companyResearchItems.length - 1;
                    return (
                      <div key={item.title} className={`flex min-h-[72px] items-center gap-4 border-[#e1e5ea] px-5 py-3 ${index > 1 ? "border-t" : ""} ${index % 2 === 1 ? "sm:border-l" : ""} ${fullWidth ? "sm:col-span-2" : ""}`}>
                        <Icon className="h-7 w-7 shrink-0 stroke-[1.8] text-[#111827]" aria-hidden="true" />
                        <div>
                          <p className="text-[0.95rem] font-black text-[#111827]">{item.title}</p>
                          <p className="mt-1 text-[0.78rem] font-medium text-[#555f6d]">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={openLoginForCompanyResearch} className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-[7px] bg-[#003a91] px-6 text-[0.98rem] font-bold text-white shadow-[0_14px_34px_-24px_rgba(0,39,112,0.7)] hover:bg-[#002f75] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
                企業研究を開始する
              </button>
            </div>
          ) : (
            <>
              <textarea aria-label="求人票テキスト" value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="求人内容をコピー＆ペーストしてください" className="mt-5 h-[270px] w-full resize-none rounded-[8px] border border-[#cfd5dd] bg-white px-5 py-4 text-[0.82rem] font-medium leading-[1.55] text-[#111827] outline-none placeholder:text-[#8b949e]" />
              <button type="button" onClick={openLoginForJobChecker} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-[7px] bg-[#003a91] px-6 text-[0.98rem] font-bold text-white shadow-[0_14px_34px_-24px_rgba(0,39,112,0.7)] hover:bg-[#002f75] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
                チェックする
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function LoginModal({ open, onClose, callbackPath }: { open: boolean; onClose: () => void; callbackPath: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-8" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-[462px] rounded-[16px] bg-white px-10 pb-11 pt-16 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.6)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="ログインモーダルを閉じる"
          onClick={onClose}
          className="absolute right-6 top-6 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f7] text-[#111827] hover:bg-[#eceff2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="text-center">
          <h2 id={titleId} className="text-[2rem] font-black tracking-[-0.055em] text-[#0b0b0b]">
            ログインして始める
          </h2>
          <p id={descriptionId} className="mt-5 text-[1rem] font-semibold text-[#7b7f86]">
            続行するにはログインしてください
          </p>
        </div>
        <div className="mt-10">
          <GoogleLoginButton variant="top-modal" label="Googleでログイン" callbackPath={callbackPath} />
        </div>
      </div>
    </div>
  );
}

export function TopLandingPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginCallbackPath, setLoginCallbackPath] = useState("/jobs/new");
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openLoginModal = useCallback((event: MouseEvent<HTMLButtonElement>, feature?: TopDemoFeature) => {
    lastTriggerRef.current = event.currentTarget;
    if (feature === "job-checker") {
      setLoginCallbackPath("/jobs/new?restoreDemo=1");
    } else if (feature === "company-research") {
      setLoginCallbackPath("/company-research?restoreDemo=1");
    } else {
      setLoginCallbackPath("/jobs/new");
    }
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }, []);

  return (
    <section className="home-demo-shell min-h-screen bg-white text-[#0b0b0b]">
      <MarketingEventTracker eventType="lp_view" />
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-8 px-9 py-3.5">
          <Link href="/" className="whitespace-nowrap text-[2.05rem] font-black tracking-[-0.08em] text-[#0b0b0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
            らくしゅう
          </Link>
          <nav aria-label="トップページ" className="ml-auto hidden items-center gap-16 text-[1rem] font-bold text-[#0b0b0b] md:flex">
            <Link href="#features" className="hover:text-[#374151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">機能</Link>
            <Link href="/pricing" className="hover:text-[#374151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">料金</Link>
            <button type="button" onClick={openLoginModal} className="font-bold hover:text-[#374151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
              ログイン
            </button>
          </nav>
          <button type="button" onClick={openLoginModal} className="inline-flex min-h-[48px] items-center justify-center rounded-[7px] bg-[#0b0b0b] px-8 text-[1rem] font-bold text-white shadow-[0_12px_28px_-20px_rgba(0,0,0,0.7)] hover:bg-[#1f1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
            無料で始める
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1536px] px-9 pb-10 pt-9">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(620px,1.18fr)] lg:items-start">
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#aeb4bd] bg-white px-4 py-1.5 text-[0.9rem] font-bold text-[#364152]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              就活支援AI SaaS
            </div>
            <h1 className="mt-8 max-w-[670px] text-[clamp(3rem,3.75vw,3.75rem)] font-black leading-[1.18] tracking-[-0.075em] text-[#0b0b0b]">
              確実に一つの企業への<br />選考を完遂する
            </h1>
            <p className="mt-6 max-w-[620px] text-[1.1rem] font-medium leading-[2] text-[#303846]">
              求人チェックから企業研究、履歴書作成、面接対策まで、就活の全プロセスをらくしゅうがワンストップでサポートします。
            </p>
            <div className="mt-9 flex flex-col gap-5 sm:flex-row">
              <button type="button" onClick={openLoginModal} className="inline-flex min-h-[64px] min-w-[254px] items-center justify-center rounded-[7px] bg-[#0b0b0b] px-10 text-[1.12rem] font-black text-white shadow-[0_16px_34px_-22px_rgba(0,0,0,0.7)] hover:bg-[#1f1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
                無料で始める
              </button>
              <Link href="#features" className="inline-flex min-h-[64px] min-w-[224px] items-center justify-center rounded-[7px] border-2 border-[#0b0b0b] bg-white px-10 text-[1.12rem] font-black text-[#0b0b0b] hover:bg-[#f8f8f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111827]">
                機能を見る
              </Link>
            </div>
            <div className="mt-11 grid max-w-[700px] gap-5 sm:grid-cols-3">
              {proofItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={`flex items-center gap-4 ${index > 0 ? "sm:border-l sm:border-[#dfe3e8] sm:pl-6" : ""}`}>
                    <Icon className="h-11 w-11 shrink-0 stroke-[1.8] text-[#0b0b0b]" aria-hidden="true" />
                    <div>
                      <p className="text-[0.95rem] font-black text-[#111827]">{item.title}</p>
                      <p className="mt-1 text-[0.76rem] font-medium text-[#687281]">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ProductPreview onLoginRequired={openLoginModal} />
        </section>

        <section id="features" className="mt-14 text-center">
          <h2 className="text-[2rem] font-black tracking-[0.08em] text-[#0b0b0b]">らくしゅうでできること</h2>
          <p className="mt-3 text-[1rem] font-medium text-[#8a8f98]">就活のあらゆる場面で、あなたの可能性を最大化します</p>
          <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>
      </main>

      <LoginModal open={loginModalOpen} onClose={closeLoginModal} callbackPath={loginCallbackPath} />
    </section>
  );
}
