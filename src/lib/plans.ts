export type Plan = "free" | "starter" | "plus" | "pro";
export type PaidPlan = Exclude<Plan, "free">;

export type AnalysisPeriod = "week" | "month";

export type PlanLimits = {
  maxJobs: number;
  maxAnalyses: number;
  analysisPeriod: AnalysisPeriod;
  monthlyAiCredits: number;
  detailedScoring: boolean;
  maxCompanyResearches: number;
  maxAiInterviewSessions: number;
  commute: {
    canSaveProfile: boolean;
    canAutoEstimate: boolean;
    canCompare: boolean;
  };
  criteria: {
    canBrowsePublic: boolean;
    canSaveTemplates: boolean;
    canCloneTemplates: boolean;
    canEditClonedTemplates: boolean;
    canCreatePrivate: boolean;
    canPublish: boolean;
    canViewPublicStats: boolean;
    maxOwnedCriteria: number;
  };
  features: {
    companyResearch: boolean;
    aiInterview: boolean;
    resumeWorkspace: boolean;
  };
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxJobs: 10,
    maxAnalyses: 3,
    analysisPeriod: "week",
    monthlyAiCredits: 10,
    detailedScoring: false,
    maxCompanyResearches: 1,
    maxAiInterviewSessions: 1,
    commute: {
      canSaveProfile: false,
      canAutoEstimate: false,
      canCompare: false
    },
    criteria: {
      canBrowsePublic: true,
      canSaveTemplates: false,
      canCloneTemplates: false,
      canEditClonedTemplates: false,
      canCreatePrivate: false,
      canPublish: false,
      canViewPublicStats: false,
      maxOwnedCriteria: 0
    },
    features: {
      companyResearch: true,
      aiInterview: true,
      resumeWorkspace: true
    }
  },
  starter: {
    maxJobs: 30,
    maxAnalyses: 20,
    analysisPeriod: "month",
    monthlyAiCredits: 40,
    detailedScoring: false,
    maxCompanyResearches: 10,
    maxAiInterviewSessions: 2,
    commute: {
      canSaveProfile: true,
      canAutoEstimate: false,
      canCompare: false
    },
    criteria: {
      canBrowsePublic: true,
      canSaveTemplates: true,
      canCloneTemplates: true,
      canEditClonedTemplates: false,
      canCreatePrivate: false,
      canPublish: false,
      canViewPublicStats: false,
      maxOwnedCriteria: 3
    },
    features: {
      companyResearch: true,
      aiInterview: true,
      resumeWorkspace: true
    }
  },
  plus: {
    maxJobs: 100,
    maxAnalyses: 80,
    analysisPeriod: "month",
    monthlyAiCredits: 160,
    detailedScoring: true,
    maxCompanyResearches: 30,
    maxAiInterviewSessions: 12,
    commute: {
      canSaveProfile: true,
      canAutoEstimate: true,
      canCompare: false
    },
    criteria: {
      canBrowsePublic: true,
      canSaveTemplates: true,
      canCloneTemplates: true,
      canEditClonedTemplates: true,
      canCreatePrivate: true,
      canPublish: false,
      canViewPublicStats: false,
      maxOwnedCriteria: 20
    },
    features: {
      companyResearch: true,
      aiInterview: true,
      resumeWorkspace: true
    }
  },
  pro: {
    maxJobs: Number.POSITIVE_INFINITY,
    maxAnalyses: 240,
    analysisPeriod: "month",
    monthlyAiCredits: 400,
    detailedScoring: true,
    maxCompanyResearches: Number.POSITIVE_INFINITY,
    maxAiInterviewSessions: Number.POSITIVE_INFINITY,
    commute: {
      canSaveProfile: true,
      canAutoEstimate: true,
      canCompare: true
    },
    criteria: {
      canBrowsePublic: true,
      canSaveTemplates: true,
      canCloneTemplates: true,
      canEditClonedTemplates: true,
      canCreatePrivate: true,
      canPublish: true,
      canViewPublicStats: true,
      maxOwnedCriteria: Number.POSITIVE_INFINITY
    },
    features: {
      companyResearch: true,
      aiInterview: true,
      resumeWorkspace: true
    }
  }
};

export type AiCreditFeature = "job_summary" | "job_feature_extraction" | "company_research" | "ai_interview_session";

export const AI_CREDIT_COSTS: Record<AiCreditFeature, number> = {
  job_summary: 1,
  job_feature_extraction: 1,
  company_research: 1,
  ai_interview_session: 1
};

export const CREDIT_PACKS = [
  { credits: 20, priceYen: 480 },
  { credits: 50, priceYen: 980 },
  { credits: 120, priceYen: 1980 }
] as const;

export const PAID_PLAN_ORDER: PaidPlan[] = ["starter", "plus", "pro"];

export type CampaignDiscount = {
  label: string;
  startsAt: string | null;
  endsAt: string | null;
  percentOff: number;
};

export const DEFAULT_CAMPAIGN_DISCOUNT: CampaignDiscount = {
  label: "期間限定キャンペーン",
  startsAt: null,
  endsAt: null,
  percentOff: 50
};

export function getDiscountedPriceYen(priceYen: number, percentOff: number) {
  return Math.max(0, Math.round(priceYen * (100 - percentOff) / 100));
}

export const PLAN_MARKETING: Record<PaidPlan, {
  name: string;
  priceYen: number;
  campaignPriceYen: number;
  audience: string;
  uses: string[];
}> = {
  starter: {
    name: "Starter",
    priceYen: 480,
    campaignPriceYen: getDiscountedPriceYen(480, DEFAULT_CAMPAIGN_DISCOUNT.percentOff),
    audience: "まず一社をちゃんと完遂したい人",
    uses: ["求人採点を月20回まで継続", "企業研究を月10件まで", "AI面接を月2セッションまで", "最初の一社完遂パックとして使う"]
  },
  plus: {
    name: "Plus",
    priceYen: 980,
    campaignPriceYen: getDiscountedPriceYen(980, DEFAULT_CAMPAIGN_DISCOUNT.percentOff),
    audience: "複数社の比較・研究・面接準備をまとめて進めたい人",
    uses: ["求人採点を主力運用", "企業研究を月30件まで", "AI面接を月12セッションまで", "自分用基準の作成・編集"]
  },
  pro: {
    name: "Pro",
    priceYen: 1980,
    campaignPriceYen: getDiscountedPriceYen(1980, DEFAULT_CAMPAIGN_DISCOUNT.percentOff),
    audience: "高頻度で比較し、基準公開まで回したい人",
    uses: ["求人採点を高頻度で運用", "企業研究・AI面接を実質上限なしで回す", "公開基準の作成と統計確認", "比較ページと通勤比較を横断"]
  }
};
