"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bookmark, BriefcaseBusiness, CreditCard, FileText, GitCompareArrows, Home, Menu, Plane, Scale, Settings, X } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: Home, key: "dashboard" },
  { href: "/jobs/new", label: "応募状況", icon: Plane, key: "jobs-new" },
  { href: "/jobs", label: "求人一覧", icon: BriefcaseBusiness, key: "jobs" },
  { href: "/jobs", label: "保存した求人", icon: Bookmark, key: "saved-jobs" },
  { href: "/compare", label: "比較", icon: GitCompareArrows, key: "compare" },
  { href: "/resume", label: "履歴書", icon: FileText, key: "resume" },
  { href: "/criteria", label: "判断基準", icon: Scale, key: "criteria" },
  { href: "/pricing", label: "料金", icon: CreditCard, key: "pricing" },
  { href: "/settings", label: "設定", icon: Settings, key: "settings", muted: true }
] as const;

type SidebarKey = (typeof navItems)[number]["key"];

export function DashboardSidebar({ activeKey, note }: { activeKey: SidebarKey; note: string }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const content = (
    <>
      <div className="dashboard-logo-card">
        <div className="dashboard-logo-mark">
          <BriefcaseBusiness className="size-7" />
        </div>
        <div>
          <p className="dashboard-logo-title">らくしゅう</p>
          <p className="dashboard-logo-copy">就活求人管理アプリ</p>
        </div>
      </div>

      <nav className="dashboard-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          const className = [
            "dashboard-nav-item",
            active ? "dashboard-nav-item-active" : "",
            ("muted" in item && item.muted) ? "dashboard-nav-item-muted" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link key={`${item.key}-${item.label}`} href={item.href} className={className}>
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar-note">
        <p className="dashboard-sidebar-note-icon">i</p>
        <p>{note}</p>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="サイドバーを開く"
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen(true)}
        className="dashboard-mobile-sidebar-toggle"
      >
        <Menu className="size-5" />
        <span>メニュー</span>
      </button>

      {isMobileOpen ? (
        <div className="dashboard-mobile-sidebar-overlay" onClick={() => setIsMobileOpen(false)}>
          <aside className="dashboard-mobile-sidebar" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-rakumo-ink/55">Navigation</p>
              <button
                type="button"
                aria-label="サイドバーを閉じる"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex size-11 items-center justify-center rounded-2xl border border-rakumo-border text-rakumo-ink/65"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 flex h-full min-h-0 flex-col gap-5">{content}</div>
          </aside>
        </div>
      ) : null}

      <aside className="dashboard-sidebar">{content}</aside>
    </>
  );
}
