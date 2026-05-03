import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";

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
            <h1 className="page-title">まず求人をランク付けして、残すかどうかを決める</h1>
            <p className="page-copy mt-3">
              判断基準が決まっていれば、その基準で求人を見極められます。本文を貼って保存すると、その場で抽出とランク評価を実行し、残したい求人だけ整理へ進められます。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/criteria" className="button-secondary">
              <Layers3 className="size-4" />
              判断基準を見る
            </Link>
            <Link href="/jobs" className="button-secondary">
              <ArrowLeft className="size-4" />
              求人整理に戻る
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="panel-muted">
            <p className="metric-label">Step 1</p>
            <p className="mt-2 text-sm font-medium text-slate-900">基準を確認する</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">公開基準や自分用基準を先に決めておくと、判断がぶれにくくなります。</p>
          </div>
          <div className="panel-muted">
            <p className="metric-label">Step 2</p>
            <p className="mt-2 text-sm font-medium text-slate-900">求人を貼ってランク付け</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">固定残業や休日、福利厚生などをその場で評価します。</p>
          </div>
          <div className="panel-muted">
            <p className="metric-label">Step 3</p>
            <p className="mt-2 text-sm font-medium text-slate-900">良い求人だけ残す</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">保存したあとは求人整理ページで応募状況や次に見る予定を追えます。</p>
          </div>
        </div>
      </div>

      <JobCreateForm />
    </section>
  );
}
