"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { generateResumeDraftAction, initialResumeActionState } from "@/actions/resume-actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="button-accent">
      {pending ? "作成中..." : "履歴書下書きを作成"}
    </button>
  );
}

type ResumeFormDefaults = {
  templateName?: string | null;
  fullName?: string | null;
  furigana?: string | null;
  phone?: string | null;
  email?: string | null;
  education?: string | null;
  experience?: string | null;
  selfPr?: string | null;
  motivation?: string | null;
};

function inputClassName(fullWidth?: boolean) {
  return `${fullWidth ? "w-full" : ""} rounded-2xl border border-rakumo-border bg-white px-3 py-2 text-sm text-rakumo-ink shadow-sm outline-none transition focus:border-rakumo-mint focus:ring-2 focus:ring-rakumo-mint/25`;
}

export function ResumeGeneratorForm({ defaults }: { defaults?: ResumeFormDefaults }) {
  const [state, formAction] = useActionState(generateResumeDraftAction, initialResumeActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="templateName" placeholder="フォーマット名（例: 学校指定A）" defaultValue={defaults?.templateName ?? ""} className={inputClassName()} />
        <input name="fullName" placeholder="氏名" defaultValue={defaults?.fullName ?? ""} className={inputClassName()} />
        <input name="furigana" placeholder="ふりがな" defaultValue={defaults?.furigana ?? ""} className={inputClassName()} />
        <input name="phone" placeholder="電話番号" defaultValue={defaults?.phone ?? ""} className={inputClassName()} />
        <input name="email" placeholder="メールアドレス" defaultValue={defaults?.email ?? ""} className={inputClassName(true)} />
      </div>

      <textarea name="education" rows={4} placeholder="学歴" defaultValue={defaults?.education ?? ""} className={inputClassName(true)} />
      <textarea name="experience" rows={4} placeholder="職歴・経験（任意）" defaultValue={defaults?.experience ?? ""} className={inputClassName(true)} />
      <textarea name="selfPr" rows={5} placeholder="自己PR" defaultValue={defaults?.selfPr ?? ""} className={inputClassName(true)} />
      <textarea name="motivation" rows={5} placeholder="志望動機" defaultValue={defaults?.motivation ?? ""} className={inputClassName(true)} />

      <p className="text-sm text-rakumo-ink/70">入力内容は次回以降の初期値として保存されます。Pro プランの履歴書ワークスペースとして使えます。</p>

      {state.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}

      <SubmitButton />

      {state.result ? (
        <div className="rounded-3xl border border-rakumo-border bg-rakumo-sand/70 p-4">
          <p className="mb-2 text-sm font-medium text-rakumo-ink">生成結果（下書き）</p>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-rakumo-ink/80">{state.result}</pre>
        </div>
      ) : null}
    </form>
  );
}
