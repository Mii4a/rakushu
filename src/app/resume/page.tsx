import Link from "next/link";
import { Bookmark, FileSearch, Home, Plane, Settings } from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ResumeGeneratorForm } from "@/components/resume-generator-form";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getUserResumeProfile } from "@/lib/resume";
import { getUserPlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const [plan, profile] = await Promise.all([getUserPlan(user.id), getUserResumeProfile(user.id)]);

  return (
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="resume" note="履歴書下書きは Pro プラン向けの作業スペースです。保存した内容を次回以降の初期値として再利用できます。" />

        <div className="dashboard-main">
          <div className="page-stack">
            <div className="page-hero">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Resume</p>
                  <h1 className="page-title">履歴書下書き作成</h1>
                  <p className="page-copy mt-3">
                    手元のフォーマットに貼り付ける前提で、学歴・自己PR・志望動機のテキスト下書きをまとめます。保存した内容は次回以降の初期値として再利用できます。
                  </p>
                </div>
                <Link href="/dashboard" className="button-secondary">
                  ダッシュボードへ
                </Link>
              </div>
            </div>

            {plan !== "pro" ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                この機能はProプラン限定です。<Link href="/pricing" className="underline">料金ページ</Link>からアップグレードできます。
              </div>
            ) : null}

            <div className="panel">
              <ResumeGeneratorForm defaults={profile ?? undefined} />
            </div>
          </div>
        </div>

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
