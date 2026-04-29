import { desc, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { jobAnalyses } from "@/lib/db/schema";

export async function getLatestAnalysesByJobIds(jobIds: string[]) {
  if (jobIds.length === 0) {
    return new Map<string, never>();
  }

  const analyses = await db
    .select()
    .from(jobAnalyses)
    .where(inArray(jobAnalyses.jobId, jobIds))
    .orderBy(desc(jobAnalyses.createdAt));

  const latestByJobId = new Map<string, (typeof analyses)[number]>();

  for (const analysis of analyses) {
    if (!latestByJobId.has(analysis.jobId)) {
      latestByJobId.set(analysis.jobId, analysis);
    }
  }

  return latestByJobId;
}
