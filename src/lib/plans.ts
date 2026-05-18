export type Plan = "free" | "starter" | "plus" | "pro";
export type PaidPlan = Exclude<Plan, "free">;

export type AnalysisPeriod = "week" | "month";

export type PlanLimits = {
  maxJobs: number;
  maxAnalyses: number;
  analysisPeriod: AnalysisPeriod;
  monthlyAiCredits: number;
  detailedScoring: boolean;
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
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxJobs: 20,
    maxAnalyses: 5,
    analysisPeriod: "week",
    monthlyAiCredits: 0,
    detailedScoring: false,
    commute: {
      canSaveProfile: false,
      canAutoEstimate: false,
      canCompare: false
    },
    criteria: {
      canBrowsePublic: false,
      canSaveTemplates: false,
      canCloneTemplates: false,
      canEditClonedTemplates: false,
      canCreatePrivate: false,
      canPublish: false,
      canViewPublicStats: false,
      maxOwnedCriteria: 0
    }
  },
  starter: {
    maxJobs: 50,
    maxAnalyses: 30,
    analysisPeriod: "month",
    monthlyAiCredits: 30,
    detailedScoring: false,
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
    }
  },
  plus: {
    maxJobs: Number.POSITIVE_INFINITY,
    maxAnalyses: 100,
    analysisPeriod: "month",
    monthlyAiCredits: 120,
    detailedScoring: true,
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
    }
  },
  pro: {
    maxJobs: Number.POSITIVE_INFINITY,
    maxAnalyses: 400,
    analysisPeriod: "month",
    monthlyAiCredits: 400,
    detailedScoring: true,
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
    }
  }
};

export type AiCreditFeature = "job_summary" | "job_feature_extraction";

export const AI_CREDIT_COSTS: Record<AiCreditFeature, number> = {
  job_summary: 1,
  job_feature_extraction: 1
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
    priceYen: 580,
    campaignPriceYen: getDiscountedPriceYen(580, DEFAULT_CAMPAIGN_DISCOUNT.percentOff),
    audience: "軽度利用者、まず試したい学生",
    uses: ["求人票の要約", "軽い特徴抽出", "少数の求人検討", "みんなの基準の閲覧"]
  },
  plus: {
    name: "Plus",
    priceYen: 1480,
    campaignPriceYen: getDiscountedPriceYen(1480, DEFAULT_CAMPAIGN_DISCOUNT.percentOff),
    audience: "標準的な就活ユーザー",
    uses: ["求人票の要約", "特徴抽出", "保存求人の整理補助", "自分用の基準作成・編集", "他人の基準テンプレートをコピーして編集"]
  },
  pro: {
    name: "Pro",
    priceYen: 2980,
    campaignPriceYen: getDiscountedPriceYen(2980, DEFAULT_CAMPAIGN_DISCOUNT.percentOff),
    audience: "高頻度利用者、ヘビーユーザー",
    uses: ["多数求人の深い分析補助", "履歴書下書き作成", "自作基準の公開", "公開した基準の利用統計確認", "将来の高度分析機能"]
  }
};
