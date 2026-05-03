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
      <form action={formAction} className="panel space-y-5">
        <div className="section-heading">
          <div>
            <h2 className="section-title">求人本文を貼る</h2>
            <p className="section-copy">まずは本文だけで十分です。情報元のメモも残せて、あとから詳細画面で原文と抽出根拠を見返せます。</p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="field-label">求人本文（必須）</span>
          <textarea
            name="rawText"
            required
            minLength={20}
            rows={12}
            className="field-textarea min-h-[22rem]"
            placeholder="求人サイトや求人票の本文を貼り付けてください"
          />
          <p className="field-hint">本文内に情報があれば、会社名や職種も自動で抽出します。</p>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">会社名（任意）</span>
            <input name="companyName" className="field-input" />
          </label>
          <label className="space-y-2">
            <span className="field-label">職種（任意）</span>
            <input name="title" className="field-input" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">情報元（任意）</span>
            <input name="sourceName" placeholder="例: リクナビ" className="field-input" />
          </label>
          <label className="space-y-2">
            <span className="field-label">URL（任意）</span>
            <input name="sourceUrl" placeholder="https://..." className="field-input" />
          </label>
        </div>

        <div className="panel-muted">
          <p className="text-sm leading-6 text-slate-600">
            保存時にルールベース解析を実行し、その場でランク結果を作ります。残した求人はあとから一覧や詳細で静かに見返せます。
          </p>
        </div>

        {state.status === "error" && state.code !== "analysis_limit" ? <p className="text-sm text-rose-700">{state.message}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="button-primary">
            {isPending ? "保存中..." : "ランク付けして保存する"}
          </button>
          <p className="text-xs text-slate-500">解析にはプランに応じた利用上限があります。</p>
        </div>
      </form>

      {showAnalysisLimitModal ? <AnalysisLimitModal message={state.message} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
