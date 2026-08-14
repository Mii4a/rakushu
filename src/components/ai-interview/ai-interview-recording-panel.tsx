import type { ReactNode } from "react";

import { Check, ChevronRight, Mic, Sparkles, Square } from "lucide-react";

import { AiInterviewAnswerPreview } from "@/components/ai-interview/ai-interview-answer-preview";
import {
  AiInterviewRecordingVisualizer,
  type InterviewRecordingState
} from "@/components/ai-interview/ai-interview-recording-visualizer";

type AiInterviewRecordingPanelProps = {
  state: InterviewRecordingState;
  elapsedLabel: string;
  finalTranscript: string;
  audioLevel?: number;
  errorMessage?: string | null;
  isReviewingPastSession?: boolean;
  reviewedAnswerText?: string;
  onRecorderClick: () => void;
  onOpenFeedback: () => void;
  showCompleteFeedbackAction?: boolean;
  footerSlot?: ReactNode;
};

function getTitle(state: InterviewRecordingState, elapsedLabel: string, isReviewingPastSession: boolean) {
  if (isReviewingPastSession) return "保存した回答を見返し中";
  if (state === "recording") return `録音中 ${elapsedLabel}`;
  if (state === "transcribing") return "Whisper で文字起こし中...";
  if (state === "evaluating") return "GPT が追加質問・評価を生成中...";
  if (state === "complete") return "処理が完了しました";
  return "クリックして録音を開始";
}

function getDescription(state: InterviewRecordingState, isReviewingPastSession: boolean) {
  if (isReviewingPastSession) {
    return "このセッションでは保存済み回答とフィードバックだけを確認できます。続きの練習は最新セッションに戻ってください。";
  }
  if (state === "recording") return "もう一度クリックで録音を終了します。2分に達した場合は自動で文字起こしへ進みます";
  if (state === "transcribing") return "録音データを Whisper に送り、一括で文字起こししています";
  if (state === "evaluating") return "文字起こし結果をもとに追加質問またはカテゴリ評価を生成しています";
  if (state === "complete") return "文字起こしとAI評価の保存が完了しました";
  return "録音中は音声認識バーだけを表示します。";
}

function getAction(
  state: InterviewRecordingState,
  isReviewingPastSession: boolean,
  showCompleteFeedbackAction: boolean,
  onOpenFeedback: () => void
) {
  if (isReviewingPastSession) return null;
  if (state === "complete" && showCompleteFeedbackAction) {
    return (
      <button
        type="button"
        onClick={onOpenFeedback}
        className="inline-flex h-12 min-w-[268px] items-center justify-center gap-2 rounded-full bg-[#16a34a] px-6 text-sm font-bold text-white shadow-[0_22px_44px_-30px_rgba(22,163,74,0.56)]"
      >
        フィードバックを見る
        <ChevronRight className="size-4" />
      </button>
    );
  }
  return null;
}

export function AiInterviewRecordingPanel({
  state,
  elapsedLabel,
  finalTranscript,
  audioLevel = 0,
  errorMessage = null,
  isReviewingPastSession = false,
  reviewedAnswerText,
  onRecorderClick,
  onOpenFeedback,
  showCompleteFeedbackAction = false,
  footerSlot
}: AiInterviewRecordingPanelProps) {
  const title = getTitle(state, elapsedLabel, isReviewingPastSession);
  const description = getDescription(state, isReviewingPastSession);
  const action = getAction(state, isReviewingPastSession, showCompleteFeedbackAction, onOpenFeedback);
  const interactive = !isReviewingPastSession && state !== "transcribing" && state !== "evaluating" && state !== "complete";

  return (
    <div className="mt-6 rounded-[28px] border border-[#e6ece2] bg-[linear-gradient(180deg,#fcfffb_0%,#f6fbf7_100%)] px-6 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex min-h-[300px] flex-col items-center justify-center">
        <button
          type="button"
          onClick={interactive ? onRecorderClick : undefined}
          disabled={!interactive}
          className={`flex w-full max-w-[820px] flex-col items-center justify-center rounded-[24px] px-3 py-4 ${interactive ? "group cursor-pointer" : "cursor-default"}`}
          aria-label={state === "recording" ? "録音を終了" : "録音を開始"}
        >
          <AiInterviewRecordingVisualizer state={state} interactive={interactive} audioLevel={audioLevel} />
          <p className={`mt-5 text-[1.2rem] font-black ${state === "recording" ? "text-[#dc2626]" : "text-[#1a1f25]"}`}>{title}</p>
          <p className="mt-2 text-sm text-[#6b7580]">{description}</p>
        </button>

        {action ? <div className="mt-5">{action}</div> : null}

        {!isReviewingPastSession && state === "idle" ? (
          <>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16a34a]">
              <Mic className="size-3.5" />
              ゆっくり、はっきりと話すことを心がけましょう
            </div>
            {errorMessage ? <p className="mt-3 text-sm font-medium text-[#c14545]">{errorMessage}</p> : null}
          </>
        ) : null}

        {!isReviewingPastSession && state === "recording" ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-bold text-[#dc2626]">
            <Square className="size-3.5 fill-current" />
            音声認識バーがマイク入力に合わせて強く反応します。2分で自動終了します
          </div>
        ) : null}

        {!isReviewingPastSession && state === "evaluating" ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16a34a]">
            <Sparkles className="size-3.5" />
            追加質問またはカテゴリ評価を生成中
          </div>
        ) : null}

        {!isReviewingPastSession && state === "complete" ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16a34a]">
            <Check className="size-3.5" />
            いつでもフィードバックを確認できます
          </div>
        ) : null}
      </div>

      <AiInterviewAnswerPreview
        state={state}
        finalTranscript={finalTranscript}
        isReviewingPastSession={isReviewingPastSession}
        reviewedAnswerText={reviewedAnswerText}
        footerSlot={footerSlot}
      />
    </div>
  );
}
