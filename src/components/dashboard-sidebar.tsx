import Link from "next/link";
import { Bookmark, BriefcaseBusiness, Home, Plane, Scale, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: Home, key: "dashboard" },
  { href: "/jobs/new", label: "応募状況", icon: Plane, key: "jobs-new" },
  { href: "/jobs", label: "求人一覧", icon: BriefcaseBusiness, key: "jobs" },
  { href: "/jobs", label: "保存した求人", icon: Bookmark, key: "saved-jobs" },
  { href: "/criteria", label: "判断基準", icon: Scale, key: "criteria" },
  { href: "/settings", label: "設定", icon: Settings, key: "settings", muted: true }
] as const;

type SidebarKey = (typeof navItems)[number]["key"];

export function DashboardSidebar({ activeKey, note }: { activeKey: SidebarKey; note: string }) {
  return (
    <aside className="dashboard-sidebar">
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
    </aside>
  );
}
