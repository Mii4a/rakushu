import { and, eq } from "drizzle-orm";

import { ResumeGeneratorForm } from "@/components/resume-generator-form";
import { ResumeWorkspaceShell } from "@/components/resume-workspace-shell";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getUserResumeProfile } from "@/lib/resume";
import { getUserPlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function ResumePage({ searchParams }: { searchParams: Promise<{ jobId?: string }> }) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const jobId = params.jobId?.trim();
  const [plan, profile, targetJob] = await Promise.all([
    getUserPlan(user.id),
    getUserResumeProfile(user.id),
    jobId
      ? db
          .select({ id: jobs.id, companyName: jobs.companyName, title: jobs.title, sourceUrl: jobs.sourceUrl })
          .from(jobs)
          .where(and(eq(jobs.userId, user.id), eq(jobs.id, jobId)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null)
  ]);

  return (
    <ResumeWorkspaceShell plan={plan}>
      <ResumeGeneratorForm defaults={profile ?? undefined} targetJob={targetJob ?? undefined} />
    </ResumeWorkspaceShell>
  );
}
