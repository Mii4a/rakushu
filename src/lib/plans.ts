export type Plan = "free" | "pro";

export type PlanLimits = {
  maxJobs: number;
  maxAnalysesPerMonth: number;
  detailedScoring: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxJobs: 20,
    maxAnalysesPerMonth: 5,
    detailedScoring: false
  },
  pro: {
    maxJobs: Number.POSITIVE_INFINITY,
    maxAnalysesPerMonth: 100,
    detailedScoring: true
  }
};
