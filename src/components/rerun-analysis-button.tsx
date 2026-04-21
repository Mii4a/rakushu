"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { rerunAnalysisAction, type JobActionState } from "@/actions/job-actions";
import { AnalysisLimitModal } from "@/components/analysis-limit-modal";

const initialState: JobActionState = {
  status: "idle"
};

type RerunAnalysisButtonProps = {
  jobId: string;
};

export function RerunAnalysisButton({ jobId }: RerunAnalysisButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [state, formAction, isPending] = useActionState(rerunAnalysisAction.bind(null, jobId), initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  useEffect(() => {
    if (state.status === "error" && state.code === "analysis_limit") {
      setIsModalOpen(true);
    }
  }, [state]);

  const showAnalysisLimitModal = state.status === "error" && state.code === "analysis_limit" && isModalOpen;

  return (
    <>
      <form action={formAction}>
        <button type="submit" disabled={isPending} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "再解析中..." : "再解析"}
        </button>
      </form>

      {state.status === "error" && state.code !== "analysis_limit" ? <p className="mt-2 text-sm text-rose-700">{state.message}</p> : null}
      {showAnalysisLimitModal ? <AnalysisLimitModal message={state.message} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
