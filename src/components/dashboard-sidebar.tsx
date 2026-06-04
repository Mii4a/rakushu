"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  GitCompareArrows,
  Home,
  Menu,
  Plane,
  Scale,
  Settings,
  X,
  type LucideIcon
} from "lucide-react";

type SidebarItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  key: string;
  muted?: boolean;
};

const defaultNavItems: SidebarItem[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: Home, key: "dashboard" },
  { href: "/jobs/new", label: "ランクを付ける", icon: Plane, key: "jobs-new" },
  { href: "/jobs", label: "求人一覧", icon: BriefcaseBusiness, key: "jobs" },
  { href: "/jobs", label: "保存した求人", icon: Bookmark, key: "saved-jobs" },
  { href: "/compare", label: "比較", icon: GitCompareArrows, key: "compare" },
  { href: "/resume", label: "履歴書", icon: FileText, key: "resume" },
  { href: "/criteria", label: "判断基準", icon: Scale, key: "criteria" },
  { href: "/pricing", label: "料金", icon: CreditCard, key: "pricing" },
  { href: "/settings", label: "設定", icon: Settings, key: "settings", muted: true }
] as const;

export function DashboardSidebar({
  activeKey,
  note,
  desktopVisible = true,
  showMobileToggle = true,
  items,
  mode = "links",
  onItemSelect,
  footerContent,
  variant = "default"
}: {
  activeKey: string;
  note: string;
  desktopVisible?: boolean;
  showMobileToggle?: boolean;
  items?: SidebarItem[];
  mode?: "links" | "tabs";
  onItemSelect?: (key: string) => void;
  footerContent?: ReactNode;
  variant?: "default" | "mock";
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navItems = items ?? defaultNavItems;

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const content = (
    <>
      <div className={variant === "mock" ? "dashboard-logo-card dashboard-logo-card-mock" : "dashboard-logo-card"}>
        <div className={variant === "mock" ? "dashboard-logo-mark dashboard-logo-mark-mock" : "dashboard-logo-mark"}>
          {variant === "mock" ? (
            <div className="dashboard-logo-glyph-mock" aria-hidden="true">
              <span className="dashboard-logo-glyph-mock-top" />
              <span className="dashboard-logo-glyph-mock-bottom" />
            </div>
          ) : (
            <BriefcaseBusiness className="size-7" />
          )}
        </div>
        <div>
          <p className={variant === "mock" ? "dashboard-logo-title dashboard-logo-title-mock" : "dashboard-logo-title"}>らくしゅう</p>
          {variant === "mock" ? null : <p className="dashboard-logo-copy">就活求人管理アプリ</p>}
        </div>
      </div>

      <nav className={variant === "mock" ? "dashboard-nav dashboard-nav-mock" : "dashboard-nav"}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          const className = [
            "dashboard-nav-item",
            active ? "dashboard-nav-item-active" : "",
            ("muted" in item && item.muted) ? "dashboard-nav-item-muted" : "",
            variant === "mock" ? "dashboard-nav-item-mock" : ""
          ]
            .filter(Boolean)
            .join(" ");

          if (mode === "tabs") {
            return (
              <button
                key={`${item.key}-${item.label}`}
                type="button"
                className={className}
                onClick={() => {
                  onItemSelect?.(item.key);
                  setIsMobileOpen(false);
                }}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={`${item.key}-${item.label}`} href={item.href ?? "#"} className={className}>
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {footerContent ? footerContent : null}

      {note ? (
        <div className={variant === "mock" ? "dashboard-sidebar-note dashboard-sidebar-note-mock" : "dashboard-sidebar-note"}>
          <p className="dashboard-sidebar-note-icon">i</p>
          <p>{note}</p>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {showMobileToggle ? (
        <button
          type="button"
          aria-label="サイドバーを開く"
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen(true)}
          className={variant === "mock" ? "dashboard-mobile-sidebar-toggle dashboard-mobile-sidebar-toggle-mock" : "dashboard-mobile-sidebar-toggle"}
        >
          <Menu className="size-5" />
          <span>メニュー</span>
        </button>
      ) : null}

      {isMobileOpen ? (
        <div className="dashboard-mobile-sidebar-overlay" onClick={() => setIsMobileOpen(false)}>
          <aside className={variant === "mock" ? "dashboard-mobile-sidebar dashboard-mobile-sidebar-mock" : "dashboard-mobile-sidebar"} onClick={(event) => event.stopPropagation()}>
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
            <div className="mt-5 flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1">{content}</div>
          </aside>
        </div>
      ) : null}

      {desktopVisible ? <aside className={variant === "mock" ? "dashboard-sidebar dashboard-sidebar-mock" : "dashboard-sidebar"}>{content}</aside> : null}
    </>
  );
}
