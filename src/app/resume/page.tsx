import { ResumeGeneratorForm } from "@/components/resume-generator-form";
import { ResumeWorkspaceShell } from "@/components/resume-workspace-shell";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getUserResumeProfile } from "@/lib/resume";
import { getUserPlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const [plan, profile] = await Promise.all([getUserPlan(user.id), getUserResumeProfile(user.id)]);

  return (
    <ResumeWorkspaceShell plan={plan}>
      <ResumeGeneratorForm defaults={profile ?? undefined} />
    </ResumeWorkspaceShell>
  );
}
