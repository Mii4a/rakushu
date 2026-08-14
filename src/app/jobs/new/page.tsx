import { Bell, ChevronDown } from "lucide-react";

import { JobCreateForm } from "@/components/job-create-form";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireUser } from "@/lib/auth/require-user";
import { getSession } from "@/lib/auth/session";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  await requireUser();
  const session = await getSession();
  const displayName = session?.user?.name ?? "山田 花子";
  const profileInitial = displayName.slice(0, 1) || "ら";

  return (
    <section className="dashboard-frame dashboard-mock-frame jobs-mock-surface">
      <div className="dashboard-mock-shell">
        <DashboardSidebar activeKey="jobs-new" note="" showMobileToggle variant="mock" />

        <div className="dashboard-mock-content-shell">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-3 flex items-center justify-end gap-3">
              <button type="button" className="dashboard-mock-icon-button" aria-label="通知を見る">
                <Bell className="size-[1.25rem]" />
              </button>
              <div className="dashboard-mock-user-chip">
                <div className="dashboard-mock-user-avatar"><span>{profileInitial}</span></div>
                <span className="dashboard-mock-user-name">{displayName}</span>
                <ChevronDown className="dashboard-mock-user-chevron" />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-2">
              <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5">
                <div className="text-center">
                  <div className="text-3xl leading-none" aria-hidden="true">✦</div>
                  <h1 className="mt-2 text-[2.35rem] font-black tracking-[-0.04em] text-[#15171a]">求人チェッカー</h1>
                  <p className="mt-2 text-[0.98rem] text-[#606975]">求人票の本文を貼り付けるだけで、要点を整理して保存できます。</p>
                </div>

                <JobCreateForm compact />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
