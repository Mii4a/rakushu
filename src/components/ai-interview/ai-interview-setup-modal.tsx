"use client";

import { ChevronLeft, ChevronRight, Clock3, FolderOpen, MessageSquareText, PlusSquare } from "lucide-react";

import {
  AI_INTERVIEW_INTERVIEW_TYPE_LABELS,
  AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS,
  AI_INTERVIEW_SCENARIO_DEFINITIONS,
  AI_INTERVIEW_SCENARIO_LABELS,
  AI_INTERVIEW_SCENARIO_TYPE_OPTIONS,
  type AiInterviewScenarioType,
  type AiInterviewSetupDraft
} from "@/lib/ai-interview/setup-scenarios";

export type SavedSetupOption = {
  id: string;
  label: string;
  interviewType: AiInterviewSetupDraft["interviewType"];
  interviewTypeLabel: string;
  scenarioType: AiInterviewSetupDraft["scenarioType"];
  scenarioLabel: string;
  targetCompany: string;
  targetRole: string;
};

type AiInterviewSetupModalProps = {
  open: boolean;
  step: 1 | 2 | 3;
  draft: AiInterviewSetupDraft;
  savedOptions?: SavedSetupOption[];
  submitting?: boolean;
  onClose: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onBack: () => void;
  onStepChange?: (step: 1 | 2 | 3) => void;
  onDraftChange: (draft: AiInterviewSetupDraft) => void;
};

function getStepTitle(step: 1 | 2 | 3) {
  if (step === 1) return "設定方法を選択";
  if (step === 2) return "面接条件";
  return "面接シナリオを選択";
}

function renderScenarioTypeCard(
  scenarioType: AiInterviewScenarioType,
  selectedScenarioType: AiInterviewScenarioType,
  onDraftChange: (draft: AiInterviewSetupDraft) => void,
  draft: AiInterviewSetupDraft
) {
  const definition = AI_INTERVIEW_SCENARIO_DEFINITIONS.find((item) => item.type === scenarioType) ?? AI_INTERVIEW_SCENARIO_DEFINITIONS[0]!;
  const active = selectedScenarioType === scenarioType;

  return (
    <button
      key={scenarioType}
      type="button"
      onClick={() => onDraftChange({ ...draft, scenarioType })}
      aria-pressed={active}
      className={`rounded-[24px] border px-5 py-4 text-left transition ${
        active
          ? "border-[#31af57] bg-[#f3fcf5] shadow-[0_22px_42px_-34px_rgba(31,161,72,0.34)]"
          : "border-[#e3e9e2] bg-white hover:border-[#c9d8cd]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-[#18202a]">{AI_INTERVIEW_SCENARIO_LABELS[scenarioType]}</p>
          <p className="mt-1 text-xs leading-6 text-[#66727e]">{definition.description}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
            active ? "bg-[#1fa148] text-white" : "bg-[#f5f7f4] text-[#60707d]"
          }`}
        >
          {active ? "選択中" : "選択"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[#55626e]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#dde6dc] bg-white px-3 py-1.5">
          <Clock3 className="size-3.5 text-[#1e9a46]" />
          約{definition.totalDurationMinutes}分
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#dde6dc] bg-white px-3 py-1.5">
          <MessageSquareText className="size-3.5 text-[#1e9a46]" />
          全{definition.totalQuestionCount}問
        </span>
      </div>
    </button>
  );
}

export function AiInterviewSetupModal({
  open,
  step,
  draft,
  savedOptions = [],
  submitting = false,
  onClose,
  onNext,
  onSubmit,
  onBack,
  onStepChange,
  onDraftChange
}: AiInterviewSetupModalProps) {
  if (!open) return null;

  const scenarioDefinition = AI_INTERVIEW_SCENARIO_DEFINITIONS.find((item) => item.type === draft.scenarioType) ?? AI_INTERVIEW_SCENARIO_DEFINITIONS[0]!;
  const canProceed =
    step === 1
      ? draft.setupMode === "saved"
        ? Boolean(draft.selectedSavedSettingId)
        : draft.settingSetName.trim().length > 0
      : step === 2
        ? draft.targetCompany.trim().length > 0 && draft.targetRole.trim().length > 0
        : true;
  const primaryLabel = draft.setupMode === "saved" ? "この設定で始める" : step === 3 ? "この設定で始める" : "次へ";
  const modalWidthClass = step === 3 ? "max-w-[960px]" : "max-w-[560px]";

  return (
    <div className="mock-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.34)] px-4 py-4 backdrop-blur-[2px] sm:px-6 motion-reduce:animate-none">
      <div role="dialog" aria-modal="true" aria-labelledby="ai-interview-setup-title" className={`mock-modal-panel flex max-h-[calc(100vh-2rem)] w-full ${modalWidthClass} flex-col overflow-hidden rounded-[24px] border border-[#dfe7de] bg-white shadow-[0_36px_120px_-50px_rgba(15,23,42,0.38)] motion-reduce:animate-none`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1ea] px-6 py-5 sm:px-8">
          <div>
            <div className="text-sm font-black tracking-[0.18em] text-[#209844]">STEP {draft.setupMode === "saved" ? 1 : step} / {draft.setupMode === "saved" ? 1 : 3}</div>
            <p id="ai-interview-setup-title" className="mt-2 text-[1.65rem] font-black tracking-[-0.02em] text-[#18202a]">AI面接の初期設定</p>
            <p className="mt-3 text-sm font-bold text-[#1d2430]">{getStepTitle(step)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#e4e8e2] bg-white px-4 text-sm font-bold text-[#52606d] hover:border-[#ccd8d0]"
          >
            閉じる
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onDraftChange({ ...draft, setupMode: "new", selectedSavedSettingId: null })}
                  className={`rounded-[22px] border px-5 py-5 text-left transition ${
                    draft.setupMode === "new"
                      ? "border-[#33b459] bg-[#f3fcf5] shadow-[0_24px_44px_-34px_rgba(31,161,72,0.34)]"
                      : "border-[#e4eae3] bg-white hover:border-[#cad8cf]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-[#dbe8dd] bg-white text-[#21984a]">
                      <PlusSquare className="size-6" />
                    </div>
                    <span className={`inline-flex size-6 rounded-full border ${draft.setupMode === "new" ? "border-[#2caf55] bg-[#2caf55]" : "border-[#d7dfd9] bg-white"}`}>
                      <span className="m-auto size-2 rounded-full bg-white" />
                    </span>
                  </div>
                  <p className="mt-5 text-[1.25rem] font-black text-[#18202a]">新規で設定する</p>
                  <p className="mt-2 text-sm leading-7 text-[#6b7784]">はじめから設定を作成し、今回の面接条件を登録します。</p>
                </button>

                <button
                  type="button"
                  onClick={() => onDraftChange({ ...draft, setupMode: "saved" })}
                  className={`rounded-[22px] border px-5 py-5 text-left transition ${
                    draft.setupMode === "saved"
                      ? "border-[#33b459] bg-[#f3fcf5] shadow-[0_24px_44px_-34px_rgba(31,161,72,0.34)]"
                      : "border-[#e4eae3] bg-white hover:border-[#cad8cf]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-[#dbe8dd] bg-white text-[#44515f]">
                      <FolderOpen className="size-6" />
                    </div>
                    <span className={`inline-flex size-6 rounded-full border ${draft.setupMode === "saved" ? "border-[#2caf55] bg-[#2caf55]" : "border-[#d7dfd9] bg-white"}`}>
                      <span className="m-auto size-2 rounded-full bg-white" />
                    </span>
                  </div>
                  <p className="mt-5 text-[1.25rem] font-black text-[#18202a]">保存済み設定から選ぶ</p>
                  <p className="mt-2 text-sm leading-7 text-[#6b7784]">以前作成した設定を読み込んで、すぐに練習を再開します。</p>
                </button>
              </div>

              {draft.setupMode === "new" ? (
                <label className="block space-y-3">
                  <span className="text-sm font-black text-[#1d2430]">新しい設定セット名</span>
                  <input
                    value={draft.settingSetName}
                    onChange={(event) => onDraftChange({ ...draft, settingSetName: event.target.value })}
                    placeholder="既卒_メーカー面接セット"
                    className="h-14 w-full rounded-[18px] border border-[#dbe4db] bg-white px-4 text-sm font-medium text-[#1d2430] outline-none placeholder:text-[#9aa4ae] focus:border-[#93d2a4] focus:ring-4 focus:ring-[#e3f4e7]"
                  />
                  <p className="text-xs leading-6 text-[#778391]">この名前はセッション設定を保存するときの表示名になります。</p>
                </label>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-black text-[#1d2430]">保存済み設定</p>
                  {savedOptions.length > 0 ? (
                    <div className="space-y-3">
                      <select
                        value={draft.selectedSavedSettingId ?? ""}
                        onChange={(event) => {
                          const selected = savedOptions.find((option) => option.id === event.target.value) ?? null;
                          if (!selected) {
                            onDraftChange({ ...draft, selectedSavedSettingId: null });
                            return;
                          }
                          onDraftChange({
                            ...draft,
                            setupMode: "saved",
                            selectedSavedSettingId: selected.id,
                            settingSetName: selected.label,
                            interviewType: selected.interviewType,
                            targetCompany: selected.targetCompany,
                            targetRole: selected.targetRole,
                            scenarioType: selected.scenarioType
                          });
                        }}
                        className="h-14 w-full rounded-[18px] border border-[#dbe4db] bg-white px-4 text-sm font-medium text-[#1d2430] outline-none focus:border-[#93d2a4] focus:ring-4 focus:ring-[#e3f4e7]"
                      >
                        <option value="">保存済み設定を選択してください</option>
                        {savedOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}｜{option.scenarioLabel}｜{option.interviewTypeLabel}
                          </option>
                        ))}
                      </select>
                      {draft.selectedSavedSettingId ? (
                        <div className="rounded-[20px] border border-[#e4eae3] bg-[#fbfcfa] px-4 py-4 text-sm leading-7 text-[#6b7784]">
                          <p className="font-black text-[#1d2430]">{draft.settingSetName}</p>
                          <p className="mt-2">{AI_INTERVIEW_SCENARIO_LABELS[draft.scenarioType]} / {AI_INTERVIEW_INTERVIEW_TYPE_LABELS[draft.interviewType]}</p>
                          <p>{draft.targetCompany} / {draft.targetRole}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[#d7e3d7] bg-[#fbfcfa] px-4 py-4 text-sm leading-7 text-[#6b7784]">
                      まだ保存済み設定はありません。まずは新規で設定を作成してください。
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5">
              <label className="block space-y-3">
                <span className="text-sm font-black text-[#1d2430]">面接の種類</span>
                <select
                  value={draft.interviewType}
                  onChange={(event) => onDraftChange({ ...draft, interviewType: event.target.value as AiInterviewSetupDraft["interviewType"] })}
                  className="h-14 w-full rounded-[18px] border border-[#dbe4db] bg-white px-4 text-sm font-medium text-[#1d2430] outline-none focus:border-[#93d2a4] focus:ring-4 focus:ring-[#e3f4e7]"
                >
                  {AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {AI_INTERVIEW_INTERVIEW_TYPE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-3">
                <span className="text-sm font-black text-[#1d2430]">想定企業</span>
                <input
                  value={draft.targetCompany}
                  onChange={(event) => onDraftChange({ ...draft, targetCompany: event.target.value })}
                  placeholder="らくしゅう株式会社"
                  className="h-14 w-full rounded-[18px] border border-[#dbe4db] bg-white px-4 text-sm font-medium text-[#1d2430] outline-none placeholder:text-[#9aa4ae] focus:border-[#93d2a4] focus:ring-4 focus:ring-[#e3f4e7]"
                />
              </label>

              <label className="block space-y-3">
                <span className="text-sm font-black text-[#1d2430]">想定職種</span>
                <input
                  value={draft.targetRole}
                  onChange={(event) => onDraftChange({ ...draft, targetRole: event.target.value })}
                  placeholder="例: 営業職"
                  className="h-14 w-full rounded-[18px] border border-[#dbe4db] bg-white px-4 text-sm font-medium text-[#1d2430] outline-none placeholder:text-[#9aa4ae] focus:border-[#93d2a4] focus:ring-4 focus:ring-[#e3f4e7]"
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-black text-[#1d2430]">練習したいシナリオを選んでください</p>
                <p className="mt-1 text-xs leading-6 text-[#70808c]">カードをクリックすると、下のカテゴリ構成と想定時間が更新されます。</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                {AI_INTERVIEW_SCENARIO_TYPE_OPTIONS.map((scenarioType) =>
                  renderScenarioTypeCard(scenarioType, draft.scenarioType, onDraftChange, draft)
                )}
              </div>

              <div className="rounded-[28px] border border-[#e4ebe3] bg-[#fbfcfa] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebf0ea] pb-4">
                  <div>
                    <p className="text-lg font-black text-[#18202a]">{scenarioDefinition.label}向けシナリオ</p>
                    <p className="mt-1 text-sm text-[#6b7784]">{scenarioDefinition.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7da] bg-white px-4 py-2 text-sm font-bold text-[#44515f]">
                      <Clock3 className="size-4 text-[#1e9a46]" />
                      約{scenarioDefinition.totalDurationMinutes}分
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7da] bg-white px-4 py-2 text-sm font-bold text-[#44515f]">
                      <MessageSquareText className="size-4 text-[#1e9a46]" />
                      全{scenarioDefinition.totalQuestionCount}問
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {scenarioDefinition.categories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-[22px] border border-[#e3eae2] bg-white px-5 py-4 text-left shadow-[0_12px_26px_-26px_rgba(15,23,42,0.18)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-base font-black text-[#1d2430]">{category.label}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5c6a76]">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f7f2] px-3 py-1">
                            <Clock3 className="size-3.5 text-[#1e9a46]" />
                            {category.durationMinutes}分
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f7f2] px-3 py-1">
                            <MessageSquareText className="size-3.5 text-[#1e9a46]" />
                            {category.questionCount}問
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#60707d]">質問例: {category.sampleQuestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 border-t border-[#edf1ea] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex gap-2">
            {draft.setupMode === "new"
              ? [1, 2, 3].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onStepChange?.(item as 1 | 2 | 3)}
                    className={`size-3 rounded-full ${step === item ? "bg-[#1fa148]" : "bg-[#dce6db]"}`}
                    aria-label={`ステップ${item}へ移動`}
                  />
                ))
              : null}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            {draft.setupMode === "new" && step > 1 ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-[#dbe4db] bg-white px-5 text-sm font-bold text-[#1f2832]"
              >
                <ChevronLeft className="size-4" />
                戻る
              </button>
            ) : null}
            <button
              type="button"
              onClick={draft.setupMode === "saved" || step === 3 ? onSubmit : onNext}
              disabled={!canProceed || submitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#1fa148] px-6 text-sm font-bold text-white shadow-[0_22px_44px_-30px_rgba(31,161,72,0.56)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "保存中..." : primaryLabel}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
