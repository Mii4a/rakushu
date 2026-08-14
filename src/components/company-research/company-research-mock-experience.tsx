"use client";

import { useEffect, useState, useTransition, type UIEvent } from "react";
import {
  Bell,
  Bookmark,
  Building2,
  ChevronDown,
  CircleHelp,
  Info,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search
} from "lucide-react";

import { askCompanyResearchQuestionAction, loadMoreCompanyResearchesAction, saveCompanyResearchAction } from "@/actions/company-research-actions";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { NextStepCard } from "@/components/company-research/next-step-card";
import { ResearchChatMessage } from "@/components/company-research/research-chat-message";
import { ResearchProcessingState } from "@/components/company-research/research-processing-state";
import { ResearchReportModal } from "@/components/company-research/research-report-modal";
import { ResearchReportPreviewCard } from "@/components/company-research/research-report-preview-card";
import type { CompanyResearchRecentItem, CompanyResearchResult } from "@/lib/company-research/mock-data";
import type { CompanyResearchChatMessage } from "@/lib/company-research/types";
import { clearTopDemoIntent, readTopDemoIntent } from "@/lib/top-demo-intent";

type SavedCompanyResearch = CompanyResearchRecentItem & {
  query: string;
  result: CompanyResearchResult;
};

type HistoryGroup = {
  label: string;
  items: SavedCompanyResearch[];
};

type CheckedJob = {
  id: string;
  companyName: string;
  websiteUrl: string;
};

type CompanyResearchInputPanelProps = {
  mode: "saved" | "new";
  checkedJobs: CheckedJob[];
  selectedJobId: string;
  query: string;
  canStart: boolean;
  isSaving: boolean;
  saveError: string | null;
  restoreMessage: string | null;
  onModeChange: (mode: "saved" | "new") => void;
  onSelectedJobChange: (jobId: string) => void;
  onQueryChange: (query: string) => void;
  onStartResearch: () => void;
};

function hasKnownCompanyName(job: CheckedJob | null | undefined) {
  return Boolean(job?.companyName && job.companyName !== "会社名未取得");
}

type CompanyResearchMockExperienceProps = {
  displayName: string;
  profileInitial: string;
  planLabel: string;
  remainingResearchCount: number;
  initialJobId?: string;
  checkedJobs: CheckedJob[];
  initialResearches: SavedCompanyResearch[];
  initialHasMoreResearches: boolean;
};

function parseResearchDate(value: string) {
  const normalized = value.replace(/\//g, "-");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function daysAgo(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() - days);
  return next;
}

function formatCompactDate(value: string) {
  const parsed = parseResearchDate(value);
  if (!parsed) return value.replace(/-/g, "/");

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function formatHistoryTimestamp(value: string) {
  const parsed = parseResearchDate(value);
  if (!parsed) return formatCompactDate(value);

  const now = new Date();
  const yesterday = daysAgo(now, 1);
  if (isSameCalendarDay(parsed, now) || isSameCalendarDay(parsed, yesterday)) {
    return parsed.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  return formatCompactDate(value);
}

function groupResearchHistory(items: SavedCompanyResearch[], now = new Date()): HistoryGroup[] {
  const today: SavedCompanyResearch[] = [];
  const yesterday: SavedCompanyResearch[] = [];
  const recent: SavedCompanyResearch[] = [];

  for (const item of items) {
    const date = parseResearchDate(item.researchedAt);
    if (!date || isSameCalendarDay(date, now)) {
      today.push(item);
      continue;
    }

    if (isSameCalendarDay(date, daysAgo(now, 1))) {
      yesterday.push(item);
      continue;
    }

    recent.push(item);
  }

  return [
    { label: "今日", items: today },
    { label: "昨日", items: yesterday },
    { label: "過去7日間", items: recent }
  ].filter((group) => group.items.length > 0);
}

function CompanyResearchHistoryRail({
  items,
  activeId,
  isLoadingMore,
  hasMore,
  onSelect,
  onNewResearch,
  onToggleOpen,
  onLoadMore
}: {
  items: SavedCompanyResearch[];
  activeId: string | null;
  isLoadingMore: boolean;
  hasMore: boolean;
  onSelect: (item: SavedCompanyResearch) => void;
  onNewResearch: () => void;
  onToggleOpen: () => void;
  onLoadMore: () => void;
}) {
  const groups = groupResearchHistory(items);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 80;

    if (!nearBottom || isLoadingMore || !hasMore) return;
    onLoadMore();
  };

  return (
    <aside id="company-research-history-rail" className="company-research-history-rail">
      <div className="company-research-history-header">
        <div className="flex items-center gap-1.5">
          <h2>企業研究の履歴</h2>
          <CircleHelp className="size-4 text-[#222222]" />
        </div>
        <button
          type="button"
          aria-label="企業研究の履歴を閉じる"
          aria-controls="company-research-history-rail"
          aria-expanded="true"
          onClick={onToggleOpen}
          className="company-research-history-toggle-icon"
        >
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <button type="button" onClick={onNewResearch} className="company-research-history-new-button">
        <Plus className="size-4" aria-hidden="true" />
        <span>新規リサーチ</span>
      </button>

      <div className="company-research-history-list" onScroll={handleScroll}>
        {groups.length > 0 ? (
          groups.map((group) => (
            <section key={group.label} className="company-research-history-group">
              <p className="company-research-history-group-label">{group.label}</p>
              <div className="company-research-history-card-list">
                {group.items.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item)}
                      className={`company-research-history-card ${active ? "company-research-history-card-active" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="company-research-history-company">{item.companyName}</span>
                        <span className="company-research-history-date">{formatHistoryTimestamp(item.researchedAt)}</span>
                      </span>
                      <span className="company-research-history-card-meta">
                        <span className="company-research-history-saved">保存済み</span>
                        <Bookmark className="size-4 shrink-0" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="company-research-history-empty">
            最初の企業研究を保存すると、ここに履歴が表示されます。
          </div>
        )}

        {isLoadingMore ? (
          <div className="company-research-history-loading" role="status" aria-live="polite">
            <span className="company-research-history-spinner" aria-hidden="true" />
            <span>以前の履歴を読み込んでいます</span>
          </div>
        ) : null}

        {!hasMore && items.length > 0 ? <div className="company-research-history-end">これ以上古い履歴はありません</div> : null}
      </div>

      <div className="company-research-history-note">
        <span className="company-research-history-note-icon"><Info className="size-3" /></span>
        <span>保存した企業研究は、いつでも見返すことができます。</span>
      </div>
    </aside>
  );
}

function CompanyResearchInputPanel({
  mode,
  checkedJobs,
  selectedJobId,
  query,
  canStart,
  isSaving,
  saveError,
  restoreMessage,
  onModeChange,
  onSelectedJobChange,
  onQueryChange,
  onStartResearch
}: CompanyResearchInputPanelProps) {
  const knownCheckedJobs = checkedJobs.filter((item) => hasKnownCompanyName(item));

  return (
    <div className="company-research-input-stack">
      <header className="company-research-input-heading">
        <Building2 className="company-research-input-heading-icon" aria-hidden="true" />
        <div>
          <h1>企業研究</h1>
          <p>企業の公式サイトをもとに、事業・組織・カルチャーなどを整理して理解を深めましょう。</p>
        </div>
      </header>

      <section className="company-research-input-card" aria-labelledby="company-research-input-title">
        <h2 id="company-research-input-title" className="sr-only">企業研究の入力</h2>

        {restoreMessage ? <p className="mb-4 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{restoreMessage}</p> : null}

        <div className="company-research-input-tabs" role="tablist" aria-label="企業研究の入力方法">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "saved"}
            onClick={() => onModeChange("saved")}
            className={mode === "saved" ? "company-research-input-tab-active" : "company-research-input-tab"}
          >
            チェック済みの企業から選ぶ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "new"}
            onClick={() => onModeChange("new")}
            className={mode === "new" ? "company-research-input-tab-active" : "company-research-input-tab"}
          >
            新規企業を入力
          </button>
        </div>

        {mode === "saved" ? (
          <label className="company-research-input-field">
            <span className="company-research-input-label">
              企業を選択 <span>必須</span>
            </span>
            <select
              aria-label="チェック済み企業"
              value={selectedJobId}
              onChange={(event) => onSelectedJobChange(event.target.value)}
              className="company-research-input-control"
            >
              <option value="">企業名を選択してください</option>
              {knownCheckedJobs.map((item) => (
                <option key={item.id} value={item.id}>{item.companyName}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="company-research-input-field" htmlFor="company-official-url">
          <span className="company-research-input-label">
            企業の公式サイトURL <span>必須</span>
          </span>
          <input
            id="company-official-url"
            aria-label="企業の公式サイトURL"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="https://example.co.jp"
            className="company-research-input-control"
          />
        </label>

        <p className="company-research-input-helper">求人チェッカーに登録している企業URLがある場合、自動で入力されます。</p>
      </section>

      <button
        type="button"
        disabled={!canStart || isSaving}
        onClick={onStartResearch}
        className="company-research-input-submit"
      >
        <Search className="size-6" aria-hidden="true" />
        {isSaving ? "企業研究を行っています" : "企業研究を開始する"}
      </button>

      {saveError ? <p className="company-research-input-error">{saveError}</p> : null}

      <p className="company-research-input-save-note">
        <Lock className="size-4" aria-hidden="true" />
        <span>研究結果は履歴として保存され、いつでも見返すことができます。</span>
      </p>
    </div>
  );
}

export function CompanyResearchMockExperience({
  displayName,
  profileInitial,
  planLabel,
  remainingResearchCount,
  initialJobId = "",
  checkedJobs,
  initialResearches,
  initialHasMoreResearches
}: CompanyResearchMockExperienceProps) {
  const latestResearch = initialResearches[0] ?? null;
  const initialCheckedJobCandidate = checkedJobs.find((job) => job.id === initialJobId) ?? checkedJobs[0] ?? null;
  const initialCheckedJob = hasKnownCompanyName(initialCheckedJobCandidate) ? initialCheckedJobCandidate : null;
  const [mode, setMode] = useState<"saved" | "new">(checkedJobs.length > 0 ? "saved" : "new");
  const [selectedJobId, setSelectedJobId] = useState(initialCheckedJob?.id ?? "");
  const [query, setQuery] = useState(initialCheckedJob?.websiteUrl ?? "");
  const [researchCount, setResearchCount] = useState(remainingResearchCount);
  const [savedResearches, setSavedResearches] = useState<Array<SavedCompanyResearch>>(initialResearches);
  const [activeResearchId, setActiveResearchId] = useState<string | null>(latestResearch?.id ?? null);
  const [currentResult, setCurrentResult] = useState<CompanyResearchResult | null>(latestResearch?.result ?? null);
  const [chatMessages, setChatMessages] = useState<CompanyResearchChatMessage[]>(latestResearch?.result.chatMessages ?? []);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [askError, setAskError] = useState<string | null>(null);
  const [isAsking, startAskingTransition] = useTransition();
  const [isHistoryRailOpen, setIsHistoryRailOpen] = useState(true);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(initialHasMoreResearches);
  const [historyCursor, setHistoryCursor] = useState<string | null>(initialResearches.at(-1)?.researchedAt ?? null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const canStart = query.trim().length > 0 && researchCount > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("restoreDemo") !== "1") return;

    const intent = readTopDemoIntent("company-research");
    const restoredCompanyUrl = intent?.payload.companyUrl?.trim();
    clearTopDemoIntent();

    if (!restoredCompanyUrl) return;
    setMode("new");
    setSelectedJobId("");
    setQuery(restoredCompanyUrl);
    setCurrentResult(null);
    setChatMessages([]);
    setActiveResearchId(null);
    setIsReportModalOpen(false);
    setSaveError(null);
    setAskError(null);
    setRestoreMessage("トップページで入力した企業URLを引き継ぎました。");
  }, []);

  const selectSavedResearch = (item: SavedCompanyResearch) => {
    setQuery(item.query);
    setCurrentResult(item.result);
    setChatMessages(item.result.chatMessages);
    setIsReportModalOpen(false);
    setActiveResearchId(item.id);
    setSaveError(null);
    setAskError(null);
  };

  const loadMoreHistory = () => {
    if (isLoadingMoreHistory || !hasMoreHistory || !historyCursor) return;

    setIsLoadingMoreHistory(true);
    startTransition(async () => {
      const response = await loadMoreCompanyResearchesAction({ cursor: historyCursor, limit: 8 });

      if (response.ok) {
        setSavedResearches((current) => {
          const knownIds = new Set(current.map((item) => item.id));
          const nextItems = response.items.filter((item) => !knownIds.has(item.id));
          return [...current, ...nextItems];
        });
        setHistoryCursor(response.nextCursor);
        setHasMoreHistory(response.hasMore);
      }

      setIsLoadingMoreHistory(false);
    });
  };

  const startNewResearch = () => {
    setMode("new");
    setSelectedJobId("");
    setQuery("");
    setCurrentResult(null);
    setChatMessages([]);
    setActiveResearchId(null);
    setIsReportModalOpen(false);
    setQuestionText("");
    setSaveError(null);
    setAskError(null);
  };

  const startResearch = () => {
    if (!canStart || isSaving) return;

    startTransition(async () => {
      const response = await saveCompanyResearchAction({ query: query.trim() });

      if (!response.ok) {
        setSaveError(response.message);
        return;
      }

      const nextResult = {
        companyName: response.savedResearch.companyName,
        industry: response.savedResearch.industry,
        location: response.savedResearch.location,
        size: response.savedResearch.size,
        summary: response.savedResearch.summary,
        keyPoints: response.savedResearch.keyPoints,
        interviewHints: response.savedResearch.interviewHints,
        nextActions: response.savedResearch.nextActions,
        report: response.savedResearch.report,
        chatMessages: response.savedResearch.chatMessages
      };

      setSaveError(null);
        setCurrentResult(nextResult);
      setChatMessages(nextResult.chatMessages);
      setIsReportModalOpen(false);
      setActiveResearchId(response.savedResearch.id);
      setResearchCount((current) => Math.max(0, current - 1));
      setSavedResearches((current) => [
        {
          id: response.savedResearch.id,
          companyName: response.savedResearch.companyName,
          researchedAt: response.savedResearch.createdAt.toISOString(),
          status: response.savedResearch.status,
          query: response.savedResearch.query,
          result: nextResult
        },
        ...current
      ]);
    });
  };

  const askFollowUpQuestion = () => {
    const question = questionText.trim();
    if (!activeResearchId || !question || isAsking) return;

    startAskingTransition(async () => {
      const response = await askCompanyResearchQuestionAction({ researchId: activeResearchId, question });
      if (!response.ok) {
        setAskError(response.message);
        return;
      }

      setAskError(null);
      setQuestionText("");
      setChatMessages((current) => [...current, ...response.messages]);
      setSavedResearches((current) =>
        current.map((item) =>
          item.id === activeResearchId
            ? { ...item, result: { ...item.result, chatMessages: [...item.result.chatMessages, ...response.messages] } }
            : item
        )
      );
    });
  };

  const result = currentResult;
  const isResultState = Boolean(result);
  const isProcessingState = !result && isSaving;
  const isInputState = !result && !isSaving;
  const canShowHistoryRail = !isProcessingState;
  const isHistoryRailVisible = canShowHistoryRail && isHistoryRailOpen;

  return (
    <section className="dashboard-frame dashboard-mock-frame">
      <div className="dashboard-mock-shell">
        <DashboardSidebar activeKey="company-research" note="" showMobileToggle variant="mock" />

        <div className="dashboard-mock-content-shell">
          <div
            className={`company-research-workspace ${
              isHistoryRailVisible ? "company-research-workspace-history-open" : "company-research-workspace-history-closed"
            }`}
          >
            <main className={`company-research-main-pane ${isInputState ? "company-research-main-pane-input" : ""} ${isInputState && isHistoryRailVisible ? "company-research-main-pane-input-history-open" : ""} ${isProcessingState ? "company-research-main-pane-processing" : ""}` }>
              {isInputState ? (
                <CompanyResearchInputPanel
                  mode={mode}
                  checkedJobs={checkedJobs}
                  selectedJobId={selectedJobId}
                  query={query}
                  canStart={canStart}
                  isSaving={isSaving}
                  saveError={saveError}
                  restoreMessage={restoreMessage}
                  onModeChange={(nextMode) => {
                    setMode(nextMode);
                    if (nextMode === "new") {
                      setSelectedJobId("");
                      setQuery("");
                    }
                  }}
                  onSelectedJobChange={(nextId) => {
                    const selected = checkedJobs.find((item) => item.id === nextId && hasKnownCompanyName(item));
                    setSelectedJobId(selected ? nextId : "");
                    setQuery(selected?.websiteUrl ?? "");
                  }}
                  onQueryChange={setQuery}
                  onStartResearch={startResearch}
                />
              ) : (
                <>
              <header className="dashboard-mock-topbar">
                <div>
                  <h1>企業研究</h1>
                  <p>{isProcessingState ? "GPTが公開情報を調査して、企業分析レポートを作成しています。" : "AIが企業の要点を整理して、志望動機や面接対策につなげます。"}</p>
                </div>
                <div className="dashboard-mock-topbar-actions">
                  <div className="rounded-full border border-[#dfe8d8] bg-white px-4 py-2 text-xs font-semibold text-[#228a43] shadow-[0_18px_38px_-34px_rgba(30,165,76,0.55)]">
                    {planLabel}
                  </div>
                  <button type="button" className="dashboard-mock-icon-button" aria-label="通知を見る">
                    <Bell className="size-[1.35rem]" />
                  </button>
                  <div className="dashboard-mock-user-chip">
                    <div className="dashboard-mock-user-avatar">
                      <span>{profileInitial}</span>
                    </div>
                    <span className="dashboard-mock-user-name">{displayName}</span>
                    <ChevronDown className="dashboard-mock-user-chevron" />
                  </div>
                </div>
              </header>

              {isProcessingState ? (
                <ResearchProcessingState query={query.trim()} />
              ) : result ? (
                <div className="company-research-result-layout">
                  <section className="company-research-result-chat" aria-label="企業研究レポートチャット">
                    <div className="research-chat-thread">
                      <ResearchChatMessage
                        message={{
                          id: "submitted-company-url",
                          role: "user",
                          content: `${result.companyName}について詳しく調べてください。`,
                          createdAt: result.report.generatedAt
                        }}
                      />
                      {chatMessages.map((message) => (
                        <ResearchChatMessage key={message.id} message={message} />
                      ))}
                      <ResearchReportPreviewCard report={result.report} onOpen={() => setIsReportModalOpen(true)} />
                    </div>

                    <div className="research-suggested-questions" aria-label="質問候補">
                      {result.report.suggestedQuestions.slice(0, 4).map((question) => (
                        <button key={question} type="button" onClick={() => setQuestionText(question)}>
                          {question}
                        </button>
                      ))}
                    </div>

                    <div className="research-followup-box">
                      <textarea
                        value={questionText}
                        onChange={(event) => setQuestionText(event.target.value)}
                        placeholder="企業について質問してみましょう  例: 最新のIR情報は？ 年収は？ など"
                        aria-label="企業について追加質問"
                      />
                      <button type="button" disabled={!questionText.trim() || isAsking} onClick={askFollowUpQuestion}>
                        {isAsking ? "回答中" : "質問する"}
                      </button>
                    </div>
                    {askError ? <p className="company-research-input-error">{askError}</p> : null}
                  </section>

                  <aside className="company-research-result-aside">
                    <section className="company-research-result-summary-card">
                      <p className="text-sm font-black text-[#182029]">面接で使える論点</p>
                      <div className="mt-4 space-y-3">
                        {result.interviewHints.map((hint) => (
                          <div key={hint} className="rounded-[18px] border border-[#eef1ea] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 text-[#506070]">
                            {hint}
                          </div>
                        ))}
                      </div>
                    </section>
                    <NextStepCard href={selectedJobId ? `/resume?jobId=${selectedJobId}` : "/resume"} />
                  </aside>

                  <ResearchReportModal report={result.report} open={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
                </div>
              ) : null}
                </>
              )}
            </main>

            {canShowHistoryRail ? (
            <div
              className={`company-research-history-shell ${
                isHistoryRailVisible ? "company-research-history-shell-open" : "company-research-history-shell-closed"
              }`}
            >
              <CompanyResearchHistoryRail
                items={savedResearches}
                activeId={activeResearchId}
                isLoadingMore={isLoadingMoreHistory}
                hasMore={hasMoreHistory}
                onSelect={selectSavedResearch}
                onNewResearch={startNewResearch}
                onLoadMore={loadMoreHistory}
                onToggleOpen={() => setIsHistoryRailOpen(false)}
              />
            </div>
            ) : null}

            {canShowHistoryRail && !isHistoryRailOpen ? (
              <button
                type="button"
                aria-label="企業研究の履歴を開く"
                aria-controls="company-research-history-rail"
                aria-expanded={isHistoryRailOpen}
                onClick={() => setIsHistoryRailOpen(true)}
                className="company-research-history-reopen-button"
              >
                <PanelRightOpen className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
