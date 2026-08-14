"use client";

import { ChevronRight, Plus } from "lucide-react";

export type AiInterviewSessionHistoryItem = {
  id: string;
  status: "in_progress" | "completed";
  settingSetName: string;
  scenarioLabel: string;
  questionProgressLabel: string;
  durationLabel: string;
};

type AiInterviewSessionHistorySidebarProps = {
  sessions: AiInterviewSessionHistoryItem[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
};

function getStatusChipClasses(status: AiInterviewSessionHistoryItem["status"]) {
  return status === "in_progress"
    ? "bg-[#fff3d8] text-[#c98613]"
    : "bg-[#e8f3ff] text-[#2b79d6]";
}

function getStatusLabel(status: AiInterviewSessionHistoryItem["status"]) {
  return status === "in_progress" ? "進行中" : "完了";
}

export function AiInterviewSessionHistorySidebar({
  sessions,
  selectedSessionId,
  onSelectSession,
  onCreateSession
}: AiInterviewSessionHistorySidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#e5ebdf] bg-white shadow-[0_20px_40px_-34px_rgba(15,23,42,0.16)] xl:h-full xl:w-[320px] xl:min-w-[320px] xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l xl:shadow-none">
      <div className="border-b border-[#edf1ea] px-4 py-5">
        <p className="text-[1.35rem] font-black tracking-[-0.02em] text-[#18202a]">セッション履歴</p>
        <p className="mt-1 text-sm text-[#778390] xl:hidden">狭い画面では横にスクロールして、過去の練習を開けます。</p>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto px-4 py-4 xl:overflow-x-visible xl:overflow-y-auto">
        <div className="flex min-w-max gap-4 xl:min-w-0 xl:flex-col">
          <button
            type="button"
            onClick={onCreateSession}
            className="flex min-h-[204px] w-[272px] shrink-0 flex-col justify-between rounded-[24px] border border-dashed border-[#b9e2c6] bg-[#f7fdf8] px-4 py-4 text-left transition hover:border-[#95d0a8] hover:bg-[#f1fbf4] xl:min-h-[188px] xl:w-full"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#1fa148] text-white shadow-[0_18px_36px_-28px_rgba(31,161,72,0.48)]">
                <Plus className="size-5" />
              </span>
              <span className="rounded-full bg-[#e9f8ee] px-3 py-1 text-xs font-black text-[#1f9b44]">新規</span>
            </div>
            <div>
              <p className="text-[1.05rem] font-black leading-7 text-[#18202a]">新規セッションの作成</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6c78]">面接の種類や想定企業を決めて、新しい練習を始めます。</p>
            </div>
          </button>

          {sessions.map((session) => {
            const selected = session.id === selectedSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={`min-h-[204px] w-[272px] shrink-0 rounded-[24px] border px-4 py-4 text-left shadow-[0_18px_36px_-34px_rgba(15,23,42,0.16)] transition xl:min-h-0 xl:w-full ${
                  selected ? "border-[#efc96d] bg-[#fffaf0]" : "border-[#e5ebdf] bg-white hover:border-[#d5ded5]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusChipClasses(session.status)}`}>
                    {getStatusLabel(session.status)}
                  </span>
                  <ChevronRight className="mt-1 size-4 text-[#4d5967]" />
                </div>

                <p className="mt-4 text-[1.05rem] font-black leading-7 text-[#18202a]">{session.settingSetName}</p>
                <p className="mt-3 text-sm font-bold text-[#44515f]">{session.questionProgressLabel}</p>
                <p className="mt-1 text-sm text-[#5f6c78]">{session.durationLabel}</p>
                <p className="mt-3 text-xs leading-6 text-[#7a8792]">{session.scenarioLabel}</p>
              </button>
            );
          })}

          {sessions.length === 0 ? (
            <div className="w-[272px] shrink-0 rounded-[22px] border border-dashed border-[#d7e3d7] bg-[#fbfcfa] px-4 py-4 text-sm leading-7 text-[#67727f] xl:w-full">
              まだ保存済みセッションはありません。最初の練習後にここへ履歴が積み上がります。
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden border-t border-dashed border-[#e7ece6] px-4 py-5 text-center text-sm leading-7 text-[#778390] xl:block">
        スクロールすると<br />過去のセッションが確認できます
      </div>
    </aside>
  );
}
