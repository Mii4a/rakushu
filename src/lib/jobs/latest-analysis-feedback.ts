import { and, desc, eq } from "drizzle-orm";

import type { FailureType } from "@/lib/analysis/quality";
import type { ParsedJob } from "@/lib/analysis";
import { parseStoredParsedJob } from "@/lib/analysis/parse-stored-job";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobAnalysisFeedback, jobs } from "@/lib/db/schema";

export type FeedbackStatus = "open" | "reviewed" | "fixture_added" | "ignored";
export type FeedbackSeverity = "medium" | "high";

export type ParserFeedbackRecord = {
  id: string;
  jobAnalysisId: string;
  status: FeedbackStatus;
  source: string;
  severity: FeedbackSeverity;
  failureTypes: FailureType[];
  summaryText: string;
  rawExcerpt: string;
  createdAt: Date;
  updatedAt: Date;
  jobId: string;
  companyName: string | null;
  sourceName: string | null;
  parserVersion: string;
  evidenceJson: string | null;
  parsedSnapshot: ParsedJob | null;
};

export async function getLatestAnalysisFeedback(filters: {
  status?: FeedbackStatus | "";
  severity?: FeedbackSeverity | "";
  limit?: number;
} = {}): Promise<ParserFeedbackRecord[]> {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(jobAnalysisFeedback.status, filters.status));
  }

  if (filters.severity) {
    conditions.push(eq(jobAnalysisFeedback.severity, filters.severity));
  }

  const rows = await db
    .select({
      id: jobAnalysisFeedback.id,
      jobAnalysisId: jobAnalysisFeedback.jobAnalysisId,
      status: jobAnalysisFeedback.status,
      source: jobAnalysisFeedback.source,
      severity: jobAnalysisFeedback.severity,
      failureTypesJson: jobAnalysisFeedback.failureTypesJson,
      summaryText: jobAnalysisFeedback.summaryText,
      rawExcerpt: jobAnalysisFeedback.rawExcerpt,
      createdAt: jobAnalysisFeedback.createdAt,
      updatedAt: jobAnalysisFeedback.updatedAt,
      jobId: jobAnalyses.jobId,
      parserVersion: jobAnalyses.parserVersion,
      evidenceJson: jobAnalyses.evidenceJson,
      companyName: jobs.companyName,
      sourceName: jobs.sourceName
    })
    .from(jobAnalysisFeedback)
    .innerJoin(jobAnalyses, eq(jobAnalysisFeedback.jobAnalysisId, jobAnalyses.id))
    .innerJoin(jobs, eq(jobAnalyses.jobId, jobs.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobAnalysisFeedback.createdAt))
    .limit(filters.limit ?? 50);

  return rows.map((row) => {
    const parsedSnapshot = parseStoredParsedJob(row.evidenceJson, `latest-analysis-feedback:${row.jobId}`);
    const failureTypes = JSON.parse(row.failureTypesJson) as FailureType[];

    return {
      id: row.id,
      jobAnalysisId: row.jobAnalysisId,
      status: row.status as FeedbackStatus,
      source: row.source,
      severity: row.severity as FeedbackSeverity,
      failureTypes,
      summaryText: row.summaryText,
      rawExcerpt: row.rawExcerpt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      jobId: row.jobId,
      companyName: row.companyName,
      sourceName: row.sourceName,
      parserVersion: row.parserVersion,
      evidenceJson: row.evidenceJson,
      parsedSnapshot
    };
  });
}
