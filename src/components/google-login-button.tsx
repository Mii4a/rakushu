"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth/client";

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const callbackURL = `${window.location.origin}/dashboard`;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL
      });

      if (result.error) {
        setError(result.error.message ?? "Googleログインを開始できませんでした。");
        return;
      }
    } catch {
      setError("Googleログインの開始に失敗しました。設定を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="button-primary w-full"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Googleでログイン
      </button>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
