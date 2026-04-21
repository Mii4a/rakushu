import Link from "next/link";

import { JobCreateForm } from "@/components/job-create-form";
import { requireUser } from "@/lib/auth/require-user";

export default async function NewJobPage() {
  await requireUser();

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">求人登録</h1>
        <Link href="/jobs" className="text-sm text-rakushu-700 underline">
          一覧に戻る
        </Link>
      </div>

      <JobCreateForm />
    </section>
  );
}
