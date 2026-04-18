import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <p className="inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-rakushu-700 shadow-sm">
        就活支援Webアプリ
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">らくしゅう</h1>
      <p className="max-w-2xl text-slate-700">
        企業説明文を保存して、比較しやすい形に整理するMVPです。まずはGoogleログインで始めましょう。
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white transition hover:bg-rakushu-700"
        >
          ログイン
        </Link>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-100">
          ダッシュボードへ
        </Link>
      </div>
    </section>
  );
}
