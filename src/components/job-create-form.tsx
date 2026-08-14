"use client";

import { useActionState, useEffect, useState } from "react";
import { BriefcaseBusiness, Check, Globe2, LoaderCircle, Sparkles } from "lucide-react";

import { createJobAction, type JobActionState } from "@/actions/job-actions";
import { AnalysisLimitModal } from "@/components/analysis-limit-modal";
import { clearTopDemoIntent, readTopDemoIntent } from "@/lib/top-demo-intent";

const initialState: JobActionState = { status: "idle" };
const rawTextPlaceholder = "例）仕事内容、応募資格、歓迎スキル、勤務地、勤務時間、給与、福利厚生、選考フローなど\n求人票の全文を貼り付けると、より正確に解析できます。";

export function JobCreateForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(createJobAction, initialState);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [rawText, setRawText] = useState("");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "error" && state.code === "analysis_limit") setIsModalOpen(true);
  }, [state]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("restoreDemo") !== "1") return;

    const intent = readTopDemoIntent("job-checker");
    const restoredJobText = intent?.payload.jobText?.trim();
    clearTopDemoIntent();

    if (!restoredJobText) return;
    setRawText(restoredJobText);
    setRestoreMessage("トップページで入力した求人本文を引き継ぎました。");
  }, []);

  const showAnalysisLimitModal = state.status === "error" && state.code === "analysis_limit" && isModalOpen;

  return (
    <>
      <form action={formAction} className={`mx-auto w-full max-w-[960px] ${compact ? "space-y-4" : "space-y-5"}`}>
        <section className="rounded-[22px] border border-[#dfe3e7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.35)] sm:p-5">
          {restoreMessage ? <p className="mb-4 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{restoreMessage}</p> : null}
          <div className="mb-4 flex items-start gap-3">
            <BriefcaseBusiness className="mt-0.5 size-5 text-[#111827]" />
            <div>
              <h2 className="text-lg font-black text-[#16191d]">求人本文を貼り付け</h2>
              <p className="mt-1 text-sm text-[#7a8189]">求人票の本文をここに貼り付けてください（コピー＆ペースト）</p>
            </div>
          </div>
          <textarea
            name="rawText"
            required
            minLength={20}
            maxLength={20000}
            rows={compact ? 6 : 9}
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={rawTextPlaceholder}
            disabled={isPending}
            className={`${compact ? "min-h-[172px]" : "min-h-[250px]"} w-full resize-y rounded-[15px] border border-[#cfd4da] bg-white px-5 py-4 text-base leading-8 text-[#20242a] outline-none transition placeholder:text-[#9ba1a8] focus:border-[#17191d] focus:ring-4 focus:ring-black/5 disabled:bg-[#f7f7f7]`}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-[#767d85]">求人本文は解析時だけ使用し、本文そのものは保存しません。</p>
            <span className="text-xs tabular-nums text-[#7e858d]">{rawText.length.toLocaleString()} / 20,000</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#555d66]">
            {[
              "求人本文を貼り付け",
              "募集要項",
              "福利厚生",
              "勤務条件"
            ].map((item) => <span key={item} className="rounded-full border border-[#dfe3e7] px-3 py-2">{item}</span>)}
          </div>
        </section>

        <section className={`${compact ? "rounded-[18px] p-4" : "rounded-[20px] p-5"} border border-[#dfe3e7] bg-white shadow-[0_16px_40px_-38px_rgba(15,23,42,.3)]`}>
          <label htmlFor="company-homepage-url" className="flex items-center gap-2 text-base font-black text-[#17191d]">
            <Globe2 className="size-5" />
            企業HPのURL（任意）
          </label>
          <input
            id="company-homepage-url"
            aria-label="企業HPのURL（任意）"
            name="sourceUrl"
            type="url"
            placeholder="https://example.co.jp"
            disabled={isPending}
            className="mt-3 h-[52px] w-full rounded-[13px] border border-[#d7dce1] px-4 text-sm outline-none transition focus:border-[#17191d] focus:ring-4 focus:ring-black/5"
          />
          <p className="mt-3 text-sm text-[#727982]">企業HPのURLがあると「企業研究」がスムーズになります。</p>
        </section>

        {state.status === "error" && state.code !== "analysis_limit" ? (
          <p role="alert" className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.message}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || rawText.trim().length < 20}
          className="mx-auto flex h-[60px] w-full max-w-[430px] items-center justify-center gap-3 rounded-[14px] bg-[#111] px-8 text-base font-black text-white shadow-[0_18px_32px_-22px_rgba(0,0,0,.7)] transition hover:-translate-y-0.5 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-5" />}
          {isPending ? "解析しています…" : "解析する"}
        </button>

        <section aria-label="ご利用の流れ" className="rounded-[16px] border border-[#dfe3e7] bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-[#616872]">
            {[
              "求人本文を貼り付け",
              "企業HPを入力（任意）",
              "要点を自動で整理",
              "保存して企業ページへ"
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full border border-[#cfd5da] text-[#111]"><Check className="size-3.5" /></span>
                <span>{item}</span>
                {index < 3 ? <span aria-hidden="true" className="ml-3 text-[#a3a8ae]">→</span> : null}
              </div>
            ))}
          </div>
        </section>
      </form>

      {showAnalysisLimitModal ? <AnalysisLimitModal message={state.message} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
