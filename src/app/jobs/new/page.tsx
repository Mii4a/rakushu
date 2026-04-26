import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { JobCreateForm } from "@/components/job-create-form";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  await requireUser();

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">New analysis</p>
            <h1 className="page-title">求人登録</h1>
            <p className="page-copy mt-3">求人本文を貼り付けて保存すると、その場で抽出とランク評価を実行します。会社名や職種は本文から拾えれば自動入力されます。</p>
          </div>
          <Link href="/jobs" className="button-secondary">
            <ArrowLeft className="size-4" />
            一覧に戻る
          </Link>
        </div>
      </div>

      <JobCreateForm />
    </section>
  );
}
