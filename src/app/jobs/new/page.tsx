import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";

import { JobCreateForm } from "@/components/job-create-form";
import { JobsMockHeader, JobsMockShell, PageAccentTitle } from "@/components/jobs/jobs-mock-ui";
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

  return (
    <JobsMockShell>
      <JobsMockHeader displayName={displayName} />
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
        <PageAccentTitle
          title="新規求人登録"
          description="求人本文を貼り付けるだけで、AIが内容を整理し、あなたの希望条件との一致度をランク付けします。"
        />

        <div className="flex items-center gap-3 text-sm font-bold text-[#1f9d39]">
          <BriefcaseBusiness className="size-4" />
          <Link href="/jobs" className="hover:underline">保存した求人一覧へ戻る</Link>
        </div>

        <JobCreateForm />
      </div>
    </JobsMockShell>
  );
}
