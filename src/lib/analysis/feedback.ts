import type { InferInsertModel } from "drizzle-orm";

import { evaluateParsedJobQuality, shouldCreateFeedback } from "@/lib/analysis/quality";
import type { ParsedJob } from "@/lib/analysis/types";
import { jobAnalysisFeedback } from "@/lib/db/schema";

export type JobAnalysisFeedbackInsert = InferInsertModel<typeof jobAnalysisFeedback>;

export function buildJobAnalysisFeedbackInsert(params: {
  analysisId: string;
  rawText: string;
  parsed: ParsedJob;
  now: Date;
  source?: JobAnalysisFeedbackInsert["source"];
}): JobAnalysisFeedbackInsert | null {
  const report = evaluateParsedJobQuality(params.rawText, params.parsed);

  if (!shouldCreateFeedback(report)) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    jobAnalysisId: params.analysisId,
    status: "open",
    source: params.source ?? "auto",
    severity: report.severity,
    failureTypesJson: JSON.stringify(report.failureTypes),
    summaryText: report.summaryText,
    rawExcerpt: report.excerpt,
    createdAt: params.now,
    updatedAt: params.now
  };
}
