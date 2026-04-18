import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">ログイン中</p>
        <h1 className="mt-1 text-2xl font-semibold">こんにちは、{session.user.name} さん</h1>
        <p className="mt-2 text-slate-700">求人の登録・解析・比較ができます。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/jobs" className="rounded-lg bg-rakushu-500 px-3 py-2 text-sm text-white hover:bg-rakushu-700">
            求人一覧へ
          </Link>
          <Link href="/compare" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
            比較へ
          </Link>
          <Link href="/pricing" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
            料金を見る
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Phase 3 実装済み</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>比較画面（無料は3件まで）</li>
          <li>料金ページ</li>
          <li>Stripe Checkout API</li>
          <li>Stripe Webhookでサブスク同期</li>
          <li>無料/有料の利用制限（求人保存・解析・比較）</li>
        </ul>
      </div>
    </section>
  );
}
