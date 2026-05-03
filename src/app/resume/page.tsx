import Link from "next/link";

import { ResumeGeneratorForm } from "@/components/resume-generator-form";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getUserPlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Resume</p>
            <h1 className="page-title">履歴書下書き作成</h1>
            <p className="page-copy mt-3">
              手元のフォーマットに貼り付ける前提で、学歴・自己PR・志望動機のテキスト下書きをまとめます。まずは保存ではなく、その場で整形した文面を返す簡易版です。
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
        <ResumeGeneratorForm />
      </div>
    </section>
  );
}
