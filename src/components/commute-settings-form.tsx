"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home, MapPin, TrainFront, TimerReset } from "lucide-react";

import { initialCommuteSettingsActionState, saveCommuteProfileAction } from "@/actions/commute-settings-actions";

type CommuteSettingsFormProps = {
  defaults?: {
    homeAddress?: string | null;
    homeNearestStation?: string | null;
    preferredMaxCommuteMinutes?: number | null;
  };
};

export function CommuteSettingsForm({ defaults }: CommuteSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(saveCommuteProfileAction, initialCommuteSettingsActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Commute</p>
            <h1 className="page-title">通勤プロフィール</h1>
            <p className="page-copy mt-3">
              自宅側の基準を登録しておくと、求人ごとの勤務地・最寄り駅・通勤時間を比較しやすくなります。現在は保存中心で、後続の自動通勤時間計算の土台になります。
            </p>
          </div>
          <Link href="/settings/account" className="button-secondary">
            アカウント設定へ
          </Link>
        </div>
      </div>

      <div className="panel space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="field-label flex items-center gap-2"><Home className="size-4" />自宅住所</span>
              <input name="homeAddress" defaultValue={defaults?.homeAddress ?? ""} placeholder="例: 東京都杉並区..." className="field-input" />
            </label>
            <label className="space-y-2">
              <span className="field-label flex items-center gap-2"><TrainFront className="size-4" />自宅最寄り駅</span>
              <input name="homeNearestStation" defaultValue={defaults?.homeNearestStation ?? ""} placeholder="例: 荻窪駅" className="field-input" />
            </label>
          </div>

          <label className="space-y-2 block max-w-xs">
            <span className="field-label flex items-center gap-2"><TimerReset className="size-4" />希望通勤時間上限（分）</span>
            <input
              name="preferredMaxCommuteMinutes"
              type="number"
              min={1}
              max={240}
              defaultValue={defaults?.preferredMaxCommuteMinutes ?? ""}
              placeholder="例: 60"
              className="field-input"
            />
          </label>

          <div className="rounded-2xl border border-rakumo-border bg-rakumo-sand/50 p-4 text-sm leading-7 text-rakumo-ink/75">
            <p className="flex items-center gap-2 font-semibold text-rakumo-ink"><MapPin className="size-4" />保存後の使い道</p>
            <p>求人入力で勤務地住所・最寄り駅・通勤時間を残しやすくなります。今後は住所とプロフィールを使って自動取得へ拡張できます。</p>
          </div>

          {state.message ? (
            <p className={`text-sm ${state.status === "error" ? "text-rose-700" : "text-emerald-700"}`}>{state.message}</p>
          ) : null}

          <button type="submit" disabled={isPending} className="button-primary">
            {isPending ? "保存中..." : "通勤プロフィールを保存"}
          </button>
        </form>
      </div>
    </section>
  );
}
