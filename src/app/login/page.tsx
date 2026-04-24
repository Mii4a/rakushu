import { redirect } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";

import { GoogleLoginButton } from "@/components/google-login-button";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="page-stack">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="page-hero">
          <p className="eyebrow">Sign in</p>
          <h1 className="page-title">Googleアカウントで始める</h1>
          <p className="page-copy mt-3">保存、再解析、公開基準の閲覧、料金プランの管理はログイン後に使えます。今の設計では Google ログインが最短導線です。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="soft-pill">
              <Sparkles className="size-4 text-rakushu-500" />
              求人解析の保存
            </span>
            <span className="soft-pill">自分用ランク設定</span>
            <span className="soft-pill">みんなの基準</span>
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <LockKeyhole className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">ログイン</h2>
              <p className="text-sm text-slate-500">1クリックで開始できます。</p>
            </div>
          </div>
          <div className="mt-6">
            <GoogleLoginButton />
          </div>
        </div>
      </div>
    </section>
  );
}
