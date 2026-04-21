"use client";

import Link from "next/link";

type AnalysisLimitModalProps = {
  message: string;
  onClose: () => void;
};

export function AnalysisLimitModal({ message, onClose }: AnalysisLimitModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-medium text-rakushu-700">解析上限に達しています</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">このまま続けるにはProプランが必要です</h2>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <p className="mt-2 text-sm text-slate-600">上限を解除すると、引き続き求人の解析と再解析を行えます。</p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100">
            閉じる
          </button>
          <Link href="/pricing" className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
            料金を見る
          </Link>
        </div>
      </div>
    </div>
  );
}
