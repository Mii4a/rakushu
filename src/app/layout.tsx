import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "らくしゅう",
  description: "就活情報の整理と分析をやさしく支援するアプリ"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ja">
      <body>
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-rakushu-700">
              らくしゅう
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="text-slate-700 hover:text-rakushu-700">
                    ダッシュボード
                  </Link>
                  <Link href="/jobs" className="text-slate-700 hover:text-rakushu-700">
                    求人
                  </Link>
                  <Link href="/pricing" className="text-slate-700 hover:text-rakushu-700">
                    料金
                  </Link>
                </>
              ) : (
                <Link href="/login" className="text-slate-700 hover:text-rakushu-700">
                  ログイン
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
