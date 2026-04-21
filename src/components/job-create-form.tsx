"use client";

import { useActionState, useEffect, useState } from "react";

import { createJobAction, type JobActionState } from "@/actions/job-actions";
import { AnalysisLimitModal } from "@/components/analysis-limit-modal";

const initialState: JobActionState = {
  status: "idle"
};

export function JobCreateForm() {
  const [state, formAction, isPending] = useActionState(createJobAction, initialState);
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    if (state.status === "error" && state.code === "analysis_limit") {
      setIsModalOpen(true);
    }
  }, [state]);

  const showAnalysisLimitModal = state.status === "error" && state.code === "analysis_limit" && isModalOpen;

  return (
    <>
      <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block space-y-1 text-sm">
          <span className="text-slate-700">求人本文（必須）</span>
          <textarea
            name="rawText"
            required
            minLength={20}
            rows={12}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="求人サイトや求人票の本文を貼り付けてください"
          />
          <p className="text-xs text-slate-500">本文内に情報があれば、会社名や職種も自動で抽出します。</p>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">会社名（任意）</span>
            <input name="companyName" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">職種（任意）</span>
            <input name="title" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">情報元（任意）</span>
            <input name="sourceName" placeholder="例: リクナビ" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">URL（任意）</span>
            <input name="sourceUrl" placeholder="https://..." className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <p className="text-xs text-slate-500">保存時にルールベース解析を実行し、解析結果を別テーブルへ保存します。</p>

        {state.status === "error" && state.code !== "analysis_limit" ? <p className="text-sm text-rose-700">{state.message}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white hover:bg-rakushu-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "保存中..." : "保存して解析する"}
        </button>
      </form>

      {showAnalysisLimitModal ? <AnalysisLimitModal message={state.message} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
