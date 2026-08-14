"use client";

import Link from "next/link";

import { AppMockSidebarShell } from "@/components/app-mock-sidebar-shell";
import { PLAN_LIMITS } from "@/lib/plans";

export function ResumeWorkspaceShell({
  plan,
  children,
}: {
  plan: string;
  children: React.ReactNode;
}) {
  const canUseResumeWorkspace = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.features.resumeWorkspace ?? false;

  return (
    <AppMockSidebarShell activeKey="resume">
      <div className="page-stack">
            {!canUseResumeWorkspace ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                このプランでは履歴書ワークスペースを使えません。<Link href="/pricing" className="underline">料金ページ</Link>から対象プランへ切り替えできます。
              </div>
            ) : null}

            <div className="rounded-[34px] border border-rakumo-border bg-white p-4 shadow-[0_22px_44px_-34px_rgba(45,58,74,0.3)] md:p-6">
              {children}
            </div>
      </div>
    </AppMockSidebarShell>
  );
}
