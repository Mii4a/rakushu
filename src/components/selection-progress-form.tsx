"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateSelectionProgressAction, type ActionState } from "@/actions/job-actions";

const initialActionState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "保存中..." : "進捗を保存"}
    </button>
  );
}

type Props = {
  jobId: string;
  selectionStatus: string;
  nextActionDate: string;
  selectionMemo: string;
};

export function SelectionProgressForm({ jobId, selectionStatus, nextActionDate, selectionMemo }: Props) {
  const [state, formAction] = useActionState(updateSelectionProgressAction, initialActionState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="jobId" value={jobId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-slate-700">ステータス</span>
          <select name="selectionStatus" defaultValue={selectionStatus} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="saved">整理中</option>
            <option value="applied">応募済み</option>
            <option value="screening">選考中</option>
            <option value="interview">面接予定</option>
            <option value="offer">内定</option>
            <option value="rejected">見送り</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-700">次に見る予定</span>
          <input type="date" name="nextActionDate" defaultValue={nextActionDate} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-slate-700">メモ</span>
        <textarea
          name="selectionMemo"
          rows={4}
          defaultValue={selectionMemo}
          placeholder="次に見るときのメモや、残しておきたい判断材料"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}

      <SubmitButton />
    </form>
  );
}
