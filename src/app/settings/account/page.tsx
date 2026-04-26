import { headers } from "next/headers";

import { AccountSettingsForm } from "@/components/account-settings-form";
import { auth } from "@/lib/auth/server";
import { requireUser } from "@/lib/auth/require-user";
import { isProductionBuildPhase } from "@/lib/env/build-phase";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export default async function AccountSettingsPage() {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const user = await requireUser();
  const sessionHeaders = await headers();
  const accounts = await auth.api.listUserAccounts({
    headers: sessionHeaders
  });

  return (
    <AccountSettingsForm
      key={user.name}
      name={user.name}
      email={user.email}
      emailVerified={user.emailVerified}
      image={user.image ?? null}
      createdAt={formatDate(user.createdAt)}
      updatedAt={formatDate(user.updatedAt)}
      accounts={accounts.map((account) => ({
        id: account.id,
        providerId: account.providerId,
        accountId: account.accountId,
        createdAt: formatDate(account.createdAt),
        updatedAt: formatDate(account.updatedAt),
        scopes: account.scopes
      }))}
    />
  );
}
