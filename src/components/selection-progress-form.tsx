"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { updateSelectionProgressAction, type ActionState } from "@/actions/job-actions";

const initialActionState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[64px] w-full items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#20b15f_0%,#129f51_100%)] px-6 text-2xl font-black text-white shadow-[0_22px_36px_-26px_rgba(18,159,81,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "保存中..." : "保存"}
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
  const [memo, setMemo] = useState(selectionMemo);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <label className="space-y-2 text-sm font-semibold text-rakumo-ink/85">
          <span>選考ステータス</span>
          <select name="selectionStatus" defaultValue={selectionStatus} className="field-input h-12">
            <option value="saved">整理中</option>
            <option value="applied">応募済み</option>
            <option value="screening">選考中</option>
            <option value="interview">面接予定</option>
            <option value="offer">内定</option>
            <option value="rejected">見送り</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-rakumo-ink/85">
          <span>次のアクション予定日</span>
          <input type="date" name="nextActionDate" defaultValue={nextActionDate} className="field-input h-12" />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px] lg:items-end">
        <label className="block space-y-2 text-sm font-semibold text-rakumo-ink/85">
          <span>メモ（任意）</span>
          <textarea
            name="selectionMemo"
            rows={3}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="一次面接通過。次回は現場エンジニアとの技術面接。"
            className="field-textarea min-h-0"
          />
        </label>

        <div className="space-y-3">
          <p className="text-right text-sm text-rakumo-ink/55">{memo.length} / 2000</p>
          <SubmitButton />
        </div>
      </div>

      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
    </form>
  );
}
