import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  await requireUser();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人比較</h1>
        <Link href="/jobs" className="text-sm text-rakushu-700 underline">
          求人一覧へ
        </Link>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        比較機能は提供しない方針に変更しました。求人の確認は一覧・詳細画面をご利用ください。
      </div>
    </section>
  );
}
