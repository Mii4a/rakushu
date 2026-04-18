import Link from "next/link";

import { createJobAction } from "@/actions/job-actions";
import { requireUser } from "@/lib/auth/require-user";

export default async function NewJobPage() {
  await requireUser();

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人登録</h1>
        <Link href="/jobs" className="text-sm text-rakushu-700 underline">
          一覧に戻る
        </Link>
      </div>

      <form action={createJobAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">会社名（任意）</span>
            <input name="companyName" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">職種（任意）</span>
            <input name="title" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">情報元（任意）</span>
            <input name="sourceName" placeholder="例: リクナビ" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">URL（任意）</span>
            <input name="sourceUrl" placeholder="https://..." className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-slate-700">求人本文（必須）</span>
          <textarea
            name="rawText"
            required
            minLength={20}
            rows={12}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="求人サイトや求人票の本文を貼り付けてください"
          />
        </label>

        <p className="text-xs text-slate-500">保存時にルールベース解析を実行し、解析結果を別テーブルへ保存します。</p>

        <button type="submit" className="rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white hover:bg-rakushu-700">
          保存して解析する
        </button>
      </form>
    </section>
  );
}
