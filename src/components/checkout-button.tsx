"use client";

import { useState } from "react";

import { PLAN_MARKETING, type PaidPlan } from "@/lib/plans";

export function CheckoutButton({ plan, disabled }: { plan: PaidPlan; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout開始に失敗しました。");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={onClick}
        className="rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white hover:bg-rakushu-700 disabled:opacity-50"
      >
        {loading ? "処理中..." : `${PLAN_MARKETING[plan].name}プランにアップグレード`}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
