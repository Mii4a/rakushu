"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";

import { updateAccountNameAction, type AccountSettingsActionState } from "@/actions/account-settings-actions";

type AccountSettingsFormProps = {
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  accounts: Array<{
    id: string;
    providerId: string;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    scopes: string[];
  }>;
};

const initialState: AccountSettingsActionState = {
  status: "idle"
};

function formatListValue(value: string[] | undefined) {
  if (!value || value.length === 0) {
    return "なし";
  }

  return value.join(", ");
}

export function AccountSettingsForm({
  name,
  email,
  emailVerified,
  image,
  createdAt,
  updatedAt,
  accounts
}: AccountSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAccountNameAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">アカウント設定</p>
            <h1 className="mt-1 text-2xl font-semibold">名前を変更</h1>
            <p className="mt-2 text-sm text-slate-600">メールアドレスとアカウント情報は読み取り専用です。</p>
          </div>
          {image ? (
            // Avatar preview is read-only in this MVP.
            <div
              role="img"
              aria-label="プロフィール画像"
              className="h-16 w-16 rounded-full border border-slate-200 bg-center bg-cover"
              style={{ backgroundImage: `url("${image}")` }}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
              画像なし
            </div>
          )}
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-slate-700">表示名</span>
            <input
              key={name}
              name="name"
              defaultValue={name}
              maxLength={100}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-rakushu-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rakushu-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
            {state.status !== "idle" ? (
              <p className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">読み取り専用のアカウント情報</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <dt className="text-slate-500">メール</dt>
              <dd className="font-medium text-slate-900">{email}</dd>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <dt className="text-slate-500">メール確認済み</dt>
              <dd className="font-medium text-slate-900">{emailVerified ? "はい" : "いいえ"}</dd>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <dt className="text-slate-500">作成日時</dt>
              <dd className="font-medium text-slate-900">{createdAt}</dd>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <dt className="text-slate-500">更新日時</dt>
              <dd className="font-medium text-slate-900">{updatedAt}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">サインイン連携</h2>
          <p className="mt-2 text-sm text-slate-600">現在このアカウントに紐づく認証プロバイダです。</p>
          <div className="mt-4 space-y-3">
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <div key={account.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{account.providerId}</span>
                    <span className="text-slate-500">{account.accountId}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    <p>Scopes: {formatListValue(account.scopes)}</p>
                    <p>作成: {account.createdAt}</p>
                    <p>更新: {account.updatedAt}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">連携アカウントはありません。</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
