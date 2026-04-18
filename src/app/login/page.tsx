import { redirect } from "next/navigation";

import { GoogleLoginButton } from "@/components/google-login-button";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">ログイン</h1>
      <p className="mt-2 text-sm text-slate-600">Googleアカウントで、らくしゅうをはじめましょう。</p>
      <div className="mt-6">
        <GoogleLoginButton />
      </div>
    </section>
  );
}
