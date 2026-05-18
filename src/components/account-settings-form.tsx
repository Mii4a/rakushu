"use client";

import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useEffect, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleUserRound,
  FilePenLine,
  Home,
  Info,
  LogOut,
  Mail,
  Plane,
  Scale,
  Settings,
  Sparkles
} from "lucide-react";

import { updateAccountNameAction, type AccountSettingsActionState } from "@/actions/account-settings-actions";
import { authClient } from "@/lib/auth/client";

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

const mobileNavItems = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/criteria", label: "ランク付け", icon: BriefcaseBusiness },
  { href: "/jobs", label: "保存した求人", icon: Bookmark },
  { href: "/jobs/new", label: "応募", icon: Plane },
  { href: "/settings", label: "設定", icon: Settings }
] as const;

function getProviderLabel(providerId: string) {
  if (providerId === "google") {
    return "Google";
  }

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
  const progressWidth = analysisMax > 0 ? Math.min(100, (analysisCount / analysisMax) * 100) : 0;

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
    <section className="dashboard-frame">
      <div className="dashboard-shell">
        <DashboardSidebar activeKey="settings" note="表示名だけ更新できます。メールアドレスとサインイン方法は確認専用です。" />

        <div className="dashboard-main space-y-5">
          <div className="dashboard-mobile-top">
            <div className="dashboard-mobile-brand">
              <div className="dashboard-logo-mark">
                <BriefcaseBusiness className="size-6" />
              </div>
              <div>
                <p className="dashboard-logo-title">らくしゅう</p>
              </div>
            </div>
          </div>

          <div className="account-settings-topbar">
            <div className="account-settings-heading">
              <h1 className="account-settings-title">アカウント設定</h1>
              <p className="account-settings-copy">プロフィール情報を確認・更新できます。</p>
            </div>

            <Link href="/pricing" className="dashboard-plan-card">
              <div className="dashboard-level-badge">
                <span className="text-xs font-semibold">Lv.</span>
                <span className="text-3xl font-bold leading-none">{planLevel.replace("Lv.", "")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-rakumo-ink">{planLabel}</p>
                <p className="mt-1 text-sm text-rakumo-ink/70">{analysisPeriodLabel}の解析使用数</p>
                <p className="mt-1 text-[2rem] font-black tracking-tight text-[#111111]">
                  {analysisCount} <span className="text-base font-medium">/ {analysisMax} 件</span>
                </p>
                <div className="dashboard-progress mt-2">
                  <div className="dashboard-progress-bar" style={{ width: `${progressWidth}%` }} />
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-rakumo-ink/45" />
            </Link>
          </div>

          <article className="account-settings-panel">
            <div className="account-settings-profile-block">
              <h2 className="account-settings-section-title">プロフィール画像</h2>
              <div className="account-settings-profile-row">
                {image ? (
                  <div
                    role="img"
                    aria-label="プロフィール画像"
                    className="account-settings-avatar bg-cover bg-center"
                    style={{ backgroundImage: `url("${image}")` }}
                  />
                ) : (
                  <div className="account-settings-avatar">
                    <CircleUserRound className="size-14 text-slate-300" />
                    <span>画像なし</span>
                  </div>
                )}
                <p className="account-settings-profile-copy">プロフィール画像のアップロード・変更機能は未実装です。</p>
              </div>
            </div>

            <form action={formAction} className="account-settings-form">
              <div className="account-settings-input-card">
                <div className="account-settings-field-title">
                  <FilePenLine className="size-6 text-[#2ca100]" />
                  <h2>表示名</h2>
                </div>
                <label className="block space-y-3">
                  <span className="sr-only">表示名</span>
                  <input key={name} name="name" defaultValue={name} maxLength={50} className="account-settings-input" />
                </label>
                <div className="account-settings-note-list">
                  <p>
                    <Check className="size-5" />
                    空欄では保存できません
                  </p>
                  <p>
                    <Check className="size-5" />
                    50文字以内で入力してください
                  </p>
                  <p>保存後、画面が更新されます。</p>
                </div>
                {state.status === "error" ? (
                  <p className="text-sm font-medium text-rose-700">{state.message}</p>
                ) : null}
              </div>

              <button type="submit" disabled={isPending} className="account-settings-save-button">
                <Check className="size-7" />
                {isPending ? "保存中..." : "保存する"}
              </button>
            </form>
          </article>

          <div className={`account-settings-feedback ${state.status === "error" ? "account-settings-feedback-error" : ""}`}>
            <Info className="size-6 shrink-0" />
            <p>{state.status === "success" ? state.message : "表示名はアプリ内表示に使われます。"}</p>
            <Sparkles className="ml-auto hidden size-5 text-[#f5bf28] sm:block" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <article className="account-settings-subpanel">
              <div className="account-settings-field-title">
                <Mail className="size-6 text-[#2ca100]" />
                <h2>サインイン中のメールアドレス</h2>
              </div>
              <dl className="account-settings-data-list">
                <div>
                  <dt>メール</dt>
                  <dd>{email}</dd>
                </div>
              </dl>
            </article>

            <article className="account-settings-subpanel">
              <div className="account-settings-field-title">
                <Settings className="size-6 text-[#2ca100]" />
                <h2>サインイン連携</h2>
              </div>
              <div className="mt-4 space-y-3">
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <div key={account.id} className="account-settings-account-card">
                      <p className="font-semibold text-[#222222]">{getProviderLabel(account.providerId)}でサインインしています</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-rakumo-ink/70">利用中のサインイン連携はありません。</p>
                )}
              </div>
            </article>
          </div>

          <article className="account-settings-subpanel">
            <div className="account-settings-field-title">
              <Home className="size-6 text-[#2ca100]" />
              <h2>通勤プロフィール</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-rakumo-ink/75">
              {hasCommuteProfile ? "自宅側の通勤基準を登録済みです。求人ごとの勤務地・駅・通勤時間の比較に使えます。" : "まだ未登録です。今後の通勤時間自動取得のために先に登録できます。"}
            </p>
            <Link href="/settings/commute" className="account-settings-logout-button">
              <Home className="size-5" />
              通勤プロフィールを開く
            </Link>
          </article>

          <article className="account-settings-subpanel">
            <div className="account-settings-field-title">
              <LogOut className="size-6 text-[#2ca100]" />
              <h2>ログアウト</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-rakumo-ink/75">この端末でのログイン状態を解除して、トップページへ戻ります。</p>
            <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="account-settings-logout-button">
              <LogOut className="size-5" />
              {isLoggingOut ? "ログアウト中..." : "ログアウトする"}
            </button>
          </article>

          <nav className="dashboard-mobile-nav">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/settings";

              return (
                <Link key={item.href} href={item.href} className={`dashboard-mobile-nav-item ${isActive ? "dashboard-mobile-nav-item-active" : ""}`}>
                  <Icon className="size-6" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
