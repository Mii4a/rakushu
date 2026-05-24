"use client";

import { useActionState } from "react";

import { submitBetaIntakeAction, type BetaIntakeActionState } from "@/actions/beta-actions";
import { MarketingEventTracker } from "@/components/marketing-event-tracker";
import { getUtmParams } from "@/lib/marketing/client";

const initialState: BetaIntakeActionState = {
  status: "idle"
};

export function BetaIntakeForm({
  ctaVariant,
  utmParams,
  referrer,
  page
}: {
  ctaVariant?: string;
  utmParams: ReturnType<typeof getUtmParams>;
  referrer?: string;
  page: string;
}) {
  const [state, formAction, isPending] = useActionState(submitBetaIntakeAction, initialState);

  return (
    <>
      <MarketingEventTracker eventType="beta_form_view" ctaVariant={ctaVariant} />
      <form action={formAction} className="space-y-5 rounded-[28px] border border-[#dce7ee] bg-white p-6 shadow-[0_18px_36px_-30px_rgba(22,53,91,0.28)]">
        <input type="hidden" name="page" value={page} />
        <input type="hidden" name="referrer" value={referrer ?? ""} />
        <input type="hidden" name="ctaVariant" value={ctaVariant ?? ""} />
        <input type="hidden" name="utmSource" value={utmParams.utmSource ?? ""} />
        <input type="hidden" name="utmMedium" value={utmParams.utmMedium ?? ""} />
        <input type="hidden" name="utmCampaign" value={utmParams.utmCampaign ?? ""} />
        <input type="hidden" name="utmContent" value={utmParams.utmContent ?? ""} />
        <input type="hidden" name="utmTerm" value={utmParams.utmTerm ?? ""} />

        <div>
          <p className="text-sm font-bold text-[#1ea9a4]">無料でβ参加して、求人票の見極めを先に試す</p>
          <h1 className="mt-2 text-[2rem] font-black leading-tight text-[#17355b]">困りごとを先に教えてくれた人から案内する</h1>
          <p className="mt-3 text-sm leading-7 text-[#4f6a80]">
            まだ作り込み途中なので、まずは悩みの強い人から優先して改善したい。連絡先と困りごとだけ置いていって。
          </p>
        </div>

        <label className="block space-y-2 text-sm font-semibold text-[#17355b]">
          <span>連絡先（メール or Discord）</span>
          <input
            name="contact"
            required
            placeholder="name@example.com / taro#1234"
            className="w-full rounded-2xl border border-[#c8d7e0] px-4 py-3 text-sm font-medium text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold text-[#17355b]">
            <span>現在の状況</span>
            <select
              name="currentStatus"
              defaultValue="新卒就活"
              className="w-full rounded-2xl border border-[#c8d7e0] px-4 py-3 text-sm font-medium text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
            >
              <option value="新卒就活">新卒就活</option>
              <option value="転職活動">転職活動</option>
              <option value="情報収集中">情報収集中</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm font-semibold text-[#17355b]">
            <span>いちばん近い悩み</span>
            <select
              name="topProblemCategory"
              defaultValue="ブラック求人の見分け方"
              className="w-full rounded-2xl border border-[#c8d7e0] px-4 py-3 text-sm font-medium text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
            >
              <option value="ブラック求人の見分け方">ブラック求人の見分け方</option>
              <option value="条件比較">条件比較</option>
              <option value="応募管理">応募管理</option>
              <option value="自己分析・軸づくり">自己分析・軸づくり</option>
              <option value="その他">その他</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm font-semibold text-[#17355b]">
          <span>いま一番困っていること</span>
          <textarea
            name="topProblem"
            required
            rows={5}
            placeholder="例: 固定残業や休日制度の見方が分からず、応募前に毎回不安になる"
            className="w-full rounded-2xl border border-[#c8d7e0] px-4 py-3 text-sm leading-7 text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold text-[#17355b]">
            <span>志望職種（任意）</span>
            <input
              name="desiredJobCategory"
              placeholder="例: 事務 / 編集 / Web更新"
              className="w-full rounded-2xl border border-[#c8d7e0] px-4 py-3 text-sm font-medium text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-[#17355b]">
            <span>1週間で見る求人本数（任意）</span>
            <select
              name="jobsPerWeekBucket"
              defaultValue="未定"
              className="w-full rounded-2xl border border-[#c8d7e0] px-4 py-3 text-sm font-medium text-[#17355b] outline-none focus:border-[#23b1aa] focus:ring-4 focus:ring-[#d5f4f2]"
            >
              <option value="未定">未定</option>
              <option value="1-5">1-5</option>
              <option value="6-10">6-10</option>
              <option value="11-20">11-20</option>
              <option value="21+">21+</option>
            </select>
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-[#f7fbfd] px-4 py-4 text-sm text-[#35546f]">
          <input type="checkbox" name="interviewOptIn" className="mt-1 size-4 rounded border-[#bdd1de]" />
          <span>必要なら 15〜20 分くらいのヒアリングに協力できる</span>
        </label>

        {state.status === "error" ? <p className="text-sm font-semibold text-[#d9485a]">{state.message}</p> : null}
        {state.status === "success" ? <p className="text-sm font-semibold text-[#129995]">{state.message}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[60px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#24b4ae_0%,#129995_100%)] px-6 py-4 text-base font-black text-white shadow-[0_20px_34px_-24px_rgba(18,153,149,0.92)] disabled:opacity-60"
        >
          {isPending ? "送信中..." : "無料でβ参加する"}
        </button>
      </form>
    </>
  );
}
