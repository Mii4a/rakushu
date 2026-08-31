import { redirect } from "next/navigation";

import { OnboardingExperience } from "@/components/onboarding/onboarding-experience";
import { getSession } from "@/lib/auth/session";
import { getUserOnboardingDraft, isOnboardingFinished } from "@/lib/onboarding/profile";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const preview = firstValue(params.preview) === "1";
  const session = await getSession();

  if (!session?.user) {
    if (preview && process.env.NODE_ENV !== "production") {
      return <OnboardingExperience userId="preview-user" initialName="たろですよ" userImage={null} />;
    }

    redirect("/login");
  }

  const onboardingDraft = await getUserOnboardingDraft(session.user.id);

  if (isOnboardingFinished(onboardingDraft)) {
    redirect("/jobs/new");
  }

  return (
    <OnboardingExperience
      userId={session.user.id}
      initialName={session.user.name ?? "あなた"}
      userImage={session.user.image ?? null}
      initialDraft={onboardingDraft}
    />
  );
}
