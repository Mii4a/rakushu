export type AiInterviewScenarioType = "new-grad" | "graduated" | "second-new-grad" | "career";

export type AiInterviewInterviewType = "first" | "second" | "later" | "final";

export type AiInterviewCategoryDefinition = {
  id: string;
  label: string;
  durationMinutes: number;
  questionCount: number;
  sampleQuestion: string;
  fixedQuestions: string[];
  scenarioTypes: AiInterviewScenarioType[];
};

export type AiInterviewScenarioDefinition = {
  type: AiInterviewScenarioType;
  label: string;
  description: string;
  categories: AiInterviewCategoryDefinition[];
  totalDurationMinutes: number;
  totalQuestionCount: number;
};

export type AiInterviewSetupDraft = {
  settingSetName: string;
  setupMode: "new" | "saved";
  selectedSavedSettingId: string | null;
  interviewType: AiInterviewInterviewType;
  targetCompany: string;
  targetRole: string;
  scenarioType: AiInterviewScenarioType;
};

const CATEGORY_DEFINITIONS: Record<string, AiInterviewCategoryDefinition> = {
  selfIntro: {
    id: "selfIntro",
    label: "自己紹介",
    durationMinutes: 4,
    questionCount: 2,
    sampleQuestion: "自己紹介してください",
    fixedQuestions: ["自己紹介してください"],
    scenarioTypes: ["new-grad", "graduated", "second-new-grad", "career"]
  },
  studentEffort: {
    id: "studentEffort",
    label: "ガクチカ",
    durationMinutes: 4,
    questionCount: 2,
    sampleQuestion: "学生時代に力を入れたことを教えてください",
    fixedQuestions: ["学生時代に力を入れたことを教えてください"],
    scenarioTypes: ["new-grad", "graduated"]
  },
  academicResearch: {
    id: "academicResearch",
    label: "学業/研究での取り組み",
    durationMinutes: 4,
    questionCount: 2,
    sampleQuestion: "学業や研究で力を入れて取り組んだことを教えてください",
    fixedQuestions: ["学業や研究で力を入れて取り組んだことを教えてください"],
    scenarioTypes: ["new-grad", "graduated"]
  },
  jobHuntingAxis: {
    id: "jobHuntingAxis",
    label: "就活の軸",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "就職活動の軸を教えてください",
    fixedQuestions: ["就職活動の軸を教えてください", "企業を選ぶうえで大切にしていることを教えてください"],
    scenarioTypes: ["new-grad", "graduated"]
  },
  graduatedReason: {
    id: "graduatedReason",
    label: "既卒理由/卒業後の活動",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "なぜ新卒ではなく既卒で就職活動をしているのですか",
    fixedQuestions: ["なぜ新卒ではなく既卒で就職活動をしているのですか", "卒業後はどのような活動に取り組んできましたか"],
    scenarioTypes: ["graduated"]
  },
  previousExperience: {
    id: "previousExperience",
    label: "前職での経験",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "前職ではどのような業務を担当していましたか",
    fixedQuestions: ["前職ではどのような業務を担当していましたか", "前職で成果を出した経験を教えてください"],
    scenarioTypes: ["second-new-grad", "career"]
  },
  careerChangeReason: {
    id: "careerChangeReason",
    label: "転職理由",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "転職を考えた理由を教えてください",
    fixedQuestions: ["転職を考えた理由を教えてください", "次の職場で実現したいことを教えてください"],
    scenarioTypes: ["second-new-grad", "career"]
  },
  earlyLeaveReason: {
    id: "earlyLeaveReason",
    label: "早期離職理由/今後の定着性",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "前職を短期間で離れた理由を教えてください",
    fixedQuestions: ["前職を短期間で離れた理由を教えてください", "次の職場で長く働くために大切にしたいことを教えてください"],
    scenarioTypes: ["second-new-grad"]
  },
  blankPeriod: {
    id: "blankPeriod",
    label: "ブランク期間",
    durationMinutes: 4,
    questionCount: 2,
    sampleQuestion: "離職後の期間は、主に何に取り組んでいましたか",
    fixedQuestions: ["離職後の期間は、主に何に取り組んでいましたか"],
    scenarioTypes: ["second-new-grad"]
  },
  leavingReason: {
    id: "leavingReason",
    label: "退職理由/ブランク期間",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "退職理由を教えてください",
    fixedQuestions: ["退職理由を教えてください", "離職後の期間に取り組んだことを教えてください"],
    scenarioTypes: ["career"]
  },
  selfPromotion: {
    id: "selfPromotion",
    label: "自己PR",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "自己PRとして、あなたの強みとそれを発揮した経験を教えてください",
    fixedQuestions: [
      "自己PRとして、あなたの強みとそれを発揮した経験を教えてください",
      "これまで経験した苦難と、それをどう乗り越えたか教えてください"
    ],
    scenarioTypes: ["new-grad", "graduated", "second-new-grad", "career"]
  },
  motivation: {
    id: "motivation",
    label: "志望動機",
    durationMinutes: 8,
    questionCount: 4,
    sampleQuestion: "志望動機を教えてください",
    fixedQuestions: ["志望動機を教えてください", "他社ではなく当社を志望する理由を教えてください"],
    scenarioTypes: ["new-grad", "graduated", "second-new-grad", "career"]
  },
  careerPlan: {
    id: "careerPlan",
    label: "キャリアプラン",
    durationMinutes: 4,
    questionCount: 2,
    sampleQuestion: "将来どのようなキャリアを築きたいですか",
    fixedQuestions: ["将来どのようなキャリアを築きたいですか"],
    scenarioTypes: ["new-grad", "graduated", "second-new-grad", "career"]
  },
  reverseQuestions: {
    id: "reverseQuestions",
    label: "逆質問/最後の確認",
    durationMinutes: 4,
    questionCount: 2,
    sampleQuestion: "最後に何か質問はありますか",
    fixedQuestions: ["最後に何か質問はありますか"],
    scenarioTypes: ["new-grad", "graduated", "second-new-grad", "career"]
  }
};

const SCENARIO_CATEGORY_ORDER: Record<AiInterviewScenarioType, string[]> = {
  "new-grad": ["selfIntro", "studentEffort", "academicResearch", "jobHuntingAxis", "selfPromotion", "motivation", "careerPlan", "reverseQuestions"],
  graduated: ["selfIntro", "studentEffort", "academicResearch", "jobHuntingAxis", "graduatedReason", "selfPromotion", "motivation", "careerPlan", "reverseQuestions"],
  "second-new-grad": ["selfIntro", "previousExperience", "careerChangeReason", "earlyLeaveReason", "blankPeriod", "selfPromotion", "motivation", "careerPlan", "reverseQuestions"],
  career: ["selfIntro", "previousExperience", "careerChangeReason", "leavingReason", "selfPromotion", "motivation", "careerPlan", "reverseQuestions"]
};

const SCENARIO_TOTAL_DURATION_MINUTES: Record<AiInterviewScenarioType, number> = {
  "new-grad": 44,
  graduated: 52,
  "second-new-grad": 60,
  career: 52
};

export const AI_INTERVIEW_SCENARIO_LABELS: Record<AiInterviewScenarioType, string> = {
  "new-grad": "新卒・学生面接",
  graduated: "既卒面接",
  "second-new-grad": "第二新卒面接",
  career: "転職面接"
};

export const AI_INTERVIEW_INTERVIEW_TYPE_LABELS: Record<AiInterviewInterviewType, string> = {
  first: "1 次面接",
  second: "2 次面接",
  later: "面接（3 次以降）",
  final: "最終面接"
};

export const AI_INTERVIEW_INTERVIEW_TYPE_OPTIONS = ["first", "second", "later", "final"] as const satisfies ReadonlyArray<AiInterviewInterviewType>;
export const AI_INTERVIEW_SCENARIO_TYPE_OPTIONS = ["new-grad", "graduated", "second-new-grad", "career"] as const satisfies ReadonlyArray<AiInterviewScenarioType>;

export function getAiInterviewScenarioCategories(type: AiInterviewScenarioType): AiInterviewCategoryDefinition[] {
  return SCENARIO_CATEGORY_ORDER[type].map((categoryId) => CATEGORY_DEFINITIONS[categoryId]!);
}

export function buildAiInterviewScenarioDefinition(type: AiInterviewScenarioType): AiInterviewScenarioDefinition {
  const categories = getAiInterviewScenarioCategories(type);

  return {
    type,
    label: AI_INTERVIEW_SCENARIO_LABELS[type],
    description: `${AI_INTERVIEW_SCENARIO_LABELS[type]}向けの想定質問フローです。`,
    categories,
    totalDurationMinutes: SCENARIO_TOTAL_DURATION_MINUTES[type],
    totalQuestionCount: categories.reduce((sum, category) => sum + category.questionCount, 0)
  };
}

export const AI_INTERVIEW_SCENARIO_DEFINITIONS = AI_INTERVIEW_SCENARIO_TYPE_OPTIONS.map((type) => buildAiInterviewScenarioDefinition(type));

export const DEFAULT_AI_INTERVIEW_SETUP_DRAFT: AiInterviewSetupDraft = {
  settingSetName: "基本セット",
  setupMode: "new",
  selectedSavedSettingId: null,
  interviewType: "first",
  targetCompany: "らくしゅう株式会社",
  targetRole: "営業職",
  scenarioType: "new-grad"
};

export function getAiInterviewCategoryDefinition(categoryId: string) {
  return CATEGORY_DEFINITIONS[categoryId] ?? null;
}
