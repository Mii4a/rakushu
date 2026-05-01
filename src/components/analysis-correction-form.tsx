"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialActionState, updateAnalysisCorrectionAction } from "@/actions/job-actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "保存中..." : "補正値を保存"}
    </button>
  );
}

type Props = {
  analysisId: string;
  employmentType: string;
  annualHolidays: number | null;
  holidayType: string;
  baseSalaryMin: number | null;
  baseSalaryMax: number | null;
};

export function AnalysisCorrectionForm({ analysisId, employmentType, annualHolidays, holidayType, baseSalaryMin, baseSalaryMax }: Props) {
  const [state, formAction] = useActionState(updateAnalysisCorrectionAction, initialActionState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="analysisId" value={analysisId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-slate-700">雇用形態</span>
          <input name="employmentType" defaultValue={employmentType} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-700">年間休日</span>
          <input type="number" min={0} max={366} name="annualHolidays" defaultValue={annualHolidays ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-700">休日制度</span>
          <input name="holidayType" defaultValue={holidayType} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-700">基本給最小</span>
          <input type="number" min={0} name="baseSalaryMin" defaultValue={baseSalaryMin ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-700">基本給最大</span>
          <input type="number" min={0} name="baseSalaryMax" defaultValue={baseSalaryMax ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>

      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
