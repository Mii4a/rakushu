"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FilePenLine, Info } from "lucide-react";

import { createJobAction, type JobActionState } from "@/actions/job-actions";
import { AnalysisLimitModal } from "@/components/analysis-limit-modal";
import rakumoImage from "../../yuru-chara/rakumo_happy.jpg";

const initialState: JobActionState = {
  status: "idle"
};

export function JobCreateForm() {
  const [state, formAction, isPending] = useActionState(createJobAction, initialState);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [rawText, setRawText] = useState("");

  useEffect(() => {
    if (state.status === "error" && state.code === "analysis_limit") {
      setIsModalOpen(true);
    }
  }, [state]);

  const showAnalysisLimitModal = state.status === "error" && state.code === "analysis_limit" && isModalOpen;

  return (
    <>
      <form action={formAction} className="ranking-form-layout">
        <div className="ranking-form-panel">
          <div className="space-y-1">
            <h2 className="ranking-section-title">求人情報を入力</h2>
          </div>

          <label className="block space-y-2.5">
            <span className="ranking-field-heading">
              求人本文
              <span className="ranking-required-badge">必須</span>
            </span>
            <textarea
              name="rawText"
              required
              minLength={20}
              rows={12}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              className="ranking-textarea"
              placeholder="求人サイトや求人票の本文を貼り付けてください"
            />
            <div className="ranking-meta-row">
              <p className="ranking-hint">求人本文は 20 文字以上で入力してください</p>
              <p className="ranking-hint">
                現在 {rawText.length} 文字
                <span className="text-slate-400">（最小 20 文字）</span>
              </p>
            </div>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="ranking-field-heading">
                会社名
                <span className="ranking-optional-badge">任意</span>
              </span>
              <input name="companyName" className="ranking-input" />
            </label>
            <label className="space-y-2">
              <span className="ranking-field-heading">
                職種
                <span className="ranking-optional-badge">任意</span>
              </span>
              <input name="title" className="ranking-input" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="ranking-field-heading">
                情報元
                <span className="ranking-optional-badge">任意</span>
              </span>
              <input name="sourceName" placeholder="例: リクナビ" className="ranking-input" />
            </label>
            <label className="space-y-2">
              <span className="ranking-field-heading">
                URL
                <span className="ranking-optional-badge">任意</span>
              </span>
              <input name="sourceUrl" placeholder="https://..." className="ranking-input" />
            </label>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <p className="ranking-inline-note">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-slate-500" />
              求人本文は 20 文字以上で入力してください
            </p>
            <p className="ranking-inline-note">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-500" />
              URL は入力する場合のみ正しい形式で入力します
            </p>
          </div>

          {state.status === "error" && state.code !== "analysis_limit" ? <p className="text-sm font-medium text-rose-700">{state.message}</p> : null}

          <div className="pt-1">
            <button type="submit" disabled={isPending} className="ranking-submit-button">
              <FilePenLine className="size-5" />
              {isPending ? "保存中..." : "ランク付けして保存する"}
            </button>
            <p className="mt-3 text-center text-sm text-slate-500">送信中は「保存中...」に変わります</p>
          </div>
        </div>

        <aside className="ranking-aside">
          <div className="ranking-rakumo-card">
            <div className="ranking-rakumo-bubble">求人文をそのまま貼ると整理しやすいよ！</div>
            <div className="ranking-rakumo-figure">
              <Image src={rakumoImage} alt="らくも" fill className="object-cover" sizes="(max-width: 1023px) 96px, 128px" />
            </div>
          </div>

          <div className="ranking-info-card">
            <h3 className="ranking-info-title">保存時に自動で行うこと</h3>
            <ul className="space-y-3">
              <li className="ranking-check-item">
                <CheckCircle2 className="size-5 text-[#26a61c]" />
                <span>会社名・職種・雇用形態などを抽出</span>
              </li>
              <li className="ranking-check-item">
                <CheckCircle2 className="size-5 text-[#26a61c]" />
                <span>休日・福利厚生・固定残業などをチェック</span>
              </li>
              <li className="ranking-check-item">
                <CheckCircle2 className="size-5 text-[#26a61c]" />
                <span>総合ランクを計算して保存</span>
              </li>
              <li className="ranking-check-item">
                <CheckCircle2 className="size-5 text-[#26a61c]" />
                <span>保存後は求人詳細へ移動</span>
              </li>
            </ul>
          </div>

          <div className="ranking-limit-card">
            <div className="ranking-limit-icon">
              <Info className="size-5" />
            </div>
            <div>
              <h3 className="ranking-limit-title">利用上限について</h3>
              <p className="ranking-limit-copy">
                解析や保存の上限に達した場合は、モーダルが表示されます。モーダルから「件数を減らす」へ進むと、プランの確認や変更ができます。
              </p>
            </div>
          </div>

          <div className="ranking-footnote-card">
            <div className="ranking-footnote-dot">Y</div>
            <p>求人が0件のときは「求人を入力してみる」が表示されます</p>
          </div>
        </aside>
      </form>

      {showAnalysisLimitModal ? <AnalysisLimitModal message={state.message} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
