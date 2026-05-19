"use client";

import Link from "next/link";
import { Bookmark, FileSearch, Home, PanelLeftClose, PanelLeftOpen, Plane, Settings } from "lucide-react";
import { useState } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";

export function ResumeWorkspaceShell({
  plan,
  children,
}: {
  plan: string;
  children: React.ReactNode;
}) {
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(false);

  return (
    <section className="dashboard-frame">
      <div
        className={`mx-auto grid w-full max-w-[1760px] gap-5 lg:items-start ${
          desktopSidebarVisible ? "lg:grid-cols-[260px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]"
        }`}
      >
        <DashboardSidebar
          activeKey="resume"
          note="履歴書下書きは Pro プラン向けの作業スペースです。保存した内容を次回以降の初期値として再利用できます。"
          desktopVisible={desktopSidebarVisible}
        />

        <div className="dashboard-main">
          <div className="page-stack">
            {plan !== "pro" ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                この機能はProプラン限定です。<Link href="/pricing" className="underline">料金ページ</Link>からアップグレードできます。
              </div>
            ) : null}

            <div className="rounded-[34px] border border-rakumo-border bg-white p-4 shadow-[0_22px_44px_-34px_rgba(45,58,74,0.3)] md:p-6">
              {children}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDesktopSidebarVisible((current) => !current)}
          className="fixed bottom-4 left-4 z-40 hidden items-center gap-2 rounded-2xl border border-rakumo-border bg-white px-4 py-3 text-sm font-bold text-rakumo-ink shadow-[0_18px_36px_-24px_rgba(45,58,74,0.28)] lg:inline-flex"
        >
          {desktopSidebarVisible ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          <span>{desktopSidebarVisible ? "サイドバーを閉じる" : "サイドバーを開く"}</span>
        </button>

        <nav className="dashboard-mobile-nav">
          <Link href="/dashboard" className="dashboard-mobile-nav-item">
            <Home className="size-5" />
            <span>ホーム</span>
          </Link>
          <Link href="/jobs/new" className="dashboard-mobile-nav-item">
            <FileSearch className="size-5" />
            <span>ランク付け</span>
          </Link>
          <Link href="/jobs" className="dashboard-mobile-nav-item">
            <Bookmark className="size-5" />
            <span>保存</span>
          </Link>
          <Link href="/jobs" className="dashboard-mobile-nav-item">
            <Plane className="size-5" />
            <span>応募</span>
          </Link>
          <Link href="/settings" className="dashboard-mobile-nav-item">
            <Settings className="size-5" />
            <span>設定</span>
          </Link>
        </nav>
      </div>
    </section>
  );
}
