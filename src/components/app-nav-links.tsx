"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CreditCard, FileText, LayoutDashboard, Layers3, Search } from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "ホーム",
    icon: LayoutDashboard
  },
  {
    href: "/criteria",
    label: "判断基準",
    icon: Layers3
  },
  {
    href: "/jobs",
    label: "求人整理",
    icon: BriefcaseBusiness
  },
  {
    href: "/pricing",
    label: "料金",
    icon: CreditCard
  },
  {
    href: "/resume",
    label: "履歴書",
    icon: FileText
  },
  {
    href: "/jobs/new",
    label: "ランク付け",
    icon: Search
  }
];

export function AppNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-sm font-medium text-white"
                : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
            }
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
