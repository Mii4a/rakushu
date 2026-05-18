import { CommuteSettingsForm } from "@/components/commute-settings-form";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { getUserCommuteProfile } from "@/lib/commute";

export const dynamic = "force-dynamic";

export default async function CommuteSettingsPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const profile = await getUserCommuteProfile(user.id);

  return <CommuteSettingsForm defaults={profile ?? undefined} />;
}
