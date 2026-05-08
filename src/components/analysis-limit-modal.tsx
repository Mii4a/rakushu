"use client";

import Link from "next/link";

type AnalysisLimitModalProps = {
  message: string;
  onClose: () => void;
};

export function AnalysisLimitModal({ message, onClose }: AnalysisLimitModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-rakumo-border bg-white p-6 shadow-[0_28px_52px_-30px_rgba(45,58,74,0.45)]">
        <p className="text-sm font-medium text-rakumo-ink">解析上限に達しています</p>
        <h2 className="mt-1 text-xl font-semibold text-rakumo-ink">このまま続けるにはProプランが必要です</h2>
        <p className="mt-3 text-sm text-rakumo-ink/75">{message}</p>
        <p className="mt-2 text-sm text-rakumo-ink/75">上限を解除すると、引き続き求人の解析と再解析を行えます。</p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="button-secondary">
            閉じる
          </button>
          <Link href="/pricing" className="button-primary">
            料金を見る
          </Link>
        </div>
      </div>
    </div>
  );
}
