import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Sparkles } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { AppNavLinks } from "@/components/app-nav-links";
import "./globals.css";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "らくしゅう",
  description: "就活情報の整理と見極めをやさしく支援するアプリ"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ja">
      <body>
        <header className="sticky top-0 z-40 border-b border-white/70 bg-slate-50/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <Link href={session?.user ? "/dashboard" : "/"} className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_30px_-16px_rgba(15,23,42,0.7)]">
                  <BriefcaseBusiness className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">らくしゅう</p>
                  <p className="text-xs text-slate-500">求人を見極めて、就活を整える</p>
                </div>
              </Link>

              {session?.user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-500 md:flex">
                    <Sparkles className="size-4 text-rakushu-500" />
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
                <p className="hidden text-xs text-slate-500 lg:block">
                  ランク付けから求人整理まで、同じ流れで進められます。
                </p>
              </div>
            ) : null}
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
