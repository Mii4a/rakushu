"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { generateResumeDraftAction, initialResumeActionState } from "@/actions/resume-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700 disabled:cursor-not-allowed disabled:bg-slate-400">
      {pending ? "作成中..." : "履歴書下書きを作成"}
    </button>
  );
}

export function ResumeGeneratorForm() {
  const [state, formAction] = useActionState(generateResumeDraftAction, initialResumeActionState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="templateName" placeholder="フォーマット名（例: 学校指定A）」" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="fullName" placeholder="氏名" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="furigana" placeholder="ふりがな" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="phone" placeholder="電話番号" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="email" placeholder="メールアドレス" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
      </div>
      <textarea name="education" rows={4} placeholder="学歴" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <textarea name="experience" rows={4} placeholder="職歴・経験（任意）" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <textarea name="selfPr" rows={5} placeholder="自己PR" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <textarea name="motivation" rows={5} placeholder="志望動機" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton />

      {state.result ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-800">生成結果（下書き）</p>
          <pre className="whitespace-pre-wrap text-sm text-slate-700">{state.result}</pre>
        </div>
      ) : null}
    </form>
  );
}
