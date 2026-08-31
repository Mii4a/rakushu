"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDashed,
  Loader2,
  MapPin,
  PencilLine,
  Send,
  Sparkles,
  X
} from "lucide-react";

import { completeOnboardingAction, skipOnboardingAction } from "@/actions/onboarding-actions";
import { mergeOnboardingDraft, shouldPersistOnboardingDraft, trimDisplayName, type OnboardingDraft } from "@/lib/onboarding/draft";
import rakushuBotWave from "../../../UI-mock/dashboard/icons/rakushu-bot-wave.png";
import rakumoAnalyticsThumbsUp from "../../../UI-mock/dashboard/character/rakumo-analytics-thumbs-up.png";
import rakumoIdeaGuide from "../../../UI-mock/dashboard/character/rakumo-idea-guide.png";

type OnboardingExperienceProps = {
  userId: string;
  initialName: string;
  userImage: string | null;
  initialDraft?: Partial<OnboardingDraft> | null;
};

type SummaryGroup = {
  label: string;
  values: string[];
};

type ChatEntry = {
  id: string;
  prompt: string;
  tone?: "default" | "soft";
  response?: string[];
};

const stepLabels = ["はじめまして", "希望職種", "働き方", "スキル", "勤務地・年収", "完了"] as const;
const applicantStatusOptions = [
  "新卒",
  "既卒",
  "第2新卒",
  "中途",
  "未経験から挑戦",
  "社会人経験あり",
  "社会人経験なし",
  "フリーランス経験あり",
  "アルバイト経験中心",
  "ブランクあり",
  "在学中",
  "その他"
] as const;
const workStyleOptions = [
  "正社員",
  "契約社員",
  "業務委託",
  "アルバイト",
  "リモート可",
  "フレックス",
  "残業少なめ",
  "未経験歓迎",
  "副業可",
  "研修あり",
  "自社勤務",
  "客先常駐も可"
] as const;
const locationOptions = ["東京都", "神奈川県", "千葉県", "埼玉県", "大阪府", "フルリモート", "こだわらない"] as const;
const commuteOptions = ["通勤30分以内", "通勤45分以内", "通勤60分以内", "週1出社まで", "週2〜3出社まで", "出社多めでも可"] as const;
const salaryOptions = [
  "月20万円以上",
  "月23万円以上",
  "月25万円以上",
  "月30万円以上",
  "年収300万円以上",
  "年収350万円以上",
  "年収400万円以上",
  "こだわらない",
  "まだわからない"
] as const;
const avoidConditionOptions = [
  "残業が多い",
  "ノルマ営業",
  "電話対応が多い",
  "出社必須",
  "転勤あり",
  "休日が少ない",
  "固定残業が多い",
  "体育会系",
  "ベンチャー色が強い",
  "客先常駐",
  "口コミ評価が低い",
  "研修が薄い",
  "実務経験必須",
  "特になし"
] as const;
const jobHuntingStatusOptions = [
  "これから始める",
  "求人を探している",
  "応募中",
  "面接中",
  "内定あり",
  "転職するか迷っている",
  "自己分析中",
  "とりあえず情報収集中"
] as const;
const priorityOptions = [
  "仕事内容",
  "年収",
  "働きやすさ",
  "勤務地",
  "成長環境",
  "安定性",
  "未経験から入りやすい",
  "人間関係",
  "残業の少なさ",
  "将来性",
  "福利厚生",
  "口コミ評価"
] as const;

function makeStorageKey(userId: string) {
  return `rakushu:onboarding:${userId}`;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function StepDot({ state, number }: { state: "done" | "active" | "idle"; number: number }) {
  if (state === "done") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2fb348] text-white shadow-[0_16px_26px_-18px_rgba(47,179,72,0.65)]">
        <Check className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-black ${state === "active" ? "border-[#b8e4ba] bg-[#eef9ee] text-[#23933d]" : "border-[#e7eaef] bg-white text-[#6b7280]"}`}>
      {number}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div
      className="relative flex h-[122px] w-[122px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#2fb348 ${value * 3.6}deg, #e8ecef ${value * 3.6}deg 360deg)`
      }}
    >
      <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white text-[#111827] shadow-[inset_0_0_0_1px_rgba(229,231,235,0.9)]">
        <span className="text-[2rem] font-black tracking-[-0.05em]">{value}</span>
        <span className="-mt-1 text-sm font-bold text-[#6b7280]">%</span>
      </div>
    </div>
  );
}

function MultiSelectChips({ values, selectedValues, onToggle }: { values: readonly string[]; selectedValues: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {values.map((value) => {
        const selected = selectedValues.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${selected ? "border-[#8cd48d] bg-[#eef9ee] text-[#24963f] shadow-[0_12px_24px_-18px_rgba(47,179,72,0.45)]" : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#c8e6c9] hover:bg-[#f8fcf8]"}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function SingleSelectChips({ values, selectedValue, onSelect }: { values: readonly string[]; selectedValue: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {values.map((value) => {
        const selected = selectedValue === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${selected ? "border-[#8cd48d] bg-[#eef9ee] text-[#24963f] shadow-[0_12px_24px_-18px_rgba(47,179,72,0.45)]" : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#c8e6c9] hover:bg-[#f8fcf8]"}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function AssistantBubble({ prompt, tone = "default" }: { prompt: string; tone?: "default" | "soft" }) {
  return (
    <div className="flex items-start gap-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#dcf0dd] bg-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.18)]">
        <Image src={rakushuBotWave} alt="らくも" fill className="object-cover" sizes="56px" />
      </div>
      <div className="max-w-[720px]">
        <p className="mb-2 text-sm font-black text-[#111827]">らくしゅう</p>
        <div className={`rounded-[24px] border px-6 py-5 text-[1.05rem] font-semibold leading-9 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.18)] ${tone === "soft" ? "border-[#ecf5e7] bg-[#fbfdf9] text-[#344154]" : "border-[#ebeff3] bg-white text-[#1f2937]"}`}>
          {prompt.split("\n").map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubbleRow({ values }: { values: string[] }) {
  if (values.length === 0) return null;

  return (
    <div className="flex justify-end">
      <div className="max-w-[720px] rounded-[24px] border border-[#d7ebd8] bg-[#f4fbf1] px-5 py-4 shadow-[0_24px_44px_-34px_rgba(47,179,72,0.18)]">
        <div className="flex flex-wrap justify-end gap-3">
          {values.map((value) => (
            <span key={value} className="rounded-full border border-[#72c675] bg-white px-4 py-2 text-sm font-black text-[#24963f]">
              {value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OnboardingExperience({ userId, initialName, userImage, initialDraft }: OnboardingExperienceProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<OnboardingDraft>(() => mergeOnboardingDraft(initialName, initialDraft));
  const [hydrated, setHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, startFinishing] = useTransition();
  const storageKey = useMemo(() => makeStorageKey(userId), [userId]);

  useEffect(() => {
    const mergedServerDraft = mergeOnboardingDraft(initialName, initialDraft);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDraft(mergedServerDraft);
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
      const nextDraft = mergeOnboardingDraft(initialName, {
        ...mergedServerDraft,
        ...parsed
      });

      setDraft(nextDraft);
    } catch {
      setDraft(mergedServerDraft);
    } finally {
      setHydrated(true);
    }
  }, [initialDraft, initialName, storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    if (!shouldPersistOnboardingDraft(draft)) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, hydrated, storageKey]);

  const displayName = draft.nickname.trim() || trimDisplayName(initialName);
  const completedImplementedSections = [
    draft.nickname.trim().length > 0 && draft.applicantStatus.length > 0,
    draft.workStyles.length > 0 && draft.jobHuntingStatus.length > 0 && draft.priority.length > 0,
    (draft.locations.length > 0 || draft.locationNote.trim().length > 0) && draft.salaryPreference.length > 0
  ].filter(Boolean).length;
  const precisionScore = Math.min(96, 28 + completedImplementedSections * 22 + Math.min(draft.avoidConditions.length, 4) * 3 + Math.min(draft.priority.length, 3) * 2);

  const summaryGroups = useMemo<SummaryGroup[]>(() => {
    const groups: SummaryGroup[] = [];

    if (draft.nickname.trim()) {
      groups.push({ label: "呼び名", values: [`${displayName}さん`] });
    }
    if (draft.applicantStatus.length > 0) {
      groups.push({ label: "今の状況", values: draft.applicantStatus });
    }
    if (draft.deferredRoles) {
      groups.push({ label: "希望職種", values: ["今回の実装ではあとで設定"] });
    }
    if (draft.workStyles.length > 0) {
      groups.push({ label: "働き方", values: draft.workStyles });
    }
    if (draft.deferredSkills) {
      groups.push({ label: "スキル", values: ["今回の実装ではあとで設定"] });
    }
    if (draft.locations.length > 0) {
      groups.push({ label: "勤務地", values: draft.locations });
    }
    if (draft.commutePreference) {
      groups.push({ label: "通勤条件", values: [draft.commutePreference] });
    }
    if (draft.locationNote.trim()) {
      groups.push({ label: "自由入力", values: [draft.locationNote.trim()] });
    }
    if (draft.salaryPreference) {
      groups.push({ label: "年収・給与", values: [draft.salaryPreference] });
    }
    if (draft.avoidConditions.length > 0) {
      groups.push({ label: "避けたい条件", values: draft.avoidConditions });
    }
    if (draft.jobHuntingStatus) {
      groups.push({ label: "就活状況", values: [draft.jobHuntingStatus] });
    }
    if (draft.priority.length > 0) {
      groups.push({ label: "重視すること", values: draft.priority });
    }

    return groups;
  }, [displayName, draft]);

  const chatEntries = useMemo<ChatEntry[]>(() => {
    const entries: ChatEntry[] = [];

    if (draft.started || draft.currentStep > 0) {
      entries.push({
        id: "hello",
        prompt: `はじめまして！ らくしゅうです ✨\n一緒にあなたに合う求人を探していこう。\nまずは呼び名と、今の状況を教えてね！`,
        response: [displayName, ...draft.applicantStatus]
      });
    }

    if (draft.currentStep > 1 || draft.deferredRoles) {
      entries.push({
        id: "roles",
        prompt: "希望職種の細かい入力は、次の実装で入れる予定。\n今日は他の条件を先に整えて、あとから追加できる形にしておくね。",
        tone: "soft",
        response: ["希望職種はあとで設定"]
      });
    }

    if (draft.currentStep > 2) {
      entries.push({
        id: "work",
        prompt: "ありがとう！ 次は、働き方の希望や避けたい条件をざっくり見せて〜。\n今の就活状況と、特に大事にしたいことも一緒に教えてね。",
        response: [...draft.workStyles, ...draft.avoidConditions.slice(0, 2), ...(draft.jobHuntingStatus ? [draft.jobHuntingStatus] : []), ...draft.priority]
      });
    }

    if (draft.currentStep > 3 || draft.deferredSkills) {
      entries.push({
        id: "skills",
        prompt: "スキルの棚卸し UI は、キャラと一緒に次の段で入れる予定。\n今回は求人の見極めに直結する条件づくりを先に進めるよ。",
        tone: "soft",
        response: ["スキルはあとで設定"]
      });
    }

    if (draft.currentStep > 4) {
      const locationResponses = [...draft.locations];
      if (draft.commutePreference) locationResponses.push(draft.commutePreference);
      if (draft.locationNote.trim()) locationResponses.push(draft.locationNote.trim());
      if (draft.salaryPreference) locationResponses.push(draft.salaryPreference);
      entries.push({
        id: "location",
        prompt: "勤務地や通勤条件、それから給料の希望もざっくり決めよう。\n通いやすさは地味だけど、かなり大事だからちゃんと見るね。",
        response: locationResponses
      });
    }

    if (draft.currentStep >= 5) {
      entries.push({
        id: "done",
        prompt: `よし、だいぶ見えてきた！\n${displayName}さんは「合う / 合わない」を見ながら探した方がよさそう。\nこの条件で始めれば、次は求人を貼って解析するだけで進められるよ。`,
        response: ["この条件で始める準備OK"]
      });
    }

    return entries;
  }, [displayName, draft]);

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((current: OnboardingDraft) => ({ ...current, ...patch }));
  }

  function goToStep(nextStep: number) {
    setErrorMessage(null);
    updateDraft({ currentStep: nextStep });
  }

  function clearPersistedDraft() {
    window.localStorage.removeItem(storageKey);
  }

  async function handleSkip(href: string) {
    setErrorMessage(null);

    startFinishing(async () => {
      const nextDraft: OnboardingDraft = {
        ...draft,
        skippedAt: new Date().toISOString(),
        completedAt: undefined
      };
      const result = await skipOnboardingAction(nextDraft);

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      clearPersistedDraft();
      setDraft(nextDraft);
      router.push(href);
    });
  }

  function handleContinue() {
    setErrorMessage(null);

    if (draft.currentStep === 0) {
      if (!draft.nickname.trim()) {
        setErrorMessage("呼び名を入れてから進んでね。");
        return;
      }
      if (draft.applicantStatus.length === 0) {
        setErrorMessage("今の状況を1つ以上選んでね。");
        return;
      }
      goToStep(1);
      return;
    }

    if (draft.currentStep === 1) {
      updateDraft({ deferredRoles: true, currentStep: 2 });
      return;
    }

    if (draft.currentStep === 2) {
      if (draft.workStyles.length === 0) {
        setErrorMessage("働き方の希望を1つ以上選んでね。");
        return;
      }
      if (!draft.jobHuntingStatus) {
        setErrorMessage("就活状況を1つ選んでね。");
        return;
      }
      if (draft.priority.length === 0) {
        setErrorMessage("重視することを1つ以上選んでね。");
        return;
      }
      goToStep(3);
      return;
    }

    if (draft.currentStep === 3) {
      updateDraft({ deferredSkills: true, currentStep: 4 });
      return;
    }

    if (draft.currentStep === 4) {
      if (draft.locations.length === 0 && !draft.locationNote.trim()) {
        setErrorMessage("勤務地か自由入力のどちらかは入れておくと助かるよ。");
        return;
      }
      if (!draft.salaryPreference) {
        setErrorMessage("給与の希望を1つ選んでね。");
        return;
      }
      goToStep(5);
    }
  }

  function handleFinish(href: string) {
    setErrorMessage(null);

    startFinishing(async () => {
      const nextDraft: OnboardingDraft = {
        ...draft,
        nickname: draft.nickname.trim(),
        completedAt: new Date().toISOString(),
        skippedAt: undefined,
        started: true,
        currentStep: 5
      };
      const result = await completeOnboardingAction(nextDraft);

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      clearPersistedDraft();
      setDraft({
        ...nextDraft,
        nickname: result.nickname
      });
      router.push(href);
    });
  }

  if (!hydrated) {
    return <section className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff9f1_0%,#ffffff_18%,#ffffff_100%)]" />;
  }

  return (
    <section className="onboarding-surface h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff9f1_0%,#ffffff_18%,#ffffff_100%)] text-[#1f2937]">
      <div className="mx-auto grid h-screen w-full max-w-[1600px] grid-cols-1 gap-0 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="overflow-y-auto border-b border-[#edf0f3] bg-white/80 px-6 py-8 xl:h-screen xl:border-b-0 xl:border-r xl:px-8">
          <Link href="/" className="inline-flex items-center whitespace-nowrap text-[2.45rem] font-black leading-none tracking-[-0.07em] text-[#1fa74a]">
            らくしゅう
          </Link>
          <p className="mt-10 text-lg font-black text-[#111827]">オンボーディング</p>

          <div className="mt-5 space-y-2">
            {stepLabels.map((label, index) => {
              const state: "done" | "active" | "idle" = index < draft.currentStep ? "done" : index === draft.currentStep ? "active" : "idle";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => draft.started && index <= draft.currentStep ? goToStep(index) : undefined}
                  className={`flex w-full items-center gap-4 rounded-[22px] px-4 py-3 text-left transition ${state === "active" ? "bg-[#eef9ee]" : "bg-transparent"}`}
                >
                  <StepDot state={state} number={index + 1} />
                  <span className={`text-[1.05rem] font-black ${state === "active" ? "text-[#23933d]" : "text-[#374151]"}`}>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-12 rounded-[28px] border border-[#e6efe3] bg-[linear-gradient(180deg,#fbfdf8_0%,#f5fbf2_100%)] p-5 text-center shadow-[0_24px_60px_-46px_rgba(15,23,42,0.18)]">
            <p className="whitespace-pre-line text-[1.05rem] font-black leading-8 text-[#2d3748]">{"らくしゅうが\nあなたの理想のキャリア探しを\nサポートするよ！"}</p>
            <div className="relative mx-auto mt-4 h-[180px] w-full max-w-[200px]">
              <Image src={rakumoAnalyticsThumbsUp} alt="応援するらくも" fill className="object-contain" sizes="200px" />
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#6b7280]">
            <Link href="/legal/privacy">プライバシー</Link>
            <Link href="/legal/terms">利用規約</Link>
            <Link href="/about">ヘルプ</Link>
          </div>
          <p className="mt-6 text-sm font-semibold text-[#9ca3af]">© RAKUSHU, Inc.</p>
        </aside>

        <main className="flex h-screen min-h-0 flex-col overflow-hidden border-b border-[#edf0f3] px-6 py-8 xl:border-b-0 xl:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className="text-[1.85rem] font-black tracking-[-0.04em] text-[#111827]">あなたにぴったりの求人を見つけるお手伝いをするね！</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <span className="text-[1.45rem] font-black text-[#23933d]">{Math.min(draft.currentStep + 1, 6)} / 6</span>
                <div className="h-4 w-[220px] overflow-hidden rounded-full bg-[#eceff3]">
                  <div className="h-full rounded-full bg-[#2fb348] transition-all" style={{ width: `${((Math.min(draft.currentStep + 1, 6)) / 6) * 100}%` }} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSkip("/jobs/new")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] border border-[#dce2e8] bg-white px-4 text-base font-bold text-[#4b5563]"
              >
                <X className="h-4 w-4" />
                終了する
              </button>
            </div>
          </div>

          <div className="mt-7 min-h-0 flex-1 overflow-hidden rounded-[34px] border border-[#e8edf2] bg-white/90 p-5 shadow-[0_36px_90px_-62px_rgba(15,23,42,0.2)] md:p-7">
            {!draft.started ? (
              <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto text-center">
                <div className="relative h-[170px] w-[170px]">
                  <Image src={rakumoIdeaGuide} alt="案内するらくも" fill className="object-contain" sizes="170px" />
                </div>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eef9ee] px-4 py-2 text-sm font-black text-[#24963f]">
                  <Sparkles className="h-4 w-4" />
                  3分くらいで終わるよ
                </span>
                <h1 className="mt-6 text-[3.1rem] font-black tracking-[-0.06em] text-[#111827]">やっほ〜、らくもだよ。</h1>
                <p className="mt-5 max-w-[760px] text-[1.18rem] font-semibold leading-9 text-[#475569]">
                  これから、君に合いそうな求人を見つけやすくするために、ちょっとだけ希望を聞かせて！
                  <br />
                  あとから変えられるから、気楽でOK〜。
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => updateDraft({ started: true, currentStep: 0 })}
                    className="inline-flex min-h-[58px] items-center justify-center rounded-[18px] bg-[#2fb348] px-7 text-lg font-black text-white shadow-[0_20px_40px_-24px_rgba(47,179,72,0.65)]"
                  >
                    はじめる
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSkip("/jobs/new")}
                    className="inline-flex min-h-[58px] items-center justify-center rounded-[18px] border border-[#dce2e8] bg-white px-7 text-lg font-black text-[#4b5563]"
                  >
                    あとでやる
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col justify-between gap-6 overflow-hidden">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2">
                  {chatEntries.map((entry) => (
                    <div key={entry.id} className="space-y-4">
                      <AssistantBubble prompt={entry.prompt} tone={entry.tone} />
                      {entry.response ? <UserBubbleRow values={entry.response} /> : null}
                    </div>
                  ))}

                  {draft.currentStep === 0 ? (
                    <div className="space-y-5 rounded-[28px] border border-[#e6ebf0] bg-[#fcfdfd] p-5">
                      <AssistantBubble prompt={`まず、なんて呼べばいい？\n本名じゃなくてぜんぜんOK。呼びやすいやつで！\n\n次に、今の状況に近いやつも選んで〜。`} />
                      <div className="pl-[72px]">
                        <label className="block">
                          <span className="text-sm font-black text-[#111827]">呼び名</span>
                          <input
                            value={draft.nickname}
                            onChange={(event) => updateDraft({ nickname: event.target.value })}
                            placeholder="例：ゆうき、たろう、山田さん、べっぷ"
                            className="mt-3 w-full rounded-[18px] border border-[#dbe3ea] px-4 py-4 text-base font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
                          />
                        </label>
                        <div className="mt-5">
                          <p className="mb-3 text-sm font-black text-[#111827]">今の状況</p>
                          <MultiSelectChips values={applicantStatusOptions} selectedValues={draft.applicantStatus} onToggle={(value) => updateDraft({ applicantStatus: toggleValue(draft.applicantStatus, value) })} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {draft.currentStep === 1 ? (
                    <div className="space-y-5 rounded-[28px] border border-dashed border-[#cfe8cf] bg-[#fbfdf9] p-6">
                      <AssistantBubble prompt="希望職種の入力UIは、次の差分で入れ替える予定です。今はここで足止めせず、求人を見極める条件づくりを先に進めよう。" tone="soft" />
                      <div className="pl-[72px] rounded-[22px] border border-[#e5efe2] bg-white px-5 py-4 text-sm font-semibold leading-8 text-[#52606d]">
                        今は未入力でOK。次回、エンジニア / 情シス / 事務 などをここで複数選べるようにします。
                      </div>
                    </div>
                  ) : null}

                  {draft.currentStep === 2 ? (
                    <div className="space-y-6 rounded-[28px] border border-[#e6ebf0] bg-[#fcfdfd] p-5">
                      <AssistantBubble prompt="働き方の希望ある？ 『これは欲しい』ってやつだけでOK。\nそれと、避けたい条件・今の就活状況・重視することもここでまとめて見せてね。" />
                      <div className="space-y-6 pl-[72px]">
                        <div>
                          <p className="mb-3 text-sm font-black text-[#111827]">働き方</p>
                          <MultiSelectChips values={workStyleOptions} selectedValues={draft.workStyles} onToggle={(value) => updateDraft({ workStyles: toggleValue(draft.workStyles, value) })} />
                        </div>
                        <div>
                          <p className="mb-3 text-sm font-black text-[#111827]">避けたい条件</p>
                          <MultiSelectChips values={avoidConditionOptions} selectedValues={draft.avoidConditions} onToggle={(value) => updateDraft({ avoidConditions: value === "特になし" ? [value] : toggleValue(draft.avoidConditions.filter((item) => item !== "特になし"), value) })} />
                        </div>
                        <div>
                          <p className="mb-3 text-sm font-black text-[#111827]">就活状況</p>
                          <SingleSelectChips values={jobHuntingStatusOptions} selectedValue={draft.jobHuntingStatus} onSelect={(value) => updateDraft({ jobHuntingStatus: value })} />
                        </div>
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <p className="text-sm font-black text-[#111827]">重視すること</p>
                            <span className="text-xs font-bold text-[#6b7280]">迷ったら 3 つくらいでOK</span>
                          </div>
                          <MultiSelectChips values={priorityOptions} selectedValues={draft.priority} onToggle={(value) => updateDraft({ priority: toggleValue(draft.priority, value).slice(0, 3) })} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {draft.currentStep === 3 ? (
                    <div className="space-y-5 rounded-[28px] border border-dashed border-[#cfe8cf] bg-[#fbfdf9] p-6">
                      <AssistantBubble prompt="スキル・経験の棚卸しは、次の差分で専用ステップとして追加します。\n今は求人を見極めるための条件づくりを優先して、このステップはそのまま通過できるようにしてあります。" tone="soft" />
                      <div className="pl-[72px] rounded-[22px] border border-[#e5efe2] bg-white px-5 py-4 text-sm font-semibold leading-8 text-[#52606d]">
                        ここではまだ入力不要です。Python / AWS / Docker などのタグ選択は、次回追加しやすいように枠だけ先に用意しています。
                      </div>
                    </div>
                  ) : null}

                  {draft.currentStep === 4 ? (
                    <div className="space-y-6 rounded-[28px] border border-[#e6ebf0] bg-[#fcfdfd] p-5">
                      <AssistantBubble prompt="勤務地はどのへんがいい？\n通勤時間って地味にメンタル削るから、ここはちゃんと見とこ。\n給料の希望もざっくりで大丈夫！" />
                      <div className="space-y-6 pl-[72px]">
                        <div>
                          <p className="mb-3 text-sm font-black text-[#111827]">勤務地</p>
                          <MultiSelectChips values={locationOptions} selectedValues={draft.locations} onToggle={(value) => updateDraft({ locations: toggleValue(draft.locations, value) })} />
                        </div>
                        <div>
                          <p className="mb-3 text-sm font-black text-[#111827]">通勤条件</p>
                          <SingleSelectChips values={commuteOptions} selectedValue={draft.commutePreference} onSelect={(value) => updateDraft({ commutePreference: value })} />
                        </div>
                        <label className="block">
                          <span className="text-sm font-black text-[#111827]">自由入力</span>
                          <input
                            value={draft.locationNote}
                            onChange={(event) => updateDraft({ locationNote: event.target.value })}
                            placeholder="渋谷・新宿あたり / 自宅から40分以内 / 都内ならOK"
                            className="mt-3 w-full rounded-[18px] border border-[#dbe3ea] px-4 py-4 text-base font-semibold text-[#263342] outline-none focus:border-[#2caf48] focus:ring-4 focus:ring-[#dff4cf]"
                          />
                        </label>
                        <div>
                          <p className="mb-3 text-sm font-black text-[#111827]">年収・給与</p>
                          <SingleSelectChips values={salaryOptions} selectedValue={draft.salaryPreference} onSelect={(value) => updateDraft({ salaryPreference: value })} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {draft.currentStep === 5 ? (
                    <div className="space-y-5 rounded-[28px] border border-[#e6ebf0] bg-[#fcfdfd] p-5">
                      <AssistantBubble prompt={`ここまでの条件、こんな感じ！\n変えたいところがあれば今直せるし、このまま始めてもOK〜。`} />
                      <div className="pl-[72px] space-y-4 rounded-[24px] border border-[#ebeff3] bg-white p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.12)]">
                        {summaryGroups.map((group) => (
                          <div key={group.label}>
                            <p className="text-sm font-black text-[#111827]">{group.label}</p>
                            <div className="mt-2 flex flex-wrap gap-2.5">
                              {group.values.map((value) => (
                                <span key={`${group.label}-${value}`} className="rounded-full bg-[#f3f5f7] px-3 py-2 text-sm font-bold text-[#374151]">
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-[#e6ebf0] bg-white p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.1)]">
                  {errorMessage ? <p className="mb-3 rounded-[16px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</p> : null}

                  {draft.currentStep < 5 ? (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[1.1rem] font-black text-[#111827]">{stepLabels[draft.currentStep]}</p>
                          <p className="mt-1 text-sm font-semibold text-[#6b7280]">入力した内容は公開されません。あとから変えられます。</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {draft.currentStep > 0 ? (
                            <button
                              type="button"
                              onClick={() => goToStep(draft.currentStep - 1)}
                              className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#dce2e8] px-4 text-sm font-black text-[#4b5563]"
                            >
                              戻る
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleContinue}
                            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] bg-[#2fb348] px-5 text-sm font-black text-white shadow-[0_18px_36px_-24px_rgba(47,179,72,0.62)]"
                          >
                            次へ
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 border-t border-[#edf0f3] pt-4">
                        <button type="button" className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#dce2e8] px-4 text-sm font-bold text-[#4b5563]" disabled>
                          <PencilLine className="h-4 w-4" />
                          添付
                        </button>
                        <button
                          type="button"
                          onClick={() => goToStep(draft.currentStep === 2 ? 2 : 4)}
                          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#dce2e8] px-4 text-sm font-bold text-[#4b5563]"
                        >
                          <MapPin className="h-4 w-4" />
                          こだわり条件を追加
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-[1.1rem] font-black text-[#111827]">設定できた！ おつかれ〜。</p>
                        <p className="mt-1 text-sm font-semibold text-[#6b7280]">まずは気になる求人を1つ貼って、相性チェックから始めるのが自然です。</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => goToStep(0)}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#dce2e8] px-4 text-sm font-black text-[#4b5563]"
                        >
                          ちょっと直す
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSkip("/jobs/new")}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#dce2e8] px-4 text-sm font-black text-[#4b5563]"
                        >
                          あとで設定する
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinish("/jobs/new")}
                          disabled={isFinishing}
                          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] bg-[#2fb348] px-5 text-sm font-black text-white shadow-[0_18px_36px_-24px_rgba(47,179,72,0.62)] disabled:opacity-60"
                        >
                          {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          求人を貼って解析する
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinish("/jobs")}
                          disabled={isFinishing}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#dce2e8] bg-white px-4 text-sm font-black text-[#4b5563] disabled:opacity-60"
                        >
                          求人一覧を見る
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinish("/jobs/new")}
                          disabled={isFinishing}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#dce2e8] bg-white px-4 text-sm font-black text-[#4b5563] disabled:opacity-60"
                        >
                          求人チェッカーへ行く
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="overflow-y-auto bg-white/80 px-6 py-8 xl:h-screen xl:border-l xl:border-[#edf0f3] xl:px-8">
          <div className="rounded-[28px] border border-[#e8edf2] bg-white p-5 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.8rem] font-black tracking-[-0.04em] text-[#111827]">選択した条件</h2>
              <button type="button" onClick={() => goToStep(Math.max(0, draft.currentStep - 1))} className="inline-flex items-center gap-1 rounded-full border border-[#dde3e9] px-3 py-2 text-sm font-black text-[#4b5563]">
                <PencilLine className="h-4 w-4" />
                編集
              </button>
            </div>
            <div className="mt-5 space-y-5">
              {summaryGroups.length > 0 ? (
                summaryGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-sm font-black text-[#6b7280]">{group.label}</p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {group.values.map((value) => (
                        <span key={`${group.label}-${value}`} className="rounded-[14px] border border-[#e4ebdf] bg-[#f9fcf7] px-3 py-2 text-sm font-bold text-[#374151]">
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#d8e5d6] bg-[#fbfdf9] p-4 text-sm font-semibold leading-7 text-[#6b7280]">
                  まだ条件は入っていません。はじめると、ここに選んだ内容がまとまって表示されます。
                </div>
              )}
            </div>
            <button type="button" onClick={() => goToStep(draft.currentStep < 2 ? 2 : 4)} className="mt-6 inline-flex w-full items-center justify-center gap-2 border-t border-[#edf0f3] pt-5 text-base font-black text-[#374151]">
              すべての条件を見る
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e8edf2] bg-white p-5 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.16)]">
            <div className="flex items-center gap-2 text-[1.8rem] font-black tracking-[-0.04em] text-[#111827]">
              おすすめ精度
              <CircleDashed className="h-5 w-5 text-[#6b7280]" />
            </div>
            <div className="mt-5 flex items-center gap-5">
              <ProgressRing value={precisionScore} />
              <div>
                <p className="text-[1.55rem] font-black text-[#111827]">{precisionScore >= 70 ? "いい感じ！" : "まだ伸ばせる"}</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-[#6b7280]">
                  {precisionScore >= 70 ? "もう少し条件を足すと、さらに精度が上がるよ。" : "勤務地や重視条件が入ると、相性の見極めがしやすくなるよ。"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => goToStep(draft.currentStep < 2 ? 2 : 4)}
              className="mt-6 inline-flex min-h-[54px] w-full items-center justify-center rounded-[18px] bg-[#2fb348] px-4 text-base font-black text-white shadow-[0_18px_36px_-24px_rgba(47,179,72,0.62)]"
            >
              こだわり条件を追加する
            </button>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e8edf2] bg-[radial-gradient(circle_at_top,#f7fbf3_0%,#fefefb_100%)] p-5 shadow-[0_28px_68px_-54px_rgba(15,23,42,0.16)]">
            <h2 className="text-[1.75rem] font-black tracking-[-0.04em] text-[#111827]">一緒にがんばろう！</h2>
            <p className="mt-3 text-[1.02rem] font-semibold leading-8 text-[#475569]">
              らくしゅうが、あなたにぴったりのキャリアを見つけるお手伝いをするよ ✨
            </p>
            <div className="relative mx-auto mt-5 h-[170px] w-full max-w-[220px]">
              {userImage ? (
                <Image src={userImage} alt={`${displayName}さんのプロフィール画像`} fill className="rounded-[22px] object-cover" sizes="220px" />
              ) : (
                <Image src={rakumoIdeaGuide} alt="案内するらくも" fill className="object-contain" sizes="220px" />
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
