import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CriteriaDetailRedirectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = (await params) ?? {};
  redirect(id ? `/criteria?selected=${id}` : "/criteria");
}
