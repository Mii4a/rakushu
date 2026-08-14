"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronRight, Settings2 } from "lucide-react";

import { createAiInterviewSessionAction, type CreatedAiInterviewSession, resetAiInterviewCategoryAction } from "@/actions/ai-interview-session-actions";
import { confirmAiInterviewVoiceAnswerAction } from "@/actions/ai-interview-voice-actions";
import { AiInterviewFeedbackModal } from "@/components/ai-interview/ai-interview-feedback-modal";
import { AiInterviewRecordingPanel } from "@/components/ai-interview/ai-interview-recording-panel";
import { type InterviewRecordingState } from "@/components/ai-interview/ai-interview-recording-visualizer";
import {
  AiInterviewSessionHistorySidebar,
  type AiInterviewSessionHistoryItem
} from "@/components/ai-interview/ai-interview-session-history-sidebar";
import { AiInterviewSetupModal, type SavedSetupOption } from "@/components/ai-interview/ai-interview-setup-modal";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { type AiInterviewQuestion } from "@/lib/ai-interview/mock-data";
import type { SavedAiInterviewSessionSummary } from "@/lib/ai-interview/persistence";
import { buildAiInterviewScenarioQuestions } from "@/lib/ai-interview/scenario-questions";
import {
  getAiInterviewDisplayQuestionNumber,
  getAiInterviewProgressLabel,
  getAiInterviewProgressPercent,
  getAiInterviewResumeQuestionNumber,
  getAiInterviewSessionStatus
} from "@/lib/ai-interview/session-progress";
import {
  AI_INTERVIEW_INTERVIEW_TYPE_LABELS,
  AI_INTERVIEW_SCENARIO_LABELS,
  buildAiInterviewScenarioDefinition,
  DEFAULT_AI_INTERVIEW_SETUP_DRAFT,
  type AiInterviewSetupDraft
} from "@/lib/ai-interview/setup-scenarios";
import { AI_INTERVIEW_MAX_RECORDING_DURATION_MS } from "@/lib/ai-interview/voice-validation";
import { getSupportedAiInterviewMimeType } from "@/lib/ai-interview/voice/client-mime";
import { useAiInterviewAudioLevelMeter } from "@/lib/ai-interview/voice/use-audio-level-meter";
import { type RecordedAiInterviewAudio, useAiInterviewMediaRecorder } from "@/lib/ai-interview/voice/use-media-recorder";
import rakushuBotWave from "../../../UI-mock/dashboard/icons/rakushu-bot-wave.png";
import rakumoAnalyticsThumbsUp from "../../../UI-mock/dashboard/character/rakumo-analytics-thumbs-up.png";

type AiInterviewMockExperienceProps = {
  initialSavedSessions: SavedAiInterviewSessionSummary[];
  initialCurrentSessionId: string | null;
  initialQuestionId: string | null;
  initialFeedbackVisible: boolean;
};

type MockFeedbackAnswer = {
  id: string;
  questionId: string;
  prompt: string;
  answerText: string;
  score: number;
  strengths: string[];
  improvements: string[];
  followUps: string[];
};

type LocalSavedAttempt = SavedAiInterviewSessionSummary["answers"][number] & {
  sessionId: string;
};

const MOCK_FEEDBACK_ANSWERS: MockFeedbackAnswer[] = [
  {
    id: "mock-self-intro-1",
    questionId: "mock-self-intro-1",
    prompt: "自己紹介してください",
    answerText:
      "大学では情報工学を専攻し、ソフトウェア開発の基礎を学びました。特に、チームでの開発経験を通じて、課題解決力やコミュニケーション力を磨いてきました。",
    score: 4.3,
    strengths: ["結論から話せており、要点がわかりやすい", "具体的なエピソードを交えており、説得力がある"],
    improvements: ["成果や学びを、数字や行動でもう少し具体的に伝えると効果的です", "入社後にどう活かすかまで言及できると、より志望意欲が伝わります"],
    followUps: ["入社後に挑戦したいことは？", "チームでの役割を教えてください", "困難をどう乗り越えましたか？"]
  },
  {
    id: "mock-self-intro-2",
    questionId: "mock-self-intro-2",
    prompt: "これまでの経験の中で、今のあなたを形作った出来事を教えてください",
    answerText:
      "大学3年次のプロジェクトで、リーダーとしてメンバーの意見をまとめ、納期内に成果物を完成させた経験です。意見の対立があった中で、一人ひとりの強みを活かす役割分担を進めました。",
    score: 4.3,
    strengths: ["経験と強みのつながりが自然です", "周囲を巻き込む姿勢が伝わります"],
    improvements: ["当時の課題をもう一段具体的に補足すると印象が強まります", "成果を示す数字や変化があると再現性が見えやすくなります"],
    followUps: ["その経験から得た学びは？", "なぜその役割を担えたのですか？"]
  }
];

function formatDurationMs(value: number) {
  const seconds = Math.max(0, Math.floor(value / 1000));
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsPart = String(seconds % 60).padStart(2, "0");
  return `${minutesPart}:${secondsPart}`;
}

function SidebarFooter() {
  return (
    <>
      <div className="dashboard-sidebar-mock-promo dashboard-sidebar-mock-promo-cream">
        <div className="dashboard-sidebar-mock-speech">話すたびに、少しずつ伝わりやすくなるよ！</div>
        <div className="dashboard-sidebar-mock-promo-character">
          <Image src={rakumoAnalyticsThumbsUp} alt="応援するらくも" fill className="object-contain" sizes="140px" />
        </div>
      </div>

      <div className="dashboard-sidebar-mock-promo dashboard-sidebar-mock-promo-mint">
        <div className="dashboard-sidebar-mock-promo-stack">
          <p className="dashboard-sidebar-mock-promo-title">企業研究の要点を</p>
          <p className="dashboard-sidebar-mock-promo-title">面接回答に変えよう</p>
          <Link href="/company-research" className="dashboard-sidebar-mock-promo-link">
            研究メモを見る →
          </Link>
        </div>
        <div className="dashboard-sidebar-mock-mini-bot">
          <Image src={rakushuBotWave} alt="らくしゅうボット" fill className="object-contain" sizes="76px" />
        </div>
      </div>
    </>
  );
}

function getQuestionIndex(questions: AiInterviewQuestion[], questionId: string | null | undefined) {
  if (!questionId) return 0;
  const index = questions.findIndex((question) => question.id === questionId);
  return index >= 0 ? index : 0;
}

function getNextQuestionIndex(savedAnswerCount: number, questions: AiInterviewQuestion[]) {
  if (questions.length === 0) return 0;
  return Math.min(savedAnswerCount, questions.length - 1);
}

function getOrderedSessionAnswers(session: SavedAiInterviewSessionSummary | null) {
  return [...(session?.answers ?? [])].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

function getSessionAnswerIndex(session: SavedAiInterviewSessionSummary | null, answerId: string | null | undefined) {
  if (!session || !answerId) return null;
  const orderedAnswers = getOrderedSessionAnswers(session);
  const index = orderedAnswers.findIndex((answer) => answer.id === answerId);
  return index >= 0 ? index : null;
}

function getQuestionCategoryId(
  questions: Array<{ id: string; categoryId: string }>,
  questionId: string | null | undefined
) {
  if (!questionId) return null;
  return questions.find((question) => question.id === questionId)?.categoryId ?? null;
}

function getCategoryRangeById(
  categories: Array<{ id: string; questionCount: number }>,
  categoryId: string | null | undefined
) {
  let start = 0;

  for (const category of categories) {
    const end = start + category.questionCount;
    if (category.id === categoryId) {
      return { start, end };
    }
    start = end;
  }

  return null;
}

function getQuestionIntent(question: AiInterviewQuestion | undefined) {
  if (!question) return "回答の結論・具体例・学びが短時間で伝わるかを見ています。";

  const prompt = question.prompt;
  if (prompt.includes("自己紹介")) return "第一印象として、要点を短く整理して話せるかを見ています。";
  if (prompt.includes("強み") || prompt.includes("自己PR")) return "強みが再現性のある経験として語れているかを見ています。";
  if (prompt.includes("弱み")) return "弱みを率直に伝えつつ、改善行動まで話せるかを見ています。";
  if (prompt.includes("志望") || prompt.includes("会社")) return "企業理解と自分の価値観・経験がつながっているかを見ています。";
  if (prompt.includes("職種")) return "職種理解と、自分がその仕事で活きる理由を見ています。";
  if (prompt.includes("失敗")) return "失敗を隠さず、学びと再発防止まで言語化できるかを見ています。";
  if (prompt.includes("チーム")) return "周囲との協力の仕方と、自分の役割認識を見ています。";
  if (prompt.includes("プレッシャー")) return "負荷が高い場面でも整理して行動できるかを見ています。";
  if (prompt.includes("5年後") || prompt.includes("キャリア")) return "将来像が現実的で、今回の応募先とつながっているかを見ています。";
  if (prompt.includes("質問はありますか")) return "入社意欲と、働く解像度を高める視点があるかを見ています。";
  return "回答の結論・具体例・学びが短時間で伝わるかを見ています。";
}

function buildSavedSetupOptions(sessions: SavedAiInterviewSessionSummary[]): SavedSetupOption[] {
  const seen = new Set<string>();

  return sessions.flatMap((session) => {
    const key = [session.settingSetName, session.interviewType, session.targetCompany, session.targetRole, session.scenarioType].join("::");
    if (seen.has(key)) return [];
    seen.add(key);

    return [
      {
        id: session.id,
        label: session.settingSetName,
        interviewType: session.interviewType,
        interviewTypeLabel: AI_INTERVIEW_INTERVIEW_TYPE_LABELS[session.interviewType],
        scenarioType: session.scenarioType,
        scenarioLabel: AI_INTERVIEW_SCENARIO_LABELS[session.scenarioType],
        targetCompany: session.targetCompany,
        targetRole: session.targetRole
      }
    ];
  });
}

function buildSessionHistoryItem(session: SavedAiInterviewSessionSummary): AiInterviewSessionHistoryItem {
  const resumeQuestionNumber = getAiInterviewResumeQuestionNumber(session.savedAnswerCount, session.scenarioType);
  const status = getAiInterviewSessionStatus(session.savedAnswerCount, session.scenarioType);

  return {
    id: session.id,
    status: status as "in_progress" | "completed",
    settingSetName: `${session.settingSetName}（${AI_INTERVIEW_SCENARIO_LABELS[session.scenarioType]}）`,
    scenarioLabel: `${AI_INTERVIEW_SCENARIO_LABELS[session.scenarioType]}・${AI_INTERVIEW_INTERVIEW_TYPE_LABELS[session.interviewType]}`,
    questionProgressLabel: getAiInterviewProgressLabel(resumeQuestionNumber, session.scenarioType),
    durationLabel: `約${Math.max(4, session.savedAnswerCount * 2)}分`
  };
}

function createLocalSessionSummary(session: CreatedAiInterviewSession): SavedAiInterviewSessionSummary {
  return {
    ...session,
    answers: [],
    latestAnswer: null,
    savedAnswerCount: 0,
    averageScore: null,
    generatedQuestions: [],
    categoryFeedbacks: []
  };
}

function appendSavedAttemptToSession(session: SavedAiInterviewSessionSummary, savedAttempt: LocalSavedAttempt): SavedAiInterviewSessionSummary {
  const answers = [...session.answers.filter((answer) => answer.questionId !== savedAttempt.questionId), savedAttempt]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const averageScore = answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length : null;

  return {
    ...session,
    updatedAt: savedAttempt.createdAt,
    answers,
    latestAnswer: answers[0] ?? null,
    savedAnswerCount: answers.length,
    averageScore
  };
}

function appendGeneratedQuestionToSession(
  session: SavedAiInterviewSessionSummary,
  generatedQuestion: { questionId: string; categoryId: string; prompt: string }
): SavedAiInterviewSessionSummary {
  const questions = buildAiInterviewScenarioQuestions(session.scenarioType, {
    generatedPromptsByQuestionId: Object.fromEntries(session.generatedQuestions.map((item) => [item.questionId, item.prompt]))
  });
  const slot = questions.find((item) => item.id === generatedQuestion.questionId);
  if (!slot) return session;

  return {
    ...session,
    generatedQuestions: [
      ...session.generatedQuestions.filter((item) => item.questionId !== generatedQuestion.questionId),
      {
        id: `local-${generatedQuestion.questionId}`,
        categoryId: generatedQuestion.categoryId,
        questionId: generatedQuestion.questionId,
        questionNumber: slot.questionNumber,
        prompt: generatedQuestion.prompt,
        createdAt: new Date()
      }
    ].sort((left, right) => left.questionNumber - right.questionNumber)
  };
}

function appendCategoryFeedbackToSession(
  session: SavedAiInterviewSessionSummary,
  feedback: {
    categoryId: string;
    overallScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    nextFocus: string;
    nextQuestions: string[];
  }
): SavedAiInterviewSessionSummary {
  const scenarioDefinition = buildAiInterviewScenarioDefinition(session.scenarioType);
  let startQuestionNumber = 1;

  for (const category of scenarioDefinition.categories) {
    const endQuestionNumber = startQuestionNumber + category.questionCount - 1;
    if (category.id === feedback.categoryId) {
      return {
        ...session,
        categoryFeedbacks: [
          ...session.categoryFeedbacks.filter((item) => item.categoryId !== feedback.categoryId),
          {
            id: `local-feedback-${feedback.categoryId}`,
            categoryId: feedback.categoryId,
            startQuestionNumber,
            endQuestionNumber,
            overallScore: feedback.overallScore,
            summary: feedback.summary,
            strengths: feedback.strengths,
            improvements: feedback.improvements,
            nextFocus: feedback.nextFocus,
            nextQuestions: feedback.nextQuestions,
            createdAt: new Date()
          }
        ].sort((left, right) => left.startQuestionNumber - right.startQuestionNumber)
      };
    }
    startQuestionNumber = endQuestionNumber + 1;
  }

  return session;
}

export function AiInterviewMockExperience({
  initialSavedSessions,
  initialCurrentSessionId,
  initialQuestionId,
  initialFeedbackVisible
}: AiInterviewMockExperienceProps) {
  const initialSession = initialSavedSessions.find((session) => session.id === initialCurrentSessionId) ?? null;
  const initialScenarioType = initialSession?.scenarioType ?? DEFAULT_AI_INTERVIEW_SETUP_DRAFT.scenarioType;
  const initialQuestions = buildAiInterviewScenarioQuestions(initialScenarioType, {
    generatedPromptsByQuestionId: Object.fromEntries((initialSession?.generatedQuestions ?? []).map((item) => [item.questionId, item.prompt]))
  });
  const initialQuestionIndex = Math.max(0, getQuestionIndex(initialQuestions, initialQuestionId));
  const [supportedVoiceMimeType, setSupportedVoiceMimeType] = useState<string | null>(null);
  const mediaRecorder = useAiInterviewMediaRecorder(supportedVoiceMimeType);
  const audioLevel = useAiInterviewAudioLevelMeter(mediaRecorder.streamRef.current);

  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [currentSessionId, setCurrentSessionId] = useState(initialCurrentSessionId);
  const [selectedSessionId, setSelectedSessionId] = useState(initialCurrentSessionId);
  const [recordingState, setRecordingState] = useState<InterviewRecordingState>("idle");
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [transcriptFinalText, setTranscriptFinalText] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(initialFeedbackVisible);
  const [feedbackCategoryId, setFeedbackCategoryId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<Array<SavedAiInterviewSessionSummary>>(initialSavedSessions);
  const [reviewedAnswerId, setReviewedAnswerId] = useState(initialSavedSessions[0]?.latestAnswer?.id ?? null);
  const [setupModalOpen, setSetupModalOpen] = useState(true);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [setupDraft, setSetupDraft] = useState<AiInterviewSetupDraft>(DEFAULT_AI_INTERVIEW_SETUP_DRAFT);
  const [setupSubmitting, startSetupSubmitting] = useTransition();
  const [savingAnswer, startSavingAnswer] = useTransition();
  const [resettingCategory, startResettingCategory] = useTransition();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const handledRecordedAudioRef = useRef<Blob | null>(null);
  const startTranscriptionRef = useRef<((recordedAudio: RecordedAiInterviewAudio) => Promise<void>) | null>(null);

  useEffect(() => {
    setSupportedVoiceMimeType(getSupportedAiInterviewMimeType());
  }, []);

  useEffect(() => {
    if (mediaRecorder.error) {
      setVoiceError(mediaRecorder.error);
    }
  }, [mediaRecorder.error]);

  const currentSession = useMemo(
    () => savedSessions.find((session) => session.id === currentSessionId) ?? null,
    [currentSessionId, savedSessions]
  );
  const selectedSession = useMemo(
    () => savedSessions.find((session) => session.id === selectedSessionId) ?? null,
    [savedSessions, selectedSessionId]
  );
  const activeSessionMeta = selectedSession ?? currentSession;
  const setupSummary = {
    settingSetName: activeSessionMeta?.settingSetName ?? setupDraft.settingSetName,
    interviewType: activeSessionMeta?.interviewType ?? setupDraft.interviewType,
    targetCompany: activeSessionMeta?.targetCompany ?? setupDraft.targetCompany,
    targetRole: activeSessionMeta?.targetRole ?? setupDraft.targetRole,
    scenarioType: activeSessionMeta?.scenarioType ?? setupDraft.scenarioType
  };
  const savedSetupOptions = useMemo(() => buildSavedSetupOptions(savedSessions), [savedSessions]);
  const visibleSessionGeneratedPrompts = useMemo(
    () => Object.fromEntries((activeSessionMeta?.generatedQuestions ?? []).map((item) => [item.questionId, item.prompt])),
    [activeSessionMeta]
  );
  const questions = useMemo(
    () => buildAiInterviewScenarioQuestions(setupSummary.scenarioType, { generatedPromptsByQuestionId: visibleSessionGeneratedPrompts }),
    [setupSummary.scenarioType, visibleSessionGeneratedPrompts]
  );
  const scenarioDefinition = useMemo(() => buildAiInterviewScenarioDefinition(setupSummary.scenarioType), [setupSummary.scenarioType]);
  const isReviewingPastSession = Boolean(selectedSession && currentSessionId && selectedSession.id !== currentSessionId);
  const visibleSession = selectedSession ?? currentSession;
  const visibleSessionAnswerIndex = getSessionAnswerIndex(visibleSession, reviewedAnswerId ?? visibleSession?.latestAnswer?.id);
  const reviewedAnswer = useMemo(() => {
    if (!visibleSession) return null;
    return visibleSession.answers.find((answer) => answer.id === reviewedAnswerId) ?? visibleSession.latestAnswer;
  }, [reviewedAnswerId, visibleSession]);
  const feedbackAttempt = visibleSession
    ? visibleSession.id === currentSessionId
      ? feedbackVisible
        ? reviewedAnswer
        : null
      : reviewedAnswer
    : null;
  const displayQuestionIndex = isReviewingPastSession
    ? Math.min(Math.max(visibleSessionAnswerIndex ?? 0, 0), Math.max(questions.length - 1, 0))
    : questionIndex;
  const currentQuestion = questions[displayQuestionIndex] ?? questions[0];
  const displayQuestionPrompt = isReviewingPastSession ? reviewedAnswer?.prompt ?? currentQuestion?.prompt : currentQuestion?.prompt;
  const currentQuestionIntent = getQuestionIntent(displayQuestionPrompt ? { id: currentQuestion?.id ?? "review", prompt: displayQuestionPrompt, answerDraft: "", score: 0, strengths: [], improvements: [], followUps: [] } : currentQuestion);
  const displayQuestionNumber = getAiInterviewDisplayQuestionNumber(displayQuestionIndex, setupSummary.scenarioType);
  const progressPercent = useMemo(
    () => getAiInterviewProgressPercent(displayQuestionNumber, setupSummary.scenarioType),
    [displayQuestionNumber, setupSummary.scenarioType]
  );
  const sessionHistoryItems = useMemo(
    () => savedSessions.map((session) => buildSessionHistoryItem(session)),
    [savedSessions]
  );
  const currentCategoryIndex = useMemo(() => {
    let cumulative = 0;
    for (let index = 0; index < scenarioDefinition.categories.length; index += 1) {
      cumulative += scenarioDefinition.categories[index]!.questionCount;
      if (displayQuestionIndex < cumulative) {
        return index;
      }
    }
    return Math.max(0, scenarioDefinition.categories.length - 1);
  }, [displayQuestionIndex, scenarioDefinition.categories]);
  const currentCategory = scenarioDefinition.categories[currentCategoryIndex] ?? null;
  const currentCategoryRange = useMemo(() => {
    let start = 0;
    for (let index = 0; index < currentCategoryIndex; index += 1) {
      start += scenarioDefinition.categories[index]!.questionCount;
    }
    const total = scenarioDefinition.categories[currentCategoryIndex]?.questionCount ?? 0;
    return { start, end: start + total };
  }, [currentCategoryIndex, scenarioDefinition.categories]);
  const feedbackCategoryRange = useMemo(
    () => getCategoryRangeById(scenarioDefinition.categories, feedbackCategoryId),
    [feedbackCategoryId, scenarioDefinition.categories]
  );
  const currentCategoryAnswers = useMemo(() => {
    return getOrderedSessionAnswers(visibleSession).filter((_, index) => index >= currentCategoryRange.start && index < currentCategoryRange.end);
  }, [currentCategoryRange.end, currentCategoryRange.start, visibleSession]);
  const feedbackCategory = useMemo(
    () => scenarioDefinition.categories.find((item) => item.id === feedbackCategoryId) ?? null,
    [feedbackCategoryId, scenarioDefinition.categories]
  );
  const feedbackCategoryAnswers = useMemo(() => {
    if (!feedbackCategoryRange) return [];
    return getOrderedSessionAnswers(visibleSession).filter((_, index) => index >= feedbackCategoryRange.start && index < feedbackCategoryRange.end);
  }, [feedbackCategoryRange, visibleSession]);
  const completedCategoryIds = useMemo(() => {
    const completed = new Set<string>();
    const orderedAnswers = getOrderedSessionAnswers(visibleSession);
    let start = 0;

    for (const category of scenarioDefinition.categories) {
      const end = start + category.questionCount;
      const completedCount = orderedAnswers.filter((_, index) => index >= start && index < end).length;

      if (completedCount >= category.questionCount) {
        completed.add(category.id);
      }

      start = end;
    }

    return completed;
  }, [scenarioDefinition.categories, visibleSession]);
  const isCurrentCategoryComplete = currentCategory ? currentCategoryAnswers.length >= currentCategory.questionCount : false;
  const isUsingMockFeedback = !isReviewingPastSession && !visibleSession && !isCurrentCategoryComplete;
  const feedbackModalCategory = feedbackCategory ?? currentCategory;
  const feedbackModalCategoryFeedback = visibleSession?.categoryFeedbacks.find((item) => item.categoryId === feedbackModalCategory?.id) ?? null;
  const feedbackModalAnswers = isUsingMockFeedback ? [...MOCK_FEEDBACK_ANSWERS] : feedbackCategory ? feedbackCategoryAnswers : currentCategoryAnswers;
  const feedbackModalCategoryLabel = isUsingMockFeedback ? "自己紹介" : feedbackModalCategory?.label ?? "カテゴリ";
  const feedbackModalCompletedCount = isUsingMockFeedback ? 2 : feedbackCategory ? feedbackCategoryAnswers.length : currentCategoryAnswers.length;
  const feedbackModalTotalCount = isUsingMockFeedback ? 2 : feedbackModalCategory?.questionCount ?? feedbackModalAnswers.length;
  const feedbackModalOpen = Boolean(feedbackVisible && (feedbackAttempt || recordingState === "complete" || isReviewingPastSession || isCurrentCategoryComplete));
  const canReopenCategoryFeedback = Boolean(recordingState === "complete" && feedbackModalCategoryFeedback);
  const displayedElapsedSeconds = mediaRecorder.isRecording ? Math.floor(mediaRecorder.elapsedMs / 1000) : recordingElapsedSeconds;
  const displayedElapsedLabel = formatDurationMs(displayedElapsedSeconds * 1000);
  const maxRecordingElapsedLabel = formatDurationMs(AI_INTERVIEW_MAX_RECORDING_DURATION_MS);

  const resetRecordingUi = useCallback(({ clearError = true }: { clearError?: boolean } = {}) => {
    setRecordingElapsedSeconds(0);
    setRecordingState("idle");
    setTranscriptFinalText("");
    if (clearError) {
      setVoiceError(null);
    }
    mediaRecorder.reset();
  }, [mediaRecorder]);

  const showTranscriptionRetryError = useCallback((message?: string | null) => {
    setStatusMessage(null);
    resetRecordingUi({ clearError: false });
    setVoiceError(message ?? "うまく文字起こしできませんでした。もう一度録音してください。");
  }, [resetRecordingUi]);

  const applySavedAnswerResponse = (
    response: Awaited<ReturnType<typeof confirmAiInterviewVoiceAnswerAction>>
  ) => {
    if (!response.ok) {
      setStatusMessage(null);
      setVoiceError(response.message);
      setRecordingState("idle");
      return;
    }

    setSavedSessions((current) => {
      const targetSession = current.find((session) => session.id === response.savedAttempt.sessionId);

      if (!targetSession) {
        return current;
      }

      let nextSession = appendSavedAttemptToSession(targetSession, response.savedAttempt);
      if (response.nextQuestion) {
        nextSession = appendGeneratedQuestionToSession(nextSession, response.nextQuestion);
      }
      if (response.completedCategoryFeedback) {
        nextSession = appendCategoryFeedbackToSession(nextSession, response.completedCategoryFeedback);
      }

      return current
        .map((session) => (session.id === targetSession.id ? nextSession : session))
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    });

    setCurrentSessionId(response.savedAttempt.sessionId);
    setSelectedSessionId(response.savedAttempt.sessionId);
    setReviewedAnswerId(response.savedAttempt.id);
    setRecordingState("complete");
    setFeedbackCategoryId(response.completedCategoryFeedback?.categoryId ?? null);
    setFeedbackVisible(Boolean(response.completedCategoryFeedback));
    if (response.nextQuestion) {
      const nextQuestions = buildAiInterviewScenarioQuestions(setupSummary.scenarioType, {
        generatedPromptsByQuestionId: {
          ...visibleSessionGeneratedPrompts,
          [response.nextQuestion.questionId]: response.nextQuestion.prompt
        }
      });
      setQuestionIndex(Math.max(0, getQuestionIndex(nextQuestions, response.nextQuestion.questionId)));
    } else {
      setQuestionIndex(getNextQuestionIndex((currentSession?.savedAnswerCount ?? 0) + 1, questions));
    }
    setStatusMessage(response.completedCategoryFeedback ? "カテゴリ評価を保存しました。" : "AI評価を保存しました。");
  };

  const pollForTranscript = async (recordingSessionId: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await fetch(`/api/ai-interview/voice/${recordingSessionId}`, {
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        status: string;
        lastErrorSummary?: string | null;
        transcript?: {
          text?: string | null;
          normalizedText?: string | null;
        } | null;
      } | null;

      if (!response.ok) {
        return { ok: false as const, message: payload?.error ?? "録音ステータスの取得に失敗しました" };
      }

      if (!payload) {
        return { ok: false as const, message: "文字起こし結果の取得に失敗しました" };
      }

      if (payload.status === "failed" || payload.status === "expired") {
        return {
          ok: false as const,
          message: payload.lastErrorSummary ?? (payload.status === "expired" ? "文字起こしの待機時間が切れました。もう一度録音してください。" : "文字起こしに失敗しました")
        };
      }

      const transcriptText = payload.transcript?.normalizedText?.trim() || payload.transcript?.text?.trim() || "";
      if (transcriptText) {
        return { ok: true as const, transcriptText };
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }

    return { ok: false as const, message: "文字起こしの完了待ちがタイムアウトしました。もう一度録音してください。" };
  };

  const startTranscription = async (recordedAudio: RecordedAiInterviewAudio) => {
    if (!currentQuestion) {
      setVoiceError("質問データが見つかりませんでした");
      setRecordingState("idle");
      return;
    }

    setRecordingState("transcribing");
    setTranscriptFinalText("");

    const formData = new FormData();
    formData.set(
      "audio",
      new File([recordedAudio.blob], `answer.${recordedAudio.mimeType.includes("ogg") ? "ogg" : recordedAudio.mimeType.includes("mp4") ? "m4a" : "webm"}`,
      {
        type: recordedAudio.mimeType
      })
    );
    formData.set("questionId", currentQuestion.id);
    if (currentSessionId) {
      formData.set("sessionId", currentSessionId);
    }
    formData.set("mimeType", recordedAudio.mimeType);
    formData.set("durationMs", String(recordedAudio.durationMs));
    formData.set("byteSize", String(recordedAudio.blob.size));
    formData.set("consentAccepted", "true");

    try {
      const uploadResponse = await fetch("/api/ai-interview/voice/start", {
        method: "POST",
        body: formData
      });
      const uploadPayload = (await uploadResponse.json().catch(() => null)) as { recordingSessionId?: string; error?: string } | null;

      if (!uploadResponse.ok || !uploadPayload?.recordingSessionId) {
        showTranscriptionRetryError(uploadPayload?.error ?? "音声の送信に失敗しました。もう一度録音してください。");
        return;
      }

      const recordingSessionId = uploadPayload.recordingSessionId;
      if (!recordingSessionId) {
        showTranscriptionRetryError("録音セッションの作成に失敗しました。もう一度録音してください。");
        return;
      }
      const polled = await pollForTranscript(recordingSessionId);
      if (!polled.ok) {
        showTranscriptionRetryError(polled.message);
        return;
      }

      const transcriptText = polled.transcriptText.trim();
      if (!transcriptText) {
        showTranscriptionRetryError("文字起こし結果が空でした。もう一度録音してください。");
        return;
      }

      setTranscriptFinalText(transcriptText);
      setRecordingState("evaluating");

      startSavingAnswer(async () => {
        const response = await confirmAiInterviewVoiceAnswerAction({
          currentSessionId: currentSessionId ?? undefined,
          recordingSessionId,
          confirmedText: transcriptText
        });
        applySavedAnswerResponse(response);
      });
    } catch (error) {
      showTranscriptionRetryError(error instanceof Error ? error.message : undefined);
    }
  };

  startTranscriptionRef.current = startTranscription;

  useEffect(() => {
    if (recordingState !== "recording" || mediaRecorder.isRecording || !mediaRecorder.recordedAudio) {
      handledRecordedAudioRef.current = null;
      return;
    }

    const recordedAudio = mediaRecorder.recordedAudio;
    if (handledRecordedAudioRef.current === recordedAudio.blob) {
      return;
    }

    handledRecordedAudioRef.current = recordedAudio.blob;
    setRecordingElapsedSeconds(Math.max(1, Math.floor(recordedAudio.durationMs / 1000)));

    if (mediaRecorder.lastStopReason === "max_duration") {
      setStatusMessage(`${maxRecordingElapsedLabel} に達したため、録音を終了して自動で文字起こしを開始します。`);
    }

    void startTranscriptionRef.current?.(recordedAudio);
  }, [maxRecordingElapsedLabel, mediaRecorder.isRecording, mediaRecorder.lastStopReason, mediaRecorder.recordedAudio, recordingState]);

  const startRecording = async () => {
    if (isReviewingPastSession || savingAnswer || resettingCategory || setupSubmitting) return;

    setVoiceError(null);
    setFeedbackVisible(false);
    setFeedbackCategoryId(null);
    setTranscriptFinalText("");
    setRecordingElapsedSeconds(0);
    setStatusMessage(null);

    if (!supportedVoiceMimeType) {
      setVoiceError("このブラウザでは音声録音に対応していません");
      return;
    }

    const stream = await mediaRecorder.start();
    if (!stream) return;
    setRecordingState("recording");
  };

  const stopRecording = async () => {
    if (isReviewingPastSession) return;

    const stoppedAudio = mediaRecorder.isRecording ? await mediaRecorder.stop("manual") : mediaRecorder.recordedAudio;
    if (!stoppedAudio) {
      showTranscriptionRetryError();
    }
  };

  const handleRecorderClick = () => {
    if (recordingState === "recording") {
      void stopRecording();
      return;
    }

    if (recordingState === "idle") {
      void startRecording();
    }
  };

  const selectSession = (sessionId: string) => {
    const nextSession = savedSessions.find((session) => session.id === sessionId);
    if (!nextSession) return;

    setSelectedSessionId(sessionId);
    setReviewedAnswerId(nextSession.latestAnswer?.id ?? null);
    setSetupDraft((current) => ({
      ...current,
      settingSetName: nextSession.settingSetName,
      interviewType: nextSession.interviewType,
      targetCompany: nextSession.targetCompany,
      targetRole: nextSession.targetRole,
      scenarioType: nextSession.scenarioType
    }));
    resetRecordingUi();

    if (sessionId === currentSessionId) {
      setQuestionIndex(getNextQuestionIndex(nextSession.savedAnswerCount, questions));
      setFeedbackVisible(false);
      setFeedbackCategoryId(null);
      return;
    }

    setFeedbackCategoryId(getQuestionCategoryId(questions, nextSession.latestAnswer?.questionId ?? null));
    setFeedbackVisible(true);
  };

  const handleSelectAnswer = (answerId: string) => {
    setReviewedAnswerId(answerId);
    const answer = visibleSession?.answers.find((item) => item.id === answerId) ?? null;
    setFeedbackCategoryId(getQuestionCategoryId(questions, answer?.questionId ?? null));
    setFeedbackVisible(true);
  };

  const handleOpenFeedback = () => {
    setFeedbackCategoryId((current) => current ?? currentCategory?.id ?? null);
    setFeedbackVisible(true);
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;

    setFeedbackVisible(false);
    setFeedbackCategoryId(null);
    setReviewedAnswerId(null);
    resetRecordingUi();
  };

  const handleReturnToCurrentSession = () => {
    if (!currentSessionId) return;
    selectSession(currentSessionId);
  };

  const handleSubmitSetup = () => {
    startSetupSubmitting(async () => {
      setVoiceError(null);
      setStatusMessage(null);

      const response = await createAiInterviewSessionAction({
        settingSetName: setupDraft.settingSetName,
        interviewType: setupDraft.interviewType,
        targetCompany: setupDraft.targetCompany,
        targetRole: setupDraft.targetRole,
        scenarioType: setupDraft.scenarioType
      });

      if (!response.ok) {
        setVoiceError(response.message);
        return;
      }

      const sessionSummary = createLocalSessionSummary(response.session);
      setSavedSessions((current) => [sessionSummary, ...current.filter((session) => session.id !== sessionSummary.id)].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()));
      setCurrentSessionId(sessionSummary.id);
      setSelectedSessionId(sessionSummary.id);
      setReviewedAnswerId(null);
      setQuestionIndex(0);
      setFeedbackVisible(false);
      setFeedbackCategoryId(null);
      setSetupModalOpen(false);
      setSetupStep(1);
      resetRecordingUi();
      setStatusMessage("新しい面接セッションを作成しました。");
    });
  };

  const handleOpenSetupModal = () => {
    setSetupStep(1);
    setSetupModalOpen(true);
  };

  const handleResetCategory = () => {
    if (!currentSession || !currentCategory || currentCategoryAnswers.length === 0) return;

    startResettingCategory(async () => {
      const response = await resetAiInterviewCategoryAction({
        sessionId: currentSession.id,
        categoryId: currentCategory.id,
        questionIds: currentCategoryAnswers.map((answer) => answer.questionId)
      });

      if (!response.ok) {
        setVoiceError(response.message);
        return;
      }

      setSavedSessions((current) =>
        current
          .map((session) => {
            if (session.id !== currentSession.id) return session;
            const remainingAnswers = session.answers.filter(
              (answer) => !currentCategoryAnswers.some((target) => target.questionId === answer.questionId)
            );
            const sortedAnswers = [...remainingAnswers].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
            const averageScore = sortedAnswers.length > 0 ? sortedAnswers.reduce((sum, answer) => sum + answer.score, 0) / sortedAnswers.length : null;
            return {
              ...session,
              updatedAt: new Date(),
              answers: sortedAnswers,
              latestAnswer: sortedAnswers[0] ?? null,
              savedAnswerCount: sortedAnswers.length,
              averageScore,
              generatedQuestions: session.generatedQuestions.filter((item) => item.categoryId !== currentCategory.id),
              categoryFeedbacks: session.categoryFeedbacks.filter((item) => item.categoryId !== currentCategory.id)
            };
          })
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      );

      setSelectedSessionId(currentSession.id);
      setReviewedAnswerId(null);
      setQuestionIndex(currentCategoryRange.start);
      setFeedbackVisible(false);
      setFeedbackCategoryId(null);
      setResetConfirmOpen(false);
      resetRecordingUi();
      setStatusMessage(`${currentCategory.label} の回答とAI評価をリセットしました。`);
    });
  };

  return (
    <section className="dashboard-frame dashboard-mock-frame">
      <div className="dashboard-mock-shell">
        <DashboardSidebar activeKey="ai-interview" note="" footerContent={<SidebarFooter />} showMobileToggle={false} variant="mock" />

        <div className="dashboard-mock-content-shell">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-0">
              <div className="min-h-0 space-y-5">
                <article className="flex h-full min-h-0 flex-col overflow-y-auto rounded-[30px] border border-[#e5ebdf] bg-white p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.16)] lg:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-[240px] flex-1">
                      <div className="flex items-center gap-4">
                        <p className="text-[1.05rem] font-black text-[#1a1f25]">{isReviewingPastSession ? `見返し中: ${getAiInterviewProgressLabel(displayQuestionNumber, setupSummary.scenarioType)}` : getAiInterviewProgressLabel(displayQuestionNumber, setupSummary.scenarioType)}</p>
                        <div className="h-2.5 flex-1 rounded-full bg-[#edf1ea]">
                          <div className="h-2.5 rounded-full bg-[#24a148] transition-all" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isReviewingPastSession ? (
                        <button
                          type="button"
                          onClick={handleReturnToCurrentSession}
                          className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[#b9e2c6] bg-[#f3fcf5] px-4 text-sm font-bold text-[#21964a]"
                        >
                          最新の練習に戻る
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 flex items-start gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#bfe1c9] bg-[#f3fcf5] text-lg font-black text-[#1fa148] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.18)]">
                      Q
                    </div>
                    <div className="flex-1 rounded-[22px] bg-[#f4f6f4] px-5 py-4 text-[1.02rem] font-medium leading-7 text-[#20252c]">
                      {displayQuestionPrompt}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-[#d9ece0] bg-[#fbfefc] px-5 py-4">
                    <p className="text-sm font-black text-[#21a148]">面接官の意図</p>
                    <p className="mt-2 text-sm leading-7 text-[#334150]">{currentQuestionIntent}</p>
                  </div>

                  <AiInterviewRecordingPanel
                    state={isReviewingPastSession ? "complete" : recordingState}
                    elapsedLabel={displayedElapsedLabel}
                    finalTranscript={transcriptFinalText}
                    audioLevel={audioLevel}
                    errorMessage={voiceError}
                    isReviewingPastSession={isReviewingPastSession}
                    reviewedAnswerText={reviewedAnswer?.answerText}
                    onRecorderClick={handleRecorderClick}
                    onOpenFeedback={handleOpenFeedback}
                    showCompleteFeedbackAction={canReopenCategoryFeedback}
                    footerSlot={
                      isReviewingPastSession ? (
                        <button
                          type="button"
                          onClick={handleReturnToCurrentSession}
                          className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-[#1fa148] px-6 text-sm font-bold text-white shadow-[0_22px_44px_-30px_rgba(31,161,72,0.56)]"
                        >
                          続きの練習に戻る
                          <ChevronRight className="size-4" />
                        </button>
                      ) : recordingState === "complete" ? (
                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="inline-flex h-12 items-center gap-2 rounded-[16px] border border-[#dbe4db] bg-white px-6 text-sm font-bold text-[#1f2832]"
                        >
                          次の質問へ進む
                          <ChevronRight className="size-4" />
                        </button>
                      ) : null
                    }
                  />

                  {!voiceError && statusMessage ? <p className="mt-3 text-sm font-medium text-[#1f9b44]">{statusMessage}</p> : null}
                  {voiceError?.includes("料金ページ") ? (
                    <div className="mt-3">
                      <Link
                        href="/pricing"
                        className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[#f0d4d4] bg-[#fff7f7] px-4 text-sm font-bold text-[#b44a4a]"
                      >
                        料金ページを見る
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  ) : null}

                  <section className="mt-6 rounded-[24px] border border-[#e5ebdf] bg-[#fcfcfb] p-4 lg:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-[#1a1f25]">面接シナリオの概要</p>
                        <p className="mt-1 text-sm text-[#66707c]">現在のカテゴリを緑で強調しています。</p>
                      </div>
                      <div className="rounded-full bg-[#f3fcf5] px-3 py-1 text-xs font-black text-[#1f9b44]">
                        {currentCategoryIndex + 1} / {scenarioDefinition.categories.length} カテゴリ
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
                      {scenarioDefinition.categories.map((category, index) => {
                        const active = index === currentCategoryIndex;
                        const completed = completedCategoryIds.has(category.id);
                        return (
                          <div key={category.id} className="flex items-center gap-2 md:gap-3">
                            <div
                              className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-bold md:px-4 md:py-3 md:text-sm ${
                                active
                                  ? "border-[#b9e2c6] bg-[#f3fcf5] text-[#1f9b44] shadow-[0_16px_32px_-28px_rgba(31,161,72,0.3)]"
                                  : completed
                                    ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb] shadow-[0_16px_32px_-28px_rgba(37,99,235,0.24)]"
                                    : "border-[#e1e8df] bg-white text-[#52606d]"
                              }`}
                            >
                              {category.label}
                            </div>
                            {index < scenarioDefinition.categories.length - 1 ? (
                              <span className="inline-flex size-6 items-center justify-center text-[#8fa0b3] md:size-7">
                                <ChevronRight className="size-3.5 stroke-[2.4] md:size-4" />
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="mt-4 rounded-[24px] border border-[#e5ebdf] bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.12)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#1a1f25]">現在の設定サマリー</p>
                        <p className="mt-1 text-xs text-[#778390]">設定変更ボタンからいつでも見直せます。</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full bg-[#f3fcf5] px-3 py-1 text-xs font-black text-[#1f9b44]">約{scenarioDefinition.totalDurationMinutes}分</div>
                        <button
                          type="button"
                          onClick={handleOpenSetupModal}
                          className="inline-flex items-center gap-2 rounded-[16px] border border-[#b9e2c6] bg-[#f3fcf5] px-4 py-2.5 text-sm font-bold text-[#1a1f25]"
                        >
                          <Settings2 className="size-4" />
                          設定を変更
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_140px]">
                      <div className="rounded-[18px] border border-[#edf1ea] bg-[#fcfdfb] px-3 py-3">
                        <p className="text-[11px] font-bold text-[#778390]">設定セット名</p>
                        <p className="mt-1.5 text-sm font-black text-[#18202a]">{setupSummary.settingSetName}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#edf1ea] bg-[#fcfdfb] px-3 py-3">
                        <p className="text-[11px] font-bold text-[#778390]">面接の種類</p>
                        <p className="mt-1.5 text-sm font-black text-[#18202a]">{AI_INTERVIEW_INTERVIEW_TYPE_LABELS[setupSummary.interviewType]}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#edf1ea] bg-[#fcfdfb] px-3 py-3">
                        <p className="text-[11px] font-bold text-[#778390]">想定企業</p>
                        <p className="mt-1.5 text-sm font-black text-[#18202a]">{setupSummary.targetCompany}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#edf1ea] bg-[#fcfdfb] px-3 py-3">
                        <p className="text-[11px] font-bold text-[#778390]">想定職種</p>
                        <p className="mt-1.5 text-sm font-black text-[#18202a]">{setupSummary.targetRole}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#edf1ea] bg-[#fcfdfb] px-3 py-3">
                        <p className="text-[11px] font-bold text-[#778390]">面接シナリオ</p>
                        <p className="mt-1.5 text-sm font-black text-[#18202a]">{AI_INTERVIEW_SCENARIO_LABELS[setupSummary.scenarioType]}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#edf1ea] bg-[#fcfdfb] px-3 py-3 xl:text-right">
                        <p className="text-[11px] font-bold text-[#778390]">想定時間</p>
                        <p className="mt-1.5 text-sm font-black text-[#18202a]">約{scenarioDefinition.totalDurationMinutes}分</p>
                      </div>
                    </div>
                  </section>
                </article>
              </div>

              <AiInterviewSessionHistorySidebar
                sessions={sessionHistoryItems}
                selectedSessionId={visibleSession?.id ?? null}
                onSelectSession={selectSession}
                onCreateSession={handleOpenSetupModal}
              />
            </section>
          </div>
        </div>
      </div>

      <AiInterviewFeedbackModal
        open={feedbackModalOpen}
        categoryLabel={feedbackModalCategoryLabel}
        completedCount={feedbackModalCompletedCount}
        totalCount={feedbackModalTotalCount}
        answers={feedbackModalAnswers}
        categoryFeedback={isUsingMockFeedback ? null : feedbackModalCategoryFeedback}
        activeAnswerId={reviewedAnswerId ?? feedbackModalAnswers[0]?.id ?? null}
        canReset={Boolean(currentSession && !isReviewingPastSession && feedbackModalAnswers.length > 0)}
        resetting={resettingCategory}
        onSelectAnswer={handleSelectAnswer}
        onClose={() => setFeedbackVisible(false)}
        onReset={() => setResetConfirmOpen(true)}
        onNext={handleNextQuestion}
      />

      {resetConfirmOpen && currentCategory ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,23,42,0.42)] px-4">
          <div className="w-full max-w-[520px] rounded-[28px] border border-[#f3d2d2] bg-white p-6 shadow-[0_36px_120px_-50px_rgba(15,23,42,0.38)] sm:p-7">
            <p className="text-[1.45rem] font-black tracking-[-0.02em] text-[#18202a]">本当にやり直しますか？</p>
            <p className="mt-3 text-sm leading-7 text-[#5d6976]">
              先程のカテゴリ回答（{currentCategory.label}）とAI 評価がリセットされます。
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-[16px] border border-[#dbe4db] bg-white px-6 text-sm font-bold text-[#1f2832]"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleResetCategory}
                disabled={resettingCategory}
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#dc2626] px-6 text-sm font-bold text-white shadow-[0_20px_40px_-28px_rgba(220,38,38,0.48)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AiInterviewSetupModal
        open={setupModalOpen}
        step={setupStep}
        draft={setupDraft}
        savedOptions={savedSetupOptions}
        submitting={setupSubmitting}
        onClose={() => setSetupModalOpen(false)}
        onBack={() => setSetupStep((current) => (current === 1 ? 1 : ((current - 1) as 1 | 2 | 3)))}
        onNext={() => {
          if (setupDraft.setupMode === "saved" || setupStep === 3) {
            handleSubmitSetup();
            return;
          }
          setSetupStep((current) => ((current + 1) as 1 | 2 | 3));
        }}
        onSubmit={handleSubmitSetup}
        onStepChange={setSetupStep}
        onDraftChange={setSetupDraft}
      />
    </section>
  );
}
