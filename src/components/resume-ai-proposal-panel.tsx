"use client";

import { applyResumeAiProposal, buildResumeAiProposalViewModel, type ResumeAiProposalState } from "./resume-ai-proposal-state";

type Props = {
  state: ResumeAiProposalState;
  onApply: (next: { motivation: string; selfPr: string }) => void;
  onClose: () => void;
};

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-slate-800">{value || "未入力"}</p>
    </div>
  );
}

function ProposalField({ label, current, proposed, onApply }: { label: string; current: string; proposed: string; onApply: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900">{label}</h4>
        <button type="button" className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white" onClick={onApply}>
          この項目を反映
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ValueBlock label="現在の値" value={current} />
        <ValueBlock label="AI提案" value={proposed} />
      </div>
    </div>
  );
}

export function ResumeAiProposalPanel({ state, onApply, onClose }: Props) {
  const review = buildResumeAiProposalViewModel(state, state.proposal);
  const model = review.proposal;
  const targetLabel = state.mode === "company"
    ? state.targetCompanyName ? `${state.targetCompanyName}向け` : "対象企業未設定"
    : null;
  const modeLabel = state.mode === "draft" ? "AI下書き" : state.mode === "review" ? "添削" : "企業に合わせて調整";

  if (state.loading) {
    return <div role="status" aria-live="polite" className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-900">AI提案を生成中です…</div>;
  }

  if (state.error) {
    return <div role="alert" className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{state.error}</div>;
  }

  if (!model) {
    return null;
  }

  const current = review.current;
  const applyMotivation = () => onApply(applyResumeAiProposal(state, model, { field: "motivation" }));
  const applySelfPr = () => onApply(applyResumeAiProposal(state, model, { field: "selfPr" }));
  const applyAll = () => onApply(applyResumeAiProposal(state, model, { field: "all" }));

  return (
    <section role="region" aria-label="履歴書AI提案" className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 text-sm leading-7 text-amber-950">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Resume AI</p>
          <h3 className="text-2xl font-black text-slate-950">{modeLabel}のレビュー結果</h3>
          {targetLabel ? <p className="mt-1 font-bold text-slate-700">{targetLabel}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700">反映せず閉じる</button>
          <button type="button" onClick={applyAll} className="rounded-2xl bg-slate-950 px-4 py-2 font-black text-white">自己PRと志望動機を一括反映</button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <ProposalField label="志望動機" current={current.motivation} proposed={model.motivation} onApply={applyMotivation} />
        <ProposalField label="自己PR" current={current.selfPr} proposed={model.selfPr} onApply={applySelfPr} />
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <p className="text-xs font-bold text-slate-500">変更サマリー</p>
        <p className="mt-2 whitespace-pre-wrap text-slate-800">{model.changeSummary || "変更サマリーはありません。"}</p>
        <p className="mt-4 text-xs font-bold text-slate-500">参照した証拠ソースID</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {model.evidenceSourceIds.length > 0 ? model.evidenceSourceIds.map((id) => <li key={id} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{id}</li>) : <li className="text-sm text-slate-500">なし</li>}
        </ul>
      </div>
    </section>
  );
}
