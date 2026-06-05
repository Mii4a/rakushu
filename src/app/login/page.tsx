import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronDown, CircleUserRound, Headphones, LockKeyhole, ShieldCheck } from "lucide-react";

import { GoogleLoginButton } from "@/components/google-login-button";
import { getSession } from "@/lib/auth/session";
import loginRightImage from "../../../UI-mock/login/character/login-right-image.png";

export const dynamic = "force-dynamic";

const reassuranceCards = [
  {
    title: "安心・安全のセキュリティ",
    body: "お客様の情報は厳重に管理し、安全に保護しています。",
    icon: ShieldCheck
  },
  {
    title: "プライバシーに配慮",
    body: "個人情報の取り扱いに細心の注意を払い、プライバシーを尊重します。",
    icon: LockKeyhole
  },
  {
    title: "サポートも充実",
    body: "ご不明点があれば、専門スタッフが丁寧にサポートします。",
    icon: Headphones
  }
] as const;

export default async function LoginPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="marketing-surface min-h-screen bg-[radial-gradient(circle_at_top,#fff9f0_0%,#ffffff_18%,#ffffff_100%)] text-[#1f2937]">
      <header className="border-b border-[#ececec]">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-6 px-6 py-4 xl:px-10">
          <Link href="/" className="whitespace-nowrap text-[3.55rem] font-black tracking-[-0.06em] text-[#19a34a]">
            らくしゅう
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="通知"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e9eaee] bg-white text-[#1f2937] shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)]"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center gap-3 rounded-full border border-[#e8eaef] bg-white px-4 py-2 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.35)]">
              <CircleUserRound className="h-6 w-6 text-[#7b8593]" />
              <span className="text-[1.02rem] font-semibold text-[#374151]">ゲスト</span>
              <ChevronDown className="h-4 w-4 text-[#6b7280]" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] px-6 pb-8 pt-10 xl:px-10">
        <div className="overflow-hidden rounded-[34px] border border-[#eceff3] bg-white shadow-[0_36px_90px_-62px_rgba(15,23,42,0.22)]">
          <div className="grid xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1fr)]">
            <div className="flex items-center bg-white px-8 py-12 md:px-14 md:py-16 xl:px-20 xl:py-24">
              <div className="w-full max-w-[560px]">
                <h1 className="text-[3rem] font-black leading-[1.14] tracking-[-0.055em] text-[#111827] md:text-[3.35rem] xl:whitespace-nowrap">
                  らくしゅうに<span className="text-[#22a83f]">ログイン</span>
                </h1>
                <p className="mt-6 text-[1.1rem] font-semibold leading-9 text-[#374151]">
                  アカウントをお持ちの方は、Googleでログインして
                  <br />
                  すべての機能をご利用ください。
                </p>

                <div className="mt-14 max-w-[520px]">
                  <GoogleLoginButton variant="login-mock" />
                </div>

                <p className="mt-14 text-[1rem] font-semibold leading-9 text-[#6b7280]">
                  ログインすることで、
                  <Link href="/legal/terms" className="font-bold text-[#31ad48]">
                    利用規約
                  </Link>
                  および
                  <Link href="/legal/privacy" className="font-bold text-[#31ad48]">
                    プライバシーポリシー
                  </Link>
                  に
                  <br />
                  同意したものとみなします。
                </p>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,#f9fcf8_0%,#f8fbf6_100%)] px-5 py-6 md:px-8 md:py-8 xl:px-6 xl:py-6">
              <div className="relative mx-auto flex h-full min-h-[520px] max-w-[720px] items-center justify-center overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,#fbfdf8_0%,#f6faf4_100%)]">
                <Image src={loginRightImage} alt="就活をもっとラクにするイメージビジュアル" priority className="h-auto w-full max-w-[740px] object-contain" />
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 rounded-[28px] border border-[#eceff3] bg-white px-4 py-4 shadow-[0_24px_64px_-54px_rgba(15,23,42,0.18)] md:px-8 md:py-6">
          <div className="grid gap-5 md:grid-cols-3 md:gap-0">
            {reassuranceCards.map((item, index) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className={`flex items-start gap-4 rounded-[22px] px-4 py-4 md:px-6 ${index < reassuranceCards.length - 1 ? "md:border-r md:border-[#edf1f4]" : ""}`}>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eef9ee] text-[#30ad47] shadow-[0_16px_34px_-28px_rgba(34,197,94,0.4)]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-[1.18rem] font-black tracking-[-0.03em] text-[#111827]">{item.title}</h2>
                    <p className="mt-2 text-[0.98rem] font-medium leading-8 text-[#6b7280]">{item.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="px-2 pb-2 pt-10 text-center text-[0.98rem] font-semibold text-[#7b8593]">
          <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:gap-10">
            <p>© 2024 らくしゅう株式会社. All rights reserved.</p>
            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              <Link href="/legal/privacy">プライバシーポリシー</Link>
              <Link href="/legal/terms">利用規約</Link>
              <Link href="/legal/commerce">特定商取引法に基づく表記</Link>
            </nav>
          </div>
        </footer>
      </div>
    </section>
  );
}
