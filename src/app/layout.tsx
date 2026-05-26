import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Sparkles } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { AppNavLinks } from "@/components/app-nav-links";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { getSiteOrigin } from "../lib/site";

const siteName = "らくしゅう";
const defaultTitle = "求人を見極めて、就活を整える";
const defaultDescription = "求人票の条件差や危険信号を整理し、納得できる求人だけを保存・比較しやすくする就活ワークスペース";
const defaultGoogleSiteVerification = "NcOgsMkKevVP1gYlcxCOIaynqmoCEKKHvokL0cdT1-U";
const googleSiteVerification =
  process.env.GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION ?? process.env.GOOGLE_SITE_VERIFICATION ?? defaultGoogleSiteVerification;

export const metadata: Metadata = {
  metadataBase: getSiteOrigin(),
  title: {
    default: `${siteName} | ${defaultTitle}`,
    template: `%s | ${siteName}`
  },
  description: defaultDescription,
  applicationName: siteName,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName,
    title: `${siteName} | ${defaultTitle}`,
    description: defaultDescription
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | ${defaultTitle}`,
    description: defaultDescription
  },
  verification: {
    google: googleSiteVerification
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ja">
      <body>
        <header className="sticky top-0 z-40 border-b border-rakumo-border/80 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <Link href={session?.user ? "/dashboard" : "/"} className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rakumo-mint/50 bg-rakumo-mint/85 text-rakumo-ink shadow-[0_14px_30px_-16px_rgba(125,211,199,0.55)]">
                  <BriefcaseBusiness className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rakumo-ink">らくしゅう</p>
                  <p className="text-xs text-rakumo-ink/65">求人を見極めて、就活を整える</p>
                </div>
              </Link>

              {session?.user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-full border border-rakumo-border bg-white/90 px-3 py-2 text-xs text-rakumo-ink/70 md:flex">
                    <Sparkles className="size-4 text-rakumo-peach" />
                    <span>{session.user.name} さんの評価ワークスペース</span>
                  </div>
                  <AccountMenu image={session.user.image ?? null} name={session.user.name ?? null} />
                </div>
              ) : (
                <Link href="/login" className="button-primary">
                  ログイン
                </Link>
              )}
            </div>

            {session?.user ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <AppNavLinks />
                <p className="hidden text-xs text-rakumo-ink/65 lg:block">
                  ランク付けから求人整理まで、同じ流れで進められます。
                </p>
              </div>
            ) : null}
          </div>
        </header>
        <main className="page-shell">{children}</main>
        <footer className="border-t border-rakumo-border/80 bg-white">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-rakumo-ink/70 md:flex-row md:items-center md:justify-between md:px-6">
            <p>© {new Date().getFullYear()} らくしゅう</p>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href="/legal/commerce" className="underline-offset-2 hover:underline">特定商取引法に基づく表記</Link>
              <Link href="/legal/terms" className="underline-offset-2 hover:underline">利用規約</Link>
              <Link href="/legal/privacy" className="underline-offset-2 hover:underline">プライバシーポリシー</Link>
              <Link href="/legal/refund" className="underline-offset-2 hover:underline">返金・キャンセルポリシー</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
