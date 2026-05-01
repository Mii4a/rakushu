import Link from "next/link";

import { ResumeGeneratorForm } from "@/components/resume-generator-form";
import { requireUser } from "@/lib/auth/require-user";
import { getUserPlan } from "@/lib/subscription";

export default async function ResumePage() {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">履歴書自動作成</h1>
      <p className="text-sm text-slate-600">あなたが用意したフォーマットに合わせるための下書き生成機能です（まずはテキスト下書き版）。</p>

      {plan !== "pro" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          この機能はProプランで利用できます。<Link href="/pricing" className="ml-1 underline">料金ページへ</Link>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ResumeGeneratorForm />
      </div>
    </section>
  );
}
