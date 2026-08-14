"use client";

import { CheckCircle2, ChevronRight, Lightbulb, MessageSquareQuote, RotateCcw, Sparkles, Target, ThumbsUp, X } from "lucide-react";

type CategoryAnswer = {
  id: string;
  questionId: string;
  prompt: string;
  answerText: string;
  score: number;
  strengths: string[];
  improvements: string[];
  followUps: string[];
};

type CategoryFeedback = {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextFocus: string;
  nextQuestions: string[];
} | null;

type AiInterviewFeedbackModalProps = {
  open: boolean;
  categoryLabel: string;
  completedCount: number;
  totalCount: number;
  answers: CategoryAnswer[];
  categoryFeedback?: CategoryFeedback;
  activeAnswerId: string | null;
  canReset?: boolean;
  resetting?: boolean;
  onSelectAnswer: (answerId: string) => void;
  onClose: () => void;
  onReset: () => void;
  onNext: () => void;
};

function renderBulletList(items: string[], colorClass: string, fallback: string) {
  if (items.length === 0) {
    return <p className="text-sm leading-7 text-[#66707c]">{fallback}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3 text-sm leading-7 text-[#334150]">
          <CheckCircle2 className={`mt-1 size-4 shrink-0 ${colorClass}`} />
          <p>{item}</p>
        </div>
      ))}
    </div>
  );
}

export function AiInterviewFeedbackModal({
  open,
  categoryLabel,
  completedCount,
  totalCount,
  answers,
  categoryFeedback = null,
  activeAnswerId,
  canReset = false,
  resetting = false,
  onSelectAnswer,
  onClose,
  onReset,
  onNext
}: AiInterviewFeedbackModalProps) {
  if (!open) return null;

  const activeAnswer = answers.find((answer) => answer.id === activeAnswerId) ?? answers[answers.length - 1] ?? null;
  const averageScore = answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length : 0;
  const displayOverallScore = categoryFeedback?.overallScore ?? averageScore;
  const displaySummary = categoryFeedback?.summary ?? (activeAnswer ? "あなたの回答は全体的に良くまとまっており、伝えたいことが明確に伝わっています。さらにブラッシュアップしていきましょう！" : "評価データがまだありません。");
  const displayStrengths = categoryFeedback?.strengths ?? activeAnswer?.strengths ?? [];
  const displayImprovements = categoryFeedback?.improvements ?? activeAnswer?.improvements ?? [];
  const displayNextFocus = categoryFeedback?.nextFocus ?? activeAnswer?.improvements[0] ?? "次の質問では、結論→具体例→学びの順で短く整理して答えてみましょう。";
  const displayNextQuestions = categoryFeedback?.nextQuestions ?? activeAnswer?.followUps ?? [];

  return (
    <div className="mock-modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.34)] px-4 py-4 backdrop-blur-[2px] sm:px-6 motion-reduce:animate-none">
      <div role="dialog" aria-modal="true" aria-labelledby="ai-interview-feedback-title" className="mock-modal-panel flex max-h-[calc(100vh-2rem)] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-[#dfe7de] bg-white shadow-[0_36px_120px_-50px_rgba(15,23,42,0.38)] motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8">
          <div className="w-full text-center">
            <div id="ai-interview-feedback-title" className="inline-flex items-center gap-3 text-[1.9rem] font-black tracking-[-0.02em] text-[#18202a]">
              <Sparkles className="size-7 text-[#20a046]" />
              <span>{categoryLabel}｜AI評価フィードバック</span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#bfe1c9] bg-[#f3fcf5] px-4 py-2 text-lg font-black text-[#1f9b44]">
              <CheckCircle2 className="size-5" />
              {completedCount}/{totalCount}問 回答完了
            </div>
            <p className="mt-4 text-sm leading-7 text-[#5d6976]">AIがこのカテゴリ全体の回答をもとに、面接での伝え方をフィードバックしました。</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start">
            {canReset ? (
              <button
                type="button"
                onClick={onReset}
                disabled={resetting}
                className="inline-flex size-12 items-center justify-center rounded-full border border-[#fecaca] bg-white text-[#dc2626] hover:border-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="カテゴリ回答をやり直す"
              >
                <RotateCcw className="size-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[#e4e8e2] bg-white text-[#52606d] hover:border-[#ccd8d0]"
              aria-label="フィードバックを閉じる"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-6 pb-6 sm:px-8">
          <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#e4ebe3] bg-white">
              <div className="flex items-center gap-3 border-b border-[#edf1ea] px-6 py-5">
                <MessageSquareQuote className="size-5 text-[#1f9b44]" />
                <p className="text-[1.1rem] font-black text-[#18202a]">回答した質問</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {answers.map((answer, index) => {
                    const active = answer.id === activeAnswer?.id;
                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() => onSelectAnswer(answer.id)}
                        className={`w-full rounded-[22px] border px-5 py-5 text-left transition ${
                          active ? "border-[#b9e2c6] bg-[#f7fcf8] shadow-[0_18px_36px_-34px_rgba(31,161,72,0.28)]" : "border-[#e8ede7] bg-white hover:border-[#d1ddd3]"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1fa148] text-sm font-black text-white">{index + 1}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[1.02rem] font-black leading-7 text-[#18202a]">{answer.prompt}</p>
                            <div className="mt-3 inline-flex rounded-full bg-[#f3fcf5] px-3 py-1 text-xs font-black text-[#1f9b44]">あなたの回答（要約）</div>
                            <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#44515f]">{answer.answerText}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <div className="rounded-[22px] border border-[#d8ebdd] bg-[#f6fcf7] px-4 py-4 text-sm leading-7 text-[#5b6a66]">
                    <p className="font-black text-[#1f9b44]">AIからの一言</p>
                    <p className="mt-2">{displaySummary}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#e4ebe3] bg-white p-5">
              <div className="flex items-center gap-3 px-1 pb-4">
                <Target className="size-5 text-[#1f9b44]" />
                <p className="text-[1.1rem] font-black text-[#18202a]">AI 評価レポート</p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-4 rounded-[22px] border border-[#e7ece7] bg-[#fcfcfb] p-5 md:grid-cols-[220px_1fr]">
                  <div className="border-b border-[#ebf0ea] pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-5">
                    <p className="text-sm font-bold text-[#66707c]">総合評価</p>
                    <div className="mt-3 flex items-end gap-2 text-[#1fa148]">
                      <span className="text-[3rem] font-black leading-none">{displayOverallScore.toFixed(1)}</span>
                      <span className="pb-2 text-xl font-bold text-[#44515f]">/ 5.0</span>
                    </div>
                    <div className="mt-3 flex gap-1 text-[#1fa148]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Sparkles key={index} className={`size-4 ${index < Math.round(displayOverallScore) ? "opacity-100" : "opacity-25"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-base leading-8 text-[#334150]">
                    <p>{displaySummary}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-[22px] border border-[#e7ece7] bg-white p-5">
                    <div className="mb-3 flex items-center gap-3 text-[#1f9b44]">
                      <ThumbsUp className="size-5" />
                      <p className="text-lg font-black">よかった点</p>
                    </div>
                    {renderBulletList(displayStrengths, "text-[#1f9b44]", "良かった点は、カテゴリ完了後にここへ表示されます。")}
                  </div>

                  <div className="rounded-[22px] border border-[#e7ece7] bg-white p-5">
                    <div className="mb-3 flex items-center gap-3 text-[#ef8a1e]">
                      <Lightbulb className="size-5" />
                      <p className="text-lg font-black">改善ポイント</p>
                    </div>
                    {renderBulletList(displayImprovements, "text-[#ef8a1e]", "改善ポイントは、カテゴリ完了後にここへ表示されます。")}
                  </div>

                  <div className="rounded-[22px] border border-[#e7ece7] bg-white p-5">
                    <div className="mb-3 flex items-center gap-3 text-[#2b79d6]">
                      <Target className="size-5" />
                      <p className="text-lg font-black">次に意識したいこと</p>
                    </div>
                    <p className="text-sm leading-7 text-[#334150]">{displayNextFocus}</p>
                  </div>

                  <div className="rounded-[22px] border border-[#e7ece7] bg-white p-5">
                    <div className="mb-3 flex items-center gap-3 text-[#8e58d9]">
                      <MessageSquareQuote className="size-5" />
                      <p className="text-lg font-black">次に聞かれそうな質問</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayNextQuestions.map((item) => (
                        <span key={item} className="rounded-full border border-[#e1d6f7] bg-[#faf7ff] px-4 py-2 text-sm font-bold text-[#6f46bf]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-[#edf1ea] px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 min-w-[150px] items-center justify-center rounded-[16px] border border-[#dbe4db] bg-white px-6 text-sm font-bold text-[#1f2832]"
          >
            いったん閉じる
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-12 min-w-[170px] items-center justify-center gap-2 rounded-[16px] bg-[#1fa148] px-6 text-sm font-bold text-white shadow-[0_22px_44px_-30px_rgba(31,161,72,0.56)]"
          >
            次の質問へ進む
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
