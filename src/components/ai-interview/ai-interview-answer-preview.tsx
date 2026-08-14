import type { ReactNode } from "react";

import { Copy } from "lucide-react";

import type { InterviewRecordingState } from "@/components/ai-interview/ai-interview-recording-visualizer";

type AiInterviewAnswerPreviewProps = {
  state: InterviewRecordingState;
  finalTranscript: string;
  isReviewingPastSession?: boolean;
  reviewedAnswerText?: string;
  footerSlot?: ReactNode;
};

function getRightBadge(state: InterviewRecordingState, showPastReview: boolean, showFinalizedPreview: boolean) {
  if (showPastReview) {
    return <span className="rounded-full border border-[#e4e8e2] bg-white px-3 py-1 text-xs font-bold text-[#7b8794]">保存済み回答</span>;
  }

  if (state === "transcribing") {
    return <span className="rounded-full border border-[#dcfce7] bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16a34a]">Whisper 文字起こし中</span>;
  }

  if (state === "evaluating") {
    return <span className="rounded-full border border-[#dcfce7] bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16a34a]">GPT 評価中</span>;
  }

  if (state === "complete" && showFinalizedPreview) {
    return (
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[#e4e8e2] bg-white px-4 text-xs font-bold text-[#7b8794]"
      >
        文字起こしをコピー
        <Copy className="size-3.5" />
      </button>
    );
  }

  return <span className="rounded-full border border-[#edf1ea] bg-[#fcfcfb] px-3 py-1 text-xs font-bold text-[#a0a9b4]">録音後に結果を表示</span>;
}

export function AiInterviewAnswerPreview({
  state,
  finalTranscript,
  isReviewingPastSession = false,
  reviewedAnswerText,
  footerSlot
}: AiInterviewAnswerPreviewProps) {
  const effectiveTranscript = isReviewingPastSession ? reviewedAnswerText ?? "" : finalTranscript;
  const showPastReview = isReviewingPastSession && Boolean(reviewedAnswerText);
  const showFinalizedPreview = !isReviewingPastSession && (state === "evaluating" || state === "complete");
  const showPendingMessage = !isReviewingPastSession && (state === "idle" || state === "recording" || state === "transcribing");

  return (
    <div className="mt-8 rounded-[20px] border border-[#e0e8df] bg-white px-5 py-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-[#dce5dc] bg-[#f9fbf8] text-[#475569]">
            <Copy className="size-4" />
          </span>
          <div>
            <p className="text-base font-black text-[#1a1f25]">録音後の文字起こし結果</p>
          </div>
        </div>

        {getRightBadge(state, showPastReview, showFinalizedPreview)}
      </div>

      {showPendingMessage ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-[16px] border border-[#edf1ea] bg-[#fcfcfb] px-4 py-3">
          <p className="text-sm leading-7 text-[#98a1ab]">
            {state === "recording"
              ? "録音中は音声認識バーだけを表示します。"
              : state === "transcribing"
                ? "音声ファイルをアップロードして、文字起こしが返るのを待っています。"
                : "ここに録音後の文字起こし結果が表示されます。"}
          </p>
          <span className="whitespace-nowrap rounded-full border border-[#edf1ea] bg-white px-3 py-1 text-xs font-bold text-[#a0a9b4]">
            {state === "recording" ? "録音中" : state === "transcribing" ? "処理中" : "待機中"}
          </span>
        </div>
      ) : null}

      {showFinalizedPreview || showPastReview ? (
        <div className="mt-4 rounded-[16px] border border-[#dce5dc] bg-white px-4 py-4 text-sm leading-7 text-[#24313f]">
          {effectiveTranscript}
        </div>
      ) : null}

      {footerSlot ? <div className="mt-4 flex flex-wrap items-center justify-end gap-3">{footerSlot}</div> : null}
    </div>
  );
}
