"use client";

import { useActionState } from "react";
import { Send, ShieldCheck } from "lucide-react";

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
      <form action={formAction} className="space-y-5 rounded-[32px] border border-[#e7ebef] bg-white p-6 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.24)] xl:p-7">
        <input type="hidden" name="page" value={page} />
        <input type="hidden" name="referrer" value={referrer ?? ""} />
        <input type="hidden" name="ctaVariant" value={ctaVariant ?? ""} />
        <input type="hidden" name="utmSource" value={utmParams.utmSource ?? ""} />
        <input type="hidden" name="utmMedium" value={utmParams.utmMedium ?? ""} />
        <input type="hidden" name="utmCampaign" value={utmParams.utmCampaign ?? ""} />
        <input type="hidden" name="utmContent" value={utmParams.utmContent ?? ""} />
        <input type="hidden" name="utmTerm" value={utmParams.utmTerm ?? ""} />

        <div className="rounded-full bg-[linear-gradient(180deg,#f6fbf1_0%,#edf7e7_100%)] px-5 py-3 text-center text-base font-black text-[#2ea145]">
          限定50名
        </div>

        <div className="text-center">
          <h1 className="text-[2.1rem] font-black tracking-[-0.05em] text-[#111827] xl:text-[2.4rem]">ベータ版に申し込む（無料）</h1>
          <p className="mt-3 text-sm leading-7 text-[#667385]">ご入力いただいた方から順にご案内します。</p>
        </div>

        <label className="block space-y-2 text-sm font-black text-[#111827]">
          <span>連絡先（メール or Discord） <span className="ml-2 rounded-full bg-[#edf8e9] px-2 py-1 text-xs text-[#2ea145]">必須</span></span>
          <input
            name="contact"
            required
            placeholder="例）yamada.hanako@example.com / taro#1234"
            className="w-full rounded-[18px] border border-[#dbe3ea] bg-white px-4 py-3.5 text-sm font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
          />
        </label>

        <label className="block space-y-2 text-sm font-black text-[#111827]">
          <span>現在の就活状況 <span className="ml-2 rounded-full bg-[#edf8e9] px-2 py-1 text-xs text-[#2ea145]">必須</span></span>
          <select
            name="currentStatus"
            defaultValue="新卒就活"
            className="w-full rounded-[18px] border border-[#dbe3ea] bg-white px-4 py-3.5 text-sm font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
          >
            <option value="新卒就活">新卒就活</option>
            <option value="転職活動">転職活動</option>
            <option value="情報収集中">情報収集中</option>
          </select>
        </label>

        <label className="block space-y-2 text-sm font-black text-[#111827]">
          <span>いちばん近い悩み <span className="ml-2 rounded-full bg-[#edf8e9] px-2 py-1 text-xs text-[#2ea145]">必須</span></span>
          <select
            name="topProblemCategory"
            defaultValue="ブラック求人の見分け方"
            className="w-full rounded-[18px] border border-[#dbe3ea] bg-white px-4 py-3.5 text-sm font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
          >
            <option value="ブラック求人の見分け方">ブラック求人の見分け方</option>
            <option value="条件比較">条件比較</option>
            <option value="応募管理">応募管理</option>
            <option value="自己分析・軸づくり">自己分析・軸づくり</option>
            <option value="その他">その他</option>
          </select>
        </label>

        <label className="block space-y-2 text-sm font-black text-[#111827]">
          <span>ご意見・ご要望 <span className="ml-2 text-xs font-semibold text-[#778494]">（任意）</span></span>
          <textarea
            name="topProblem"
            required
            rows={4}
            placeholder="らくしゅうに期待することや、使ってみたい機能などをご自由にお書きください。"
            className="w-full rounded-[18px] border border-[#dbe3ea] bg-white px-4 py-3.5 text-sm leading-7 text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 text-sm font-black text-[#111827]">
            <span>志望職種 <span className="ml-2 text-xs font-semibold text-[#778494]">（任意）</span></span>
            <input
              name="desiredJobCategory"
              placeholder="例）事務 / 編集 / Web更新"
              className="w-full rounded-[18px] border border-[#dbe3ea] bg-white px-4 py-3.5 text-sm font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
            />
          </label>

          <label className="block space-y-2 text-sm font-black text-[#111827]">
            <span>1週間で見る求人本数 <span className="ml-2 text-xs font-semibold text-[#778494]">（任意）</span></span>
            <select
              name="jobsPerWeekBucket"
              defaultValue="未定"
              className="w-full rounded-[18px] border border-[#dbe3ea] bg-white px-4 py-3.5 text-sm font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
            >
              <option value="未定">未定</option>
              <option value="1-5">1-5</option>
              <option value="6-10">6-10</option>
              <option value="11-20">11-20</option>
              <option value="21+">21+</option>
            </select>
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-[18px] border border-[#edf1f4] bg-[#fbfdfb] px-4 py-4 text-sm font-medium text-[#546171]">
          <input type="checkbox" name="interviewOptIn" className="mt-1 size-4 rounded border-[#bdd1de]" />
          <span>必要なら 15〜20 分くらいのヒアリングに協力できる</span>
        </label>

        {state.status === "error" ? <p className="text-sm font-semibold text-[#d9485a]">{state.message}</p> : null}
        {state.status === "success" ? <p className="text-sm font-semibold text-[#129995]">{state.message}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[20px] bg-[linear-gradient(135deg,#35b24a_0%,#25983a_100%)] px-6 py-4 text-lg font-black text-white shadow-[0_24px_52px_-36px_rgba(37,152,58,0.9)] disabled:opacity-60"
        >
          <Send className="size-5" />
          {isPending ? "送信中..." : "ベータ版に申し込む"}
        </button>

        <p className="text-center text-sm font-semibold text-[#6c7786]">通常3営業日以内にご連絡します</p>

        <div className="flex items-start gap-3 rounded-[18px] bg-[#f7faf7] px-4 py-4 text-sm leading-7 text-[#546171]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#31b14a]" />
          <p>ご入力いただいた情報は、ベータプログラムのご案内にのみ使用し、厳重に管理いたします。</p>
        </div>
      </form>
    </>
  );
}
