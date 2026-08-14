"use client";

import { type ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";

type AppMockSidebarShellProps = {
  activeKey: string;
  children: ReactNode;
  frameClassName?: string;
  contentClassName?: string;
  footerContent?: ReactNode;
  itemActions?: Partial<Record<string, ReactNode>>;
  showMobileToggle?: boolean;
};

export function AppMockSidebarShell({
  activeKey,
  children,
  frameClassName = "",
  contentClassName = "",
  footerContent,
  itemActions,
  showMobileToggle = true
}: AppMockSidebarShellProps) {
  return (
    <section className={["dashboard-frame dashboard-mock-frame", frameClassName].filter(Boolean).join(" ")}>
      <div className="dashboard-mock-shell">
        <DashboardSidebar
          activeKey={activeKey}
          note=""
          footerContent={footerContent}
          itemActions={itemActions}
          showMobileToggle={showMobileToggle}
          variant="mock"
        />
        <div className={["dashboard-mock-content-shell", contentClassName].filter(Boolean).join(" ")}>{children}</div>
      </div>
    </section>
  );
}
