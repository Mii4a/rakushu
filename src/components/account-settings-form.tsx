"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  Check,
  CircleUserRound,
  CreditCard,
  Database,
  Headphones,
  ImagePlus,
  Info,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";

import { updateAccountNameAction, type AccountSettingsActionState } from "@/actions/account-settings-actions";
import { MockSiteHeader } from "@/components/mock-site-chrome";
import { authClient } from "@/lib/auth/client";
import securityCharacter from "../../UI-mock/account-settings/character/rakumo-security-shield.png";

type AccountSettingsFormProps = {
  name: string;
  email: string;
  image: string | null;
  planLabel: string;
  planLevel: string;
  analysisCount: number;
  analysisMax: number;
  analysisPeriodLabel: string;
  hasCommuteProfile: boolean;
  accounts: Array<{
    id: string;
    providerId: string;
  }>;
};

const initialState: AccountSettingsActionState = {
  status: "idle"
};

const settingsNavItems: Array<{
  title: string;
  subtitle: string;
  icon: typeof UserRound;
  active?: boolean;
}> = [
  {
    title: "アカウント設定",
    subtitle: "プロフィール・ログイン情報",
    icon: UserRound,
    active: true
  },
  {
    title: "希望条件の管理",
    subtitle: "保存した条件の確認・編集",
    icon: CreditCard
  },
  {
    title: "通知設定",
    subtitle: "メール・お知らせの受信設定",
    icon: Bell
  },
  {
    title: "セキュリティ設定",
    subtitle: "パスワード・ログイン保護",
    icon: ShieldCheck
  },
  {
    title: "プラン・お支払い",
    subtitle: "ご利用プランの確認・変更",
    icon: CreditCard
  },
  {
    title: "データ・履歴",
    subtitle: "解析履歴・保存データの管理",
    icon: Database
  },
  {
    title: "連携サービス",
    subtitle: "外部サービスとの連携設定",
    icon: Link2
  }
];

function getProviderLabel(providerId: string) {
  if (providerId === "google") return "Google";
  return providerId;
}

export function AccountSettingsForm({
  name,
  email,
  image,
  planLabel,
  planLevel,
  analysisCount,
  analysisMax,
  analysisPeriodLabel,
  hasCommuteProfile,
  accounts
}: AccountSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAccountNameAction, initialState);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <section className="dashboard-frame settings-mock-surface min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#ffffff_18%,#ffffff_100%)] text-[#1f2937]">
      <MockSiteHeader />

      <div className="mx-auto grid w-full max-w-[1480px] gap-8 px-6 pb-12 pt-8 xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:px-10">
        <aside className="rounded-[32px] border border-[#eceff3] bg-white/96 p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.16)]">
          <h2 className="text-[2rem] font-black tracking-[-0.05em] text-[#111827]">設定</h2>
          <nav className="mt-6 space-y-3">
            {settingsNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={item.active ? "rounded-[24px] border border-[#dceedd] bg-[#f7fbf5] px-4 py-4 shadow-[inset_4px_0_0_#31b14a]" : "rounded-[24px] px-4 py-4"}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={item.active ? "mt-1 size-5 text-[#2ea145]" : "mt-1 size-5 text-[#677487]"} />
                    <div>
                      <p className={item.active ? "text-[1.02rem] font-black text-[#2ea145]" : "text-[1.02rem] font-black text-[#111827]"}>{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#677487]">{item.subtitle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-10 rounded-[28px] border border-[#eceff3] bg-[#fffefd] p-5 shadow-[0_20px_48px_-42px_rgba(15,23,42,0.14)]">
            <div className="flex items-center gap-3">
              <Headphones className="size-6 text-[#111827]" />
              <p className="text-[1.3rem] font-black tracking-[-0.03em] text-[#111827]">お困りですか？</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#677487]">
              設定についてご不明点がある場合は、サポートにお問い合わせください。
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[18px] border border-[#7ec96c] px-4 text-base font-black text-[#2ea145]"
            >
              お問い合わせ
            </Link>
          </div>
        </aside>

        <div className="space-y-5">
          <div>
            <h1 className="text-[3.3rem] font-black tracking-[-0.06em] text-[#111827]">アカウント設定</h1>
            <p className="mt-2 text-[1.1rem] font-semibold text-[#677487]">プロフィールやログイン情報の確認・変更ができます。</p>
          </div>

          <article className="rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)]">
            <h2 className="text-[1.8rem] font-black tracking-[-0.04em] text-[#111827]">プロフィール情報</h2>
            <div className="mt-5 grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
              <div className="flex flex-col items-center">
                {image ? (
                  <div
                    role="img"
                    aria-label="プロフィール画像"
                    className="relative h-[132px] w-[132px] rounded-full border border-[#e2e8ef] bg-cover bg-center shadow-[0_18px_40px_-32px_rgba(15,23,42,0.24)]"
                    style={{ backgroundImage: `url("${image}")` }}
                  >
                    <div className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8ef] bg-white text-[#4b5563] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.25)]">
                      <Camera className="size-5" />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-[132px] w-[132px] items-center justify-center rounded-full border border-[#e2e8ef] bg-[linear-gradient(180deg,#fafafa_0%,#f1f4f8_100%)] text-slate-300 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
                    <CircleUserRound className="size-16" />
                    <div className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8ef] bg-white text-[#4b5563] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.25)]">
                      <ImagePlus className="size-5" />
                    </div>
                  </div>
                )}
                <p className="mt-4 text-sm font-semibold text-[#8a95a3]">JPG/PNG、最大5MB</p>
              </div>

              <div className="space-y-6">
                <form action={formAction} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_88px] lg:items-end">
                  <label className="block">
                    <span className="text-sm font-black text-[#111827]">表示名</span>
                    <input name="name" defaultValue={name} maxLength={50} className="mt-2 w-full rounded-[18px] border border-[#dbe3ea] px-4 py-3.5 text-base font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]" />
                  </label>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#8fd48b] bg-[#f7fbf5] px-4 text-base font-black text-[#2ea145] disabled:opacity-60"
                  >
                    {isPending ? "保存中" : "編集"}
                  </button>
                </form>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_88px] lg:items-end">
                  <div>
                    <p className="text-sm font-black text-[#111827]">メールアドレス</p>
                    <div className="mt-2 rounded-[18px] border border-transparent px-1 py-3 text-base font-semibold text-[#374151]">{email}</div>
                  </div>
                  <div className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#8fd48b] bg-[#f7fbf5] px-4 text-base font-black text-[#2ea145]">
                    確認
                  </div>
                </div>

                {state.status === "error" ? <p className="text-sm font-semibold text-[#d9485a]">{state.message}</p> : null}
                {state.status === "success" ? <p className="text-sm font-semibold text-[#129995]">{state.message}</p> : null}
              </div>
            </div>
          </article>

          <article className="rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <KeyRound className="size-6 text-[#111827]" />
              <h2 className="text-[1.8rem] font-black tracking-[-0.04em] text-[#111827]">パスワードの変更</h2>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-black text-[#111827]">現在のパスワード</span>
                <input disabled placeholder="現在のパスワードを入力" className="mt-2 w-full rounded-[18px] border border-[#e5eaef] bg-[#fafbfc] px-4 py-3.5 text-sm font-semibold text-[#9aa5b1]" />
              </label>
              <label className="block">
                <span className="text-sm font-black text-[#111827]">新しいパスワード</span>
                <input disabled placeholder="新しいパスワードを入力" className="mt-2 w-full rounded-[18px] border border-[#e5eaef] bg-[#fafbfc] px-4 py-3.5 text-sm font-semibold text-[#9aa5b1]" />
              </label>
              <label className="block">
                <span className="text-sm font-black text-[#111827]">新しいパスワード（確認）</span>
                <input disabled placeholder="もう一度入力してください" className="mt-2 w-full rounded-[18px] border border-[#e5eaef] bg-[#fafbfc] px-4 py-3.5 text-sm font-semibold text-[#9aa5b1]" />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm leading-7 text-[#7c8594]">パスワード変更 UI は準備中です。現状はサインイン方法の確認のみ対応しています。</p>
              <button type="button" disabled className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[#dceedd] bg-[#f7fbf5] px-5 text-base font-black text-[#7cbf79]">
                <Check className="size-5" />
                パスワードを更新
              </button>
            </div>
          </article>

          <article className="rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <Link2 className="size-6 text-[#111827]" />
              <h2 className="text-[1.8rem] font-black tracking-[-0.04em] text-[#111827]">連携アカウント</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-[#677487]">外部サービスと連携して、ログインや機能を便利にご利用いただけます。</p>
            <div className="mt-5 space-y-3">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div key={account.id} className="flex flex-col gap-3 rounded-[22px] border border-[#edf1f4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6f7fb] text-lg font-black text-[#4b5563]">G</div>
                      <div>
                        <p className="text-base font-black text-[#111827]">{getProviderLabel(account.providerId)}</p>
                        <p className="text-sm text-[#677487]">{email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#eef8ef] px-3 py-1 text-sm font-black text-[#2ea145]">連携中</span>
                      <button type="button" disabled className="rounded-[14px] border border-[#dbe3ea] px-4 py-2 text-sm font-black text-[#9aa5b1]">
                        連携を解除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#677487]">利用中のサインイン連携はありません。</p>
              )}
            </div>
          </article>

          <article className="rounded-[32px] border border-[#eceff3] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <Mail className="size-6 text-[#111827]" />
              <h2 className="text-[1.8rem] font-black tracking-[-0.04em] text-[#111827]">通知設定</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-[#677487]">らくしゅうからのお知らせや求人情報の受信設定を行えます。</p>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[22px] border border-[#edf1f4] px-5 py-4">
              <div>
                <p className="text-base font-black text-[#111827]">メールでのお知らせを受け取る</p>
                <p className="mt-1 text-sm text-[#677487]">おすすめ求人や機能改善情報などをメールでお届けします。</p>
              </div>
              <div className="flex h-8 w-14 items-center rounded-full bg-[#33b14b] px-1">
                <div className="ml-auto h-6 w-6 rounded-full bg-white shadow" />
              </div>
            </div>
          </article>

          <article className="rounded-[32px] border border-[#f4d6d6] bg-[linear-gradient(180deg,#fffdfd_0%,#fff6f6_100%)] p-6 shadow-[0_28px_68px_-54px_rgba(180,35,24,0.16)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[1.8rem] font-black tracking-[-0.04em] text-[#cc2f2f]">アカウントの削除</h2>
                <p className="mt-2 max-w-[620px] text-sm leading-7 text-[#8b4b4b]">
                  アカウントを削除すると、保存した条件や解析履歴など、すべてのデータが永久に削除されます。
                  この操作は取り消すことができません。
                </p>
              </div>
              <button type="button" disabled className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-[18px] border border-[#f0b9b9] bg-white px-6 text-base font-black text-[#d9485a]">
                <Trash2 className="size-5" />
                アカウントを削除する
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/pricing" className="inline-flex min-h-[48px] items-center justify-center rounded-[16px] border border-[#dbe3ea] px-4 text-sm font-black text-[#364152]">
                {planLabel} / {planLevel} ・ {analysisPeriodLabel} {analysisCount}/{analysisMax}件
              </Link>
              <Link href="/settings/commute" className="inline-flex min-h-[48px] items-center justify-center rounded-[16px] border border-[#dbe3ea] px-4 text-sm font-black text-[#364152]">
                {hasCommuteProfile ? "通勤プロフィール登録済み" : "通勤プロフィール未登録"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] border border-[#dbe3ea] px-4 text-sm font-black text-[#364152] disabled:opacity-60"
              >
                <LogOut className="size-4" />
                {isLoggingOut ? "ログアウト中..." : "ログアウトする"}
              </button>
            </div>
          </article>
        </div>

        <aside className="space-y-5">
          <article className="rounded-[32px] border border-[#eceff3] bg-[radial-gradient(circle_at_top,#f7fbf3_0%,#fefefb_100%)] p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.16)]">
            <h2 className="text-[1.5rem] font-black leading-10 tracking-[-0.04em] text-[#111827]">安全にご利用いただくために</h2>
            <p className="mt-3 text-sm leading-8 text-[#546171]">パスワードの定期的な変更や、連携アカウントの確認をおすすめします。</p>
            <Image src={securityCharacter} alt="セキュリティを案内するらくしゅうキャラクター" className="mx-auto mt-4 h-auto w-full max-w-[220px] object-contain" />
            <Link href="/about" className="mt-4 inline-flex min-h-[54px] w-full items-center justify-center rounded-[18px] border border-[#8fd48b] bg-white px-4 text-base font-black text-[#2ea145]">
              セキュリティのヒントを見る →
            </Link>
          </article>

          <article className="rounded-[28px] border border-[#eceff3] bg-white p-5 shadow-[0_20px_48px_-42px_rgba(15,23,42,0.14)]">
            <div className="flex items-start gap-3">
              <Info className="mt-1 size-5 text-[#31b14a]" />
              <div>
                <p className="text-base font-black text-[#111827]">この画面で変更できること</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#677487]">
                  <li>・表示名の更新</li>
                  <li>・連携アカウントの確認</li>
                  <li>・通知状態の確認</li>
                </ul>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
