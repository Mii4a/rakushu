import { desc, eq, isNull } from "drizzle-orm";

import { buildJobAnalysisFeedbackInsert } from "../src/lib/analysis/feedback";
import { parseJobText } from "../src/lib/analysis/parser";
import { db } from "../src/lib/db/client";
import { jobAnalyses, jobAnalysisFeedback, jobs } from "../src/lib/db/schema";

type ParsedArgs = {
  apply: boolean;
  limit: number;
  analysisId: string | null;
};

type BackfillCandidate = {
  analysisId: string;
  jobId: string;
  rawText: string;
  evidenceJson: string | null;
  analysisCreatedAt: Date;
};

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const next = args[index + 1];
    if (next == null || next.startsWith("--")) {
      map.set(token, "true");
      continue;
    }
    map.set(token, next);
    index += 1;
  }

  const apply = map.get("--apply") === "true";
  const limitRaw = Number(map.get("--limit") ?? "100");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 100;
  const analysisId = map.get("--analysis-id") ?? null;

  return { apply, limit, analysisId };
}

function parseCurrentJob(candidate: BackfillCandidate) {
  return parseJobText(candidate.rawText);
}

async function loadCandidates(args: ParsedArgs): Promise<BackfillCandidate[]> {
  const base = db
    .select({
      analysisId: jobAnalyses.id,
      jobId: jobAnalyses.jobId,
      rawText: jobs.rawText,
      evidenceJson: jobAnalyses.evidenceJson,
      analysisCreatedAt: jobAnalyses.createdAt
    })
    .from(jobAnalyses)
    .innerJoin(jobs, eq(jobs.id, jobAnalyses.jobId))
    .leftJoin(jobAnalysisFeedback, eq(jobAnalysisFeedback.jobAnalysisId, jobAnalyses.id))
    .where(isNull(jobAnalysisFeedback.id))
    .orderBy(desc(jobAnalyses.createdAt))
    .limit(args.limit);

  const rows = await base;
  if (!args.analysisId) {
    return rows;
  }

  return rows.filter((row) => row.analysisId === args.analysisId);
}

async function main() {
  const args = parseArgs();
  const now = new Date();
  const candidates = await loadCandidates(args);

  const results: Array<{
    analysisId: string;
    jobId: string;
    status: "inserted" | "already_not_expected" | "parse_failed";
    failureTypes?: string;
  }> = [];

  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = parseCurrentJob(candidate);
    } catch {
      results.push({
        analysisId: candidate.analysisId,
        jobId: candidate.jobId,
        status: "parse_failed"
      });
      continue;
    }

    const insert = buildJobAnalysisFeedbackInsert({
      analysisId: candidate.analysisId,
      rawText: candidate.rawText,
      parsed,
      now,
      source: "auto_backfill"
    });

    if (!insert) {
      results.push({
        analysisId: candidate.analysisId,
        jobId: candidate.jobId,
        status: "already_not_expected"
      });
      continue;
    }

    if (args.apply) {
      await db.insert(jobAnalysisFeedback).values(insert as typeof jobAnalysisFeedback.$inferInsert).onConflictDoNothing();
    }

    results.push({
      analysisId: candidate.analysisId,
      jobId: candidate.jobId,
      status: "inserted",
      failureTypes: insert.failureTypesJson
    });
  }

  const inserted = results.filter((row) => row.status === "inserted");
  const skipped = results.filter((row) => row.status === "already_not_expected");
  const parseFailed = results.filter((row) => row.status === "parse_failed");

  console.log(JSON.stringify({
    mode: args.apply ? "apply" : "dry_run",
    requestedAnalysisId: args.analysisId,
    scanned: candidates.length,
    wouldInsert: inserted.length,
    skippedNotExpected: skipped.length,
    parseFailed: parseFailed.length,
    sampleInserted: inserted.slice(0, 10),
    sampleSkipped: skipped.slice(0, 10),
    sampleParseFailed: parseFailed.slice(0, 10)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
